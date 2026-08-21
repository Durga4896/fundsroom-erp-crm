import { Response } from "express";
import prisma from "../config/prisma.js";
import { AuthenticatedRequest } from "../middleware/auth.middleware.js";

const generateTransferNumber = (): string => {
  return `TR-${Date.now()}`;
};

/**
 * GET /api/operations/transfers
 */
export const getTransfers = async (
  _req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const transfers = await prisma.transfer.findMany({
      orderBy: {
        createdAt: "desc",
      },
      include: {
        product: true,
        sourceLocation: true,
        targetLocation: true,
        createdBy: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          },
        },
      },
    });

    res.status(200).json({
      success: true,
      data: transfers,
    });
  } catch (error) {
    console.error("Get transfers error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to fetch transfers",
    });
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

    if (!Number.isInteger(id)) {
      res.status(400).json({
        success: false,
        message: "Invalid transfer ID",
      });
      return;
    }

    const transfer = await prisma.transfer.findUnique({
      where: { id },
      include: {
        product: true,
        sourceLocation: true,
        targetLocation: true,
        createdBy: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          },
        },
      },
    });

    if (!transfer) {
      res.status(404).json({
        success: false,
        message: "Transfer not found",
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: transfer,
    });
  } catch (error) {
    console.error("Get transfer error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to fetch transfer",
    });
  }
};

/**
 * POST /api/operations/transfers
 */
export const createTransfer = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const {
      productId,
      sourceLocationId,
      targetLocationId,
      quantity,
    } = req.body;

    if (
      productId === undefined ||
      sourceLocationId === undefined ||
      targetLocationId === undefined ||
      quantity === undefined
    ) {
      res.status(400).json({
        success: false,
        message:
          "productId, sourceLocationId, targetLocationId and quantity are required",
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
      res.status(400).json({
        success: false,
        message: "IDs and quantity must be integers",
      });
      return;
    }

    if (quantityNumber <= 0) {
      res.status(400).json({
        success: false,
        message: "Quantity must be greater than zero",
      });
      return;
    }

    if (sourceId === targetId) {
      res.status(400).json({
        success: false,
        message: "Source and target locations must be different",
      });
      return;
    }

    const [product, sourceLocation, targetLocation] =
      await Promise.all([
        prisma.product.findUnique({
          where: { id: productIdNumber },
        }),
        prisma.location.findUnique({
          where: { id: sourceId },
        }),
        prisma.location.findUnique({
          where: { id: targetId },
        }),
      ]);

    if (!product) {
      res.status(404).json({
        success: false,
        message: "Product not found",
      });
      return;
    }

    if (!sourceLocation) {
      res.status(404).json({
        success: false,
        message: "Source location not found",
      });
      return;
    }

    if (!targetLocation) {
      res.status(404).json({
        success: false,
        message: "Target location not found",
      });
      return;
    }

    const sourceInventory = await prisma.inventory.findMany({
      where: {
        productId: productIdNumber,
        locationId: sourceId,
      },
      orderBy: {
        createdAt: "asc",
      },
    });

    const availableQuantity = sourceInventory.reduce(
      (total, inventory) =>
        total +
        inventory.physicalQuantity -
        inventory.reservedQuantity,
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
      include: {
        product: true,
        sourceLocation: true,
        targetLocation: true,
        createdBy: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          },
        },
      },
    });

    res.status(201).json({
      success: true,
      message: "Transfer created successfully",
      data: transfer,
    });
  } catch (error) {
    console.error("Create transfer error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to create transfer",
    });
  }
};

/**
 * PATCH /api/operations/transfers/:id/status
 */
export const updateTransferStatus = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const id = Number(req.params.id);
    const { status } = req.body;

    if (!Number.isInteger(id)) {
      res.status(400).json({
        success: false,
        message: "Invalid transfer ID",
      });
      return;
    }

    const validStatuses = ["REQUESTED", "DISPATCHED", "RECEIVED"];

    if (!validStatuses.includes(status)) {
      res.status(400).json({
        success: false,
        message:
          "Invalid status. Allowed values: REQUESTED, DISPATCHED, RECEIVED",
      });
      return;
    }

    const transfer = await prisma.transfer.findUnique({
      where: { id },
    });

    if (!transfer) {
      res.status(404).json({
        success: false,
        message: "Transfer not found",
      });
      return;
    }

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
     * Inventory movement happens when the transfer is RECEIVED.
     */
    if (status === "RECEIVED") {
      const updatedTransfer = await prisma.$transaction(async (tx) => {
        const sourceInventory = await tx.inventory.findMany({
          where: {
            productId: transfer.productId,
            locationId: transfer.sourceLocationId,
          },
          orderBy: {
            createdAt: "asc",
          },
        });

        const availableQuantity = sourceInventory.reduce(
          (total, inventory) =>
            total +
            inventory.physicalQuantity -
            inventory.reservedQuantity,
          0
        );

        if (availableQuantity < transfer.quantity) {
          throw new Error(
            `INSUFFICIENT_INVENTORY:${availableQuantity}`
          );
        }

        let remaining = transfer.quantity;

        for (const inventory of sourceInventory) {
          if (remaining <= 0) break;

          const available =
            inventory.physicalQuantity -
            inventory.reservedQuantity;

          if (available <= 0) continue;

          const deduction = Math.min(available, remaining);

          await tx.inventory.update({
            where: {
              id: inventory.id,
            },
            data: {
              physicalQuantity: {
                decrement: deduction,
              },
            },
          });

          remaining -= deduction;
        }

        const destinationInventory =
          await tx.inventory.findUnique({
            where: {
              productId_locationId_batchNumber: {
                productId: transfer.productId,
                locationId: transfer.targetLocationId,
                batchNumber: `TRANSFER-${transfer.transferNumber}`,
              },
            },
          });

        if (destinationInventory) {
          await tx.inventory.update({
            where: {
              id: destinationInventory.id,
            },
            data: {
              physicalQuantity: {
                increment: transfer.quantity,
              },
            },
          });
        } else {
          await tx.inventory.create({
            data: {
              productId: transfer.productId,
              locationId: transfer.targetLocationId,
              batchNumber: `TRANSFER-${transfer.transferNumber}`,
              physicalQuantity: transfer.quantity,
              reservedQuantity: 0,
            },
          });
        }

        return tx.transfer.update({
          where: {
            id: transfer.id,
          },
          data: {
            status: "RECEIVED",
          },
          include: {
            product: true,
            sourceLocation: true,
            targetLocation: true,
            createdBy: {
              select: {
                id: true,
                name: true,
                email: true,
                role: true,
              },
            },
          },
        });
      });

      res.status(200).json({
        success: true,
        message: "Transfer received and inventory updated successfully",
        data: updatedTransfer,
      });

      return;
    }

    const updatedTransfer = await prisma.transfer.update({
      where: {
        id,
      },
      data: {
        status: status as "REQUESTED" | "DISPATCHED" | "RECEIVED",
      },
      include: {
        product: true,
        sourceLocation: true,
        targetLocation: true,
        createdBy: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          },
        },
      },
    });

    res.status(200).json({
      success: true,
      message: "Transfer status updated successfully",
      data: updatedTransfer,
    });
  } catch (error) {
    console.error("Update transfer status error:", error);

    if (
      error instanceof Error &&
      error.message.startsWith("INSUFFICIENT_INVENTORY:")
    ) {
      const available = error.message.split(":")[1];

      res.status(400).json({
        success: false,
        message: `Insufficient available inventory. Available: ${available}`,
      });

      return;
    }

    res.status(500).json({
      success: false,
      message: "Failed to update transfer status",
    });
  }
};
