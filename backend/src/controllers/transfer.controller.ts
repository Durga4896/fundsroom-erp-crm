import { Response } from "express";
import prisma from "../config/prisma.js";
import { AuthenticatedRequest } from "../middleware/auth.middleware.js";

const TRANSFER_INCLUDE = {
  product: true,
  sourceLocation: true,
  targetLocation: true,
  createdBy: {
    select: { id: true, name: true, email: true, role: true },
  },
} as const;

const generateTransferNumber = (): string => `TR-${Date.now()}`;

/**
 * GET /api/operations/transfers
 */
export const getTransfers = async (
  _req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const transfers = await prisma.transfer.findMany({
      orderBy: { createdAt: "desc" },
      include: TRANSFER_INCLUDE,
    });
    res.status(200).json({ success: true, data: transfers });
  } catch (error) {
    console.error("Get transfers error:", error);
    res.status(500).json({ success: false, message: "Failed to fetch transfers" });
  }
};

/**
 * GET /api/operations/transfers/:id
 */
export const getTransferById = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const id = Number(req.params.id);

    if (!Number.isInteger(id) || id <= 0) {
      res.status(400).json({ success: false, message: "Invalid transfer ID" });
      return;
    }

    const transfer = await prisma.transfer.findUnique({
      where: { id },
      include: TRANSFER_INCLUDE,
    });

    if (!transfer) {
      res.status(404).json({ success: false, message: "Transfer not found" });
      return;
    }

    res.status(200).json({ success: true, data: transfer });
  } catch (error) {
    console.error("Get transfer error:", error);
    res.status(500).json({ success: false, message: "Failed to fetch transfer" });
  }
};

/**
 * POST /api/operations/transfers
 *
 * Creates a transfer request. Does NOT touch inventory yet.
 * Validates that the source has sufficient available inventory.
 */
export const createTransfer = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const { productId, sourceLocationId, targetLocationId, quantity } = req.body;

    if (
      productId === undefined ||
      sourceLocationId === undefined ||
      targetLocationId === undefined ||
      quantity === undefined
    ) {
      res.status(400).json({
        success: false,
        message: "productId, sourceLocationId, targetLocationId and quantity are required",
      });
      return;
    }

    const productIdNumber = Number(productId);
    const sourceId = Number(sourceLocationId);
    const targetId = Number(targetLocationId);
    const quantityNumber = Number(quantity);

    if (
      !Number.isInteger(productIdNumber) ||
      !Number.isInteger(sourceId) ||
      !Number.isInteger(targetId) ||
      !Number.isInteger(quantityNumber)
    ) {
      res.status(400).json({ success: false, message: "IDs and quantity must be integers" });
      return;
    }

    if (quantityNumber <= 0) {
      res.status(400).json({ success: false, message: "Quantity must be greater than zero" });
      return;
    }

    if (sourceId === targetId) {
      res.status(400).json({ success: false, message: "Source and target locations must be different" });
      return;
    }

    const [product, sourceLocation, targetLocation] = await Promise.all([
      prisma.product.findUnique({ where: { id: productIdNumber } }),
      prisma.location.findUnique({ where: { id: sourceId } }),
      prisma.location.findUnique({ where: { id: targetId } }),
    ]);

    if (!product) {
      res.status(404).json({ success: false, message: "Product not found" });
      return;
    }
    if (!sourceLocation) {
      res.status(404).json({ success: false, message: "Source location not found" });
      return;
    }
    if (!targetLocation) {
      res.status(404).json({ success: false, message: "Target location not found" });
      return;
    }

    // Validate sufficient inventory at source before creating the request
    const sourceInventory = await prisma.inventory.findMany({
      where: { productId: productIdNumber, locationId: sourceId },
      orderBy: { createdAt: "asc" },
    });

    const availableQuantity = sourceInventory.reduce(
      (total, inv) => total + inv.physicalQuantity - inv.reservedQuantity,
      0
    );

    if (availableQuantity < quantityNumber) {
      res.status(400).json({
        success: false,
        message: `Insufficient available inventory. Available: ${availableQuantity}, requested: ${quantityNumber}`,
      });
      return;
    }

    const transfer = await prisma.transfer.create({
      data: {
        transferNumber: generateTransferNumber(),
        productId: productIdNumber,
        sourceLocationId: sourceId,
        targetLocationId: targetId,
        quantity: quantityNumber,
        status: "REQUESTED",
        createdById: req.user!.userId,
      },
      include: TRANSFER_INCLUDE,
    });

    res.status(201).json({
      success: true,
      message: "Transfer created successfully",
      data: transfer,
    });
  } catch (error) {
    console.error("Create transfer error:", error);
    res.status(500).json({ success: false, message: "Failed to create transfer" });
  }
};

/**
 * PATCH /api/operations/transfers/:id/status
 *
 * State machine:
 *   REQUESTED → DISPATCHED  : Source inventory is immediately reduced (in-transit)
 *   DISPATCHED → RECEIVED   : Destination inventory is increased (arrived)
 *
 * "Received twice" is prevented by the RECEIVED guard and the allowed
 * transitions map.
 */
export const updateTransferStatus = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const id = Number(req.params.id);
    const { status } = req.body;

    if (!Number.isInteger(id) || id <= 0) {
      res.status(400).json({ success: false, message: "Invalid transfer ID" });
      return;
    }

    const validStatuses = ["REQUESTED", "DISPATCHED", "RECEIVED"];

    if (!validStatuses.includes(status)) {
      res.status(400).json({
        success: false,
        message: "Invalid status. Allowed values: REQUESTED, DISPATCHED, RECEIVED",
      });
      return;
    }

    const transfer = await prisma.transfer.findUnique({ where: { id } });

    if (!transfer) {
      res.status(404).json({ success: false, message: "Transfer not found" });
      return;
    }

    // Prevent already-received transfers from any further modification
    if (transfer.status === "RECEIVED") {
      res.status(400).json({
        success: false,
        message: "Received transfers cannot be modified",
      });
      return;
    }

    const allowedTransitions: Record<string, string[]> = {
      REQUESTED: ["DISPATCHED"],
      DISPATCHED: ["RECEIVED"],
    };

    if (!allowedTransitions[transfer.status]?.includes(status)) {
      res.status(400).json({
        success: false,
        message: `Invalid status transition: ${transfer.status} → ${status}`,
      });
      return;
    }

    /*
     * ─── DISPATCHED ───────────────────────────────────────────────────────────
     * Source inventory is reduced immediately.
     * This models goods leaving the source location.
     * Destination inventory does NOT change yet.
     */
    if (status === "DISPATCHED") {
      const updatedTransfer = await prisma.$transaction(async (tx) => {
        // Re-read inventory inside transaction for a consistent view
        const sourceInventory = await tx.inventory.findMany({
          where: { productId: transfer.productId, locationId: transfer.sourceLocationId },
          orderBy: { createdAt: "asc" },
        });

        const availableQuantity = sourceInventory.reduce(
          (total, inv) => total + inv.physicalQuantity - inv.reservedQuantity,
          0
        );

        if (availableQuantity < transfer.quantity) {
          throw new Error(`INSUFFICIENT_INVENTORY:${availableQuantity}`);
        }

        // Deduct from source — FIFO across batches
        let remaining = transfer.quantity;

        for (const inv of sourceInventory) {
          if (remaining <= 0) break;

          const available = inv.physicalQuantity - inv.reservedQuantity;
          if (available <= 0) continue;

          const deduction = Math.min(available, remaining);

          await tx.inventory.update({
            where: { id: inv.id },
            data: { physicalQuantity: { decrement: deduction } },
          });

          remaining -= deduction;
        }

        // Update Product.currentStock to stay in sync
        const inventoryTotals = await tx.inventory.aggregate({
          where: { productId: transfer.productId },
          _sum: { physicalQuantity: true },
        });

        await tx.product.update({
          where: { id: transfer.productId },
          data: { currentStock: inventoryTotals._sum.physicalQuantity ?? 0 },
        });

        return tx.transfer.update({
          where: { id: transfer.id },
          data: { status: "DISPATCHED" },
          include: TRANSFER_INCLUDE,
        });
      });

      res.status(200).json({
        success: true,
        message: "Transfer dispatched — source inventory reduced",
        data: updatedTransfer,
      });
      return;
    }

    /*
     * ─── RECEIVED ─────────────────────────────────────────────────────────────
     * Destination inventory is increased.
     * Source inventory was already reduced on DISPATCHED — do NOT touch it again.
     */
    if (status === "RECEIVED") {
      const updatedTransfer = await prisma.$transaction(async (tx) => {
        // Idempotency guard: look for an existing destination batch record
        const batchNumber = `TRANSFER-${transfer.transferNumber}`;

        const existingDestinationInventory = await tx.inventory.findUnique({
          where: {
            productId_locationId_batchNumber: {
              productId: transfer.productId,
              locationId: transfer.targetLocationId,
              batchNumber,
            },
          },
        });

        if (existingDestinationInventory) {
          // This batch already exists → transfer was already received
          throw new Error("ALREADY_RECEIVED");
        }

        // Create a new inventory batch at the destination
        await tx.inventory.create({
          data: {
            productId: transfer.productId,
            locationId: transfer.targetLocationId,
            batchNumber,
            physicalQuantity: transfer.quantity,
            reservedQuantity: 0,
          },
        });

        // Update Product.currentStock
        const inventoryTotals = await tx.inventory.aggregate({
          where: { productId: transfer.productId },
          _sum: { physicalQuantity: true },
        });

        await tx.product.update({
          where: { id: transfer.productId },
          data: { currentStock: inventoryTotals._sum.physicalQuantity ?? 0 },
        });

        return tx.transfer.update({
          where: { id: transfer.id },
          data: { status: "RECEIVED" },
          include: TRANSFER_INCLUDE,
        });
      });

      res.status(200).json({
        success: true,
        message: "Transfer received — destination inventory updated",
        data: updatedTransfer,
      });
      return;
    }

    // Fallback (should not reach here given the allowed transitions map)
    res.status(400).json({ success: false, message: "Unsupported status transition" });
  } catch (error) {
    console.error("Update transfer status error:", error);

    if (error instanceof Error && error.message.startsWith("INSUFFICIENT_INVENTORY:")) {
      const available = error.message.split(":")[1];
      res.status(400).json({
        success: false,
        message: `Insufficient available inventory at source. Available: ${available}`,
      });
      return;
    }

    if (error instanceof Error && error.message === "ALREADY_RECEIVED") {
      res.status(409).json({
        success: false,
        message: "This transfer has already been received",
      });
      return;
    }

    res.status(500).json({ success: false, message: "Failed to update transfer status" });
  }
};
