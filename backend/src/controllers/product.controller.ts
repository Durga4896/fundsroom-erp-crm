import { Response } from "express";
import prisma from "../config/prisma.js";
import { AuthenticatedRequest } from "../middleware/auth.middleware.js";
import {
  createProductSchema,
  updateProductSchema,
  stockMovementSchema,
} from "../validators/product.validator.js";

export const createProduct = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const validation = createProductSchema.safeParse(req.body);

    if (!validation.success) {
      res.status(400).json({
        success: false,
        message: "Validation failed",
        errors: validation.error.flatten(),
      });
      return;
    }

    const data = validation.data;

    const existingProduct = await prisma.product.findUnique({
      where: {
        sku: data.sku,
      },
    });

    if (existingProduct) {
      res.status(409).json({
        success: false,
        message: "A product with this SKU already exists",
      });
      return;
    }

    const product = await prisma.product.create({
      data: {
        name: data.name,
        sku: data.sku,
        category: data.category,
        unitPrice: data.unitPrice,
        currentStock: data.currentStock ?? 0,
        minimumStock: data.minimumStock,
        warehouseLocation: data.warehouseLocation,
      },
    });

    res.status(201).json({
      success: true,
      message: "Product created successfully",
      data: product,
    });
  } catch (error) {
    console.error("Create product error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to create product",
    });
  }
};

export const getProducts = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const page = Math.max(
      Number(req.query.page) || 1,
      1
    );

    const limit = Math.min(
      Math.max(Number(req.query.limit) || 10, 1),
      100
    );

    const search =
      typeof req.query.search === "string"
        ? req.query.search.trim()
        : "";

    const category =
      typeof req.query.category === "string"
        ? req.query.category.trim()
        : "";

    const lowStock =
      req.query.lowStock === "true";

    const where = {
      ...(search
        ? {
            OR: [
              {
                name: {
                  contains: search,
                  mode: "insensitive" as const,
                },
              },
              {
                sku: {
                  contains: search,
                  mode: "insensitive" as const,
                },
              },
            ],
          }
        : {}),

      ...(category
        ? {
            category: {
              equals: category,
              mode: "insensitive" as const,
            },
          }
        : {}),
    };

    const products = await prisma.product.findMany({
      where,
      include: {
        inventory: {
          select: {
            physicalQuantity: true,
            reservedQuantity: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    const productsWithStock = products.map((product) => {
      const physicalStock = product.inventory.reduce(
        (total, inventory) =>
          total + inventory.physicalQuantity,
        0
      );

      const reservedStock = product.inventory.reduce(
        (total, inventory) =>
          total + inventory.reservedQuantity,
        0
      );

      const availableStock =
        physicalStock - reservedStock;

      return {
        id: product.id,
        name: product.name,
        sku: product.sku,
        category: product.category,
        unitPrice: product.unitPrice,
        currentStock: product.currentStock,
        minimumStock: product.minimumStock,
        warehouseLocation: product.warehouseLocation,
        createdAt: product.createdAt,
        updatedAt: product.updatedAt,
        physicalStock,
        reservedStock,
        availableStock,
      };
    });

    const filteredProducts = lowStock
      ? productsWithStock.filter(
          (product) =>
            product.availableStock <=
            product.minimumStock
        )
      : productsWithStock;

    const total = filteredProducts.length;

    const paginatedProducts = filteredProducts.slice(
      (page - 1) * limit,
      page * limit
    );

    res.status(200).json({
      success: true,
      data: paginatedProducts,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Get products error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to fetch products",
    });
  }
};

export const getProductById = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const id = Number(req.params.id);

    if (!Number.isInteger(id) || id <= 0) {
      res.status(400).json({
        success: false,
        message: "Invalid product ID",
      });
      return;
    }

    const product = await prisma.product.findUnique({
      where: { id },
      include: {
        stockMovements: {
          orderBy: {
            createdAt: "desc",
          },
          include: {
            createdBy: {
              select: {
                id: true,
                name: true,
                email: true,
                role: true,
              },
            },
          },
        },
      },
    });

    if (!product) {
      res.status(404).json({
        success: false,
        message: "Product not found",
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: product,
    });
  } catch (error) {
    console.error("Get product error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to fetch product",
    });
  }
};

export const updateProduct = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const id = Number(req.params.id);

    if (!Number.isInteger(id) || id <= 0) {
      res.status(400).json({
        success: false,
        message: "Invalid product ID",
      });
      return;
    }

    const validation = updateProductSchema.safeParse(req.body);

    if (!validation.success) {
      res.status(400).json({
        success: false,
        message: "Validation failed",
        errors: validation.error.flatten(),
      });
      return;
    }

    const data = validation.data;

    const existingProduct =
      await prisma.product.findUnique({
        where: { id },
      });

    if (!existingProduct) {
      res.status(404).json({
        success: false,
        message: "Product not found",
      });
      return;
    }

    if (
      data.sku &&
      data.sku !== existingProduct.sku
    ) {
      const skuExists =
        await prisma.product.findUnique({
          where: {
            sku: data.sku,
          },
        });

      if (skuExists) {
        res.status(409).json({
          success: false,
          message: "A product with this SKU already exists",
        });
        return;
      }
    }

    const product = await prisma.product.update({
      where: { id },
      data,
    });

    res.status(200).json({
      success: true,
      message: "Product updated successfully",
      data: product,
    });
  } catch (error) {
    console.error("Update product error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to update product",
    });
  }
};

export const addStockMovement = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: "Authentication required",
      });
      return;
    }

    const productId = Number(req.params.id);

    if (!Number.isInteger(productId) || productId <= 0) {
      res.status(400).json({
        success: false,
        message: "Invalid product ID",
      });
      return;
    }

    const validation = stockMovementSchema.safeParse(req.body);

    if (!validation.success) {
      res.status(400).json({
        success: false,
        message: "Validation failed",
        errors: validation.error.flatten(),
      });
      return;
    }

    const {
      quantity,
      movementType,
      reason,
    } = validation.data;

    const result = await prisma.$transaction(async (tx) => {
      const product = await tx.product.findUnique({
        where: {
          id: productId,
        },
      });

      if (!product) {
        throw new Error("PRODUCT_NOT_FOUND");
      }

      const inventoryRecords = await tx.inventory.findMany({
        where: {
          productId,
        },
        orderBy: {
          id: "asc",
        },
      });

      if (inventoryRecords.length === 0) {
        throw new Error("INVENTORY_NOT_FOUND");
      }

      const totalPhysicalStock = inventoryRecords.reduce(
        (total, inventory) =>
          total + inventory.physicalQuantity,
        0
      );

      const totalReservedStock = inventoryRecords.reduce(
        (total, inventory) =>
          total + inventory.reservedQuantity,
        0
      );

      const totalAvailableStock =
        totalPhysicalStock - totalReservedStock;

      if (
        movementType === "OUT" &&
        totalAvailableStock < quantity
      ) {
        throw new Error("INSUFFICIENT_STOCK");
      }

      let remaining = quantity;

      for (const inventory of inventoryRecords) {
        if (remaining <= 0) {
          break;
        }

        if (movementType === "IN") {
          await tx.inventory.update({
            where: {
              id: inventory.id,
            },
            data: {
              physicalQuantity: {
                increment: remaining,
              },
            },
          });

          remaining = 0;
          break;
        }

        const available =
          inventory.physicalQuantity -
          inventory.reservedQuantity;

        if (available <= 0) {
          continue;
        }

        const deduction = Math.min(
          available,
          remaining
        );

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

      if (remaining > 0) {
        throw new Error("INSUFFICIENT_STOCK");
      }

      const movement = await tx.stockMovement.create({
        data: {
          productId,
          quantity,
          movementType,
          reason,
          createdById: req.user!.userId,
        },
      });

      return {
        product,
        movement,
        stock: {
          physicalStock:
            movementType === "IN"
              ? totalPhysicalStock + quantity
              : totalPhysicalStock - quantity,
          reservedStock: totalReservedStock,
          availableStock:
            movementType === "IN"
              ? totalAvailableStock + quantity
              : totalAvailableStock - quantity,
        },
      };
    });

    res.status(201).json({
      success: true,
      message: `Stock ${
        movementType === "IN" ? "added" : "removed"
      } successfully`,
      data: result,
    });
  } catch (error) {
    if (
      error instanceof Error &&
      error.message === "PRODUCT_NOT_FOUND"
    ) {
      res.status(404).json({
        success: false,
        message: "Product not found",
      });
      return;
    }

    if (
      error instanceof Error &&
      error.message === "INVENTORY_NOT_FOUND"
    ) {
      res.status(404).json({
        success: false,
        message: "Inventory record not found for this product",
      });
      return;
    }

    if (
      error instanceof Error &&
      error.message === "INSUFFICIENT_STOCK"
    ) {
      res.status(409).json({
        success: false,
        message: "Insufficient available stock",
      });
      return;
    }

    console.error("Stock movement error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to update stock",
    });
  }
};

export const getStockMovements = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const productId = Number(req.params.id);

    if (!Number.isInteger(productId) || productId <= 0) {
      res.status(400).json({
        success: false,
        message: "Invalid product ID",
      });
      return;
    }

    const product = await prisma.product.findUnique({
      where: {
        id: productId,
      },
    });

    if (!product) {
      res.status(404).json({
        success: false,
        message: "Product not found",
      });
      return;
    }

    const movements =
      await prisma.stockMovement.findMany({
        where: {
          productId,
        },
        orderBy: {
          createdAt: "desc",
        },
        include: {
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
      data: movements,
    });
  } catch (error) {
    console.error(
      "Get stock movements error:",
      error
    );

    res.status(500).json({
      success: false,
      message: "Failed to fetch stock movements",
    });
  }
};