import { Response } from "express";
import prisma from "../config/prisma.js";
import { AuthenticatedRequest } from "../middleware/auth.middleware.js";

/**
 * GET /api/inventory
 *
 * Fetch inventory records.
 * Optional filters:
 *   ?productId=1
 *   ?locationId=1
 */
export const getInventory = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const productId =
      req.query.productId !== undefined
        ? Number(req.query.productId)
        : undefined;

    const locationId =
      req.query.locationId !== undefined
        ? Number(req.query.locationId)
        : undefined;

    if (
      productId !== undefined &&
      (!Number.isInteger(productId) || productId <= 0)
    ) {
      res.status(400).json({
        success: false,
        message: "Invalid productId",
      });
      return;
    }

    if (
      locationId !== undefined &&
      (!Number.isInteger(locationId) || locationId <= 0)
    ) {
      res.status(400).json({
        success: false,
        message: "Invalid locationId",
      });
      return;
    }

    const inventory = await prisma.inventory.findMany({
      where: {
        ...(productId !== undefined ? { productId } : {}),
        ...(locationId !== undefined ? { locationId } : {}),
      },
      include: {
        product: true,
        location: true,
      },
      orderBy: [
        {
          location: {
            name: "asc",
          },
        },
        {
          product: {
            name: "asc",
          },
        },
        {
          id: "asc",
        },
      ],
    });

    res.status(200).json({
      success: true,
      data: inventory,
    });
  } catch (error) {
    console.error("Get inventory error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to fetch inventory",
    });
  }
};

/**
 * GET /api/inventory/:id
 *
 * Fetch a single inventory record.
 */
export const getInventoryById = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const id = Number(req.params.id);

    if (!Number.isInteger(id) || id <= 0) {
      res.status(400).json({
        success: false,
        message: "Invalid inventory ID",
      });
      return;
    }

    const inventory = await prisma.inventory.findUnique({
      where: {
        id,
      },
      include: {
        product: true,
        location: true,
      },
    });

    if (!inventory) {
      res.status(404).json({
        success: false,
        message: "Inventory record not found",
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: inventory,
    });
  } catch (error) {
    console.error("Get inventory record error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to fetch inventory record",
    });
  }
};

/**
 * POST /api/inventory
 *
 * Create opening inventory.
 *
 * Inventory is the source of truth.
 * Product.currentStock is synchronized to the total physical
 * inventory for that product.
 */
export const createInventory = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const {
      productId,
      locationId,
      batchNumber,
      physicalQuantity,
      reservedQuantity,
    } = req.body;

    if (
      productId === undefined ||
      locationId === undefined ||
      !batchNumber ||
      !String(batchNumber).trim()
    ) {
      res.status(400).json({
        success: false,
        message:
          "productId, locationId and batchNumber are required",
      });
      return;
    }

    const parsedProductId = Number(productId);
    const parsedLocationId = Number(locationId);

    const parsedPhysicalQuantity =
      physicalQuantity === undefined
        ? 0
        : Number(physicalQuantity);

    const parsedReservedQuantity =
      reservedQuantity === undefined
        ? 0
        : Number(reservedQuantity);

    if (
      !Number.isInteger(parsedProductId) ||
      parsedProductId <= 0
    ) {
      res.status(400).json({
        success: false,
        message: "Invalid productId",
      });
      return;
    }

    if (
      !Number.isInteger(parsedLocationId) ||
      parsedLocationId <= 0
    ) {
      res.status(400).json({
        success: false,
        message: "Invalid locationId",
      });
      return;
    }

    if (
      !Number.isInteger(parsedPhysicalQuantity) ||
      parsedPhysicalQuantity < 0
    ) {
      res.status(400).json({
        success: false,
        message:
          "physicalQuantity must be a non-negative integer",
      });
      return;
    }

    if (
      !Number.isInteger(parsedReservedQuantity) ||
      parsedReservedQuantity < 0
    ) {
      res.status(400).json({
        success: false,
        message:
          "reservedQuantity must be a non-negative integer",
      });
      return;
    }

    if (parsedReservedQuantity > parsedPhysicalQuantity) {
      res.status(400).json({
        success: false,
        message:
          "reservedQuantity cannot exceed physicalQuantity",
      });
      return;
    }

    const normalizedBatchNumber =
      String(batchNumber).trim();

    const product = await prisma.product.findUnique({
      where: {
        id: parsedProductId,
      },
    });

    if (!product) {
      res.status(404).json({
        success: false,
        message: "Product not found",
      });
      return;
    }

    const location = await prisma.location.findUnique({
      where: {
        id: parsedLocationId,
      },
    });

    if (!location) {
      res.status(404).json({
        success: false,
        message: "Location not found",
      });
      return;
    }

    const existingInventory =
      await prisma.inventory.findUnique({
        where: {
          productId_locationId_batchNumber: {
            productId: parsedProductId,
            locationId: parsedLocationId,
            batchNumber: normalizedBatchNumber,
          },
        },
      });

    if (existingInventory) {
      res.status(409).json({
        success: false,
        message:
          "Inventory record already exists for this product, location and batch",
      });
      return;
    }

    const inventory = await prisma.$transaction(
      async (tx) => {
        const created = await tx.inventory.create({
          data: {
            productId: parsedProductId,
            locationId: parsedLocationId,
            batchNumber: normalizedBatchNumber,
            physicalQuantity: parsedPhysicalQuantity,
            reservedQuantity: parsedReservedQuantity,
          },
          include: {
            product: true,
            location: true,
          },
        });

        /*
         * Record opening stock movement.
         */
        if (parsedPhysicalQuantity > 0) {
          await tx.stockMovement.create({
            data: {
              productId: parsedProductId,
              quantity: parsedPhysicalQuantity,
              movementType: "IN",
              reason:
                `Opening inventory - ${location.code} - ` +
                `Batch ${normalizedBatchNumber}`,
              createdById: req.user!.userId,
            },
          });
        }

        /*
         * Inventory is the source of truth.
         *
         * Recalculate Product.currentStock from ALL
         * inventory records instead of blindly incrementing it.
         */
        const inventoryTotals =
          await tx.inventory.aggregate({
            where: {
              productId: parsedProductId,
            },
            _sum: {
              physicalQuantity: true,
            },
          });

        const totalPhysicalStock =
          inventoryTotals._sum.physicalQuantity ?? 0;

        await tx.product.update({
          where: {
            id: parsedProductId,
          },
          data: {
            currentStock: totalPhysicalStock,
          },
        });

        /*
         * Return the newly created record with the
         * refreshed product relation.
         */
        return tx.inventory.findUnique({
          where: {
            id: created.id,
          },
          include: {
            product: true,
            location: true,
          },
        });
      }
    );

    res.status(201).json({
      success: true,
      message: "Inventory created successfully",
      data: inventory,
    });
  } catch (error) {
    console.error("Create inventory error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to create inventory",
    });
  }
};

/**
 * PATCH /api/inventory/:id/adjust
 *
 * Adjust inventory using IN / OUT.
 *
 * IN:
 *   physicalQuantity increases.
 *
 * OUT:
 *   physicalQuantity decreases.
 *   Reserved stock cannot be consumed.
 *
 * Every adjustment creates a StockMovement.
 *
 * Product.currentStock is recalculated from Inventory after
 * the adjustment.
 */
export const adjustInventory = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const id = Number(req.params.id);

    const {
      quantity,
      movementType,
      reason,
    } = req.body;

    if (!Number.isInteger(id) || id <= 0) {
      res.status(400).json({
        success: false,
        message: "Invalid inventory ID",
      });
      return;
    }

    const parsedQuantity = Number(quantity);

    if (
      !Number.isInteger(parsedQuantity) ||
      parsedQuantity <= 0
    ) {
      res.status(400).json({
        success: false,
        message: "Quantity must be a positive integer",
      });
      return;
    }

    if (
      movementType !== "IN" &&
      movementType !== "OUT"
    ) {
      res.status(400).json({
        success: false,
        message: "movementType must be IN or OUT",
      });
      return;
    }

    const normalizedReason =
      typeof reason === "string"
        ? reason.trim()
        : "";

    if (!normalizedReason) {
      res.status(400).json({
        success: false,
        message: "Reason is required",
      });
      return;
    }

    /*
     * Read the inventory before starting the transaction
     * so we can validate the requested OUT quantity.
     */
    const inventory = await prisma.inventory.findUnique({
      where: {
        id,
      },
      include: {
        product: true,
        location: true,
      },
    });

    if (!inventory) {
      res.status(404).json({
        success: false,
        message: "Inventory record not found",
      });
      return;
    }

    /*
     * Available inventory:
     *
     * physicalQuantity - reservedQuantity
     */
    const availableQuantity =
      inventory.physicalQuantity -
      inventory.reservedQuantity;

    if (
      movementType === "OUT" &&
      parsedQuantity > availableQuantity
    ) {
      res.status(400).json({
        success: false,
        message:
          `Insufficient available inventory. ` +
          `Available: ${availableQuantity}, ` +
          `Requested: ${parsedQuantity}`,
      });
      return;
    }

    const updatedInventory =
      await prisma.$transaction(async (tx) => {
        /*
         * Update physical inventory.
         */
        await tx.inventory.update({
          where: {
            id,
          },
          data: {
            physicalQuantity:
              movementType === "IN"
                ? {
                    increment: parsedQuantity,
                  }
                : {
                    decrement: parsedQuantity,
                  },
          },
        });

        /*
         * Record stock movement.
         */
        await tx.stockMovement.create({
          data: {
            productId: inventory.productId,
            quantity: parsedQuantity,
            movementType,
            reason: normalizedReason,
            createdById: req.user!.userId,
          },
        });

        /*
         * Recalculate currentStock from inventory.
         *
         * IMPORTANT:
         * Do NOT simply increment/decrement Product.currentStock.
         *
         * Inventory is the operational source of truth.
         */
        const inventoryTotals =
          await tx.inventory.aggregate({
            where: {
              productId: inventory.productId,
            },
            _sum: {
              physicalQuantity: true,
            },
          });

        const totalPhysicalStock =
          inventoryTotals._sum.physicalQuantity ?? 0;

        await tx.product.update({
          where: {
            id: inventory.productId,
          },
          data: {
            currentStock: totalPhysicalStock,
          },
        });

        /*
         * Return fresh inventory + fresh product.
         */
        return tx.inventory.findUnique({
          where: {
            id,
          },
          include: {
            product: true,
            location: true,
          },
        });
      });

    res.status(200).json({
      success: true,
      message: "Inventory adjusted successfully",
      data: updatedInventory,
    });
  } catch (error) {
    console.error("Adjust inventory error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to adjust inventory",
    });
  }
};
