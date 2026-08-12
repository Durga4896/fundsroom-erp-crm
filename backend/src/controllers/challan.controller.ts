import { Request, Response } from "express";
import { AuthenticatedRequest } from "../middleware/auth.middleware.js";
import prisma from "../config/prisma.js";
import { createChallanSchema } from "../validators/challan.validator.js";
import { Prisma } from "../generated/prisma/client.js";

const generateChallanNumber = async (): Promise<string> => {
  const count = await prisma.challan.count();

  const nextNumber = count + 1;

  return `CH-${new Date().getFullYear()}-${String(nextNumber).padStart(5, "0")}`;
};

// CREATE DRAFT CHALLAN
export const createChallan = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const user = req.user;

    if (!user) {
      res.status(401).json({
        success: false,
        message: "Authentication required",
      });
      return;
    }

    const parsed = createChallanSchema.safeParse(req.body);

    if (!parsed.success) {
      res.status(400).json({
        success: false,
        message: "Validation failed",
        errors: parsed.error.flatten(),
      });
      return;
    }

    const { customerId, items } = parsed.data;

    const customer = await prisma.customer.findUnique({
      where: { id: customerId },
    });

    if (!customer) {
      res.status(404).json({
        success: false,
        message: "Customer not found",
      });
      return;
    }

    const productIds = items.map((item) => item.productId);

    const products = await prisma.product.findMany({
      where: {
        id: {
          in: productIds,
        },
      },
    });

    if (products.length !== productIds.length) {
      res.status(404).json({
        success: false,
        message: "One or more products not found",
      });
      return;
    }

    const challanNumber = await generateChallanNumber();

    const challanItems = items.map((item) => {
      const product = products.find(
        (product) => product.id === item.productId
      )!;

      return {
        productId: product.id,
        productName: product.name,
        sku: product.sku,
        unitPrice: product.unitPrice,
        quantity: item.quantity,
      };
    });

    const totalQuantity = challanItems.reduce(
      (total, item) => total + item.quantity,
      0
    );

    const challan = await prisma.challan.create({
      data: {
        challanNumber,
        customerId,
        totalQuantity,
        createdById: user.userId,

        items: {
          create: challanItems,
        },
      },
      include: {
        customer: true,
        items: true,
      },
    });

    res.status(201).json({
      success: true,
      message: "Challan created successfully",
      data: challan,
    });
  } catch (error) {
    console.error("Create challan error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to create challan",
    });
  }
};

// GET ALL CHALLANS
export const getChallans = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const page = Math.max(Number(req.query.page) || 1, 1);
    const limit = Math.min(Number(req.query.limit) || 10, 100);

    const skip = (page - 1) * limit;

    const [challans, total] = await Promise.all([
      prisma.challan.findMany({
        skip,
        take: limit,
        orderBy: {
          createdAt: "desc",
        },
        include: {
          customer: true,
          createdBy: {
            select: {
              id: true,
              name: true,
              email: true,
              role: true,
            },
          },
          items: true,
        },
      }),

      prisma.challan.count(),
    ]);

    res.status(200).json({
      success: true,
      data: challans,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Get challans error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to fetch challans",
    });
  }
};

// GET SINGLE CHALLAN
export const getChallanById = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const id = Number(req.params.id);

    if (!Number.isInteger(id) || id <= 0) {
      res.status(400).json({
        success: false,
        message: "Invalid challan ID",
      });
      return;
    }

    const challan = await prisma.challan.findUnique({
      where: { id },
      include: {
        customer: true,
        createdBy: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          },
        },
        items: true,
      },
    });

    if (!challan) {
      res.status(404).json({
        success: false,
        message: "Challan not found",
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: challan,
    });
  } catch (error) {
    console.error("Get challan error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to fetch challan",
    });
  }
};

// CONFIRM CHALLAN
export const confirmChallan = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const user = req.user;

    if (!user) {
      res.status(401).json({
        success: false,
        message: "Authentication required",
      });
      return;
    }

    const id = Number(req.params.id);

    if (!Number.isInteger(id) || id <= 0) {
      res.status(400).json({
        success: false,
        message: "Invalid challan ID",
      });
      return;
    }

    const result = await prisma.$transaction(
      async (tx) => {
        const challan = await tx.challan.findUnique({
          where: { id },
          include: {
            items: true,
          },
        });

        if (!challan) {
          throw new Error("CHALLAN_NOT_FOUND");
        }

        if (challan.status !== "DRAFT") {
          throw new Error("CHALLAN_NOT_DRAFT");
        }

        // Check stock before making any changes
        for (const item of challan.items) {
          const product = await tx.product.findUnique({
            where: {
              id: item.productId,
            },
          });

          if (!product) {
            throw new Error(`PRODUCT_NOT_FOUND:${item.productId}`);
          }

          if (product.currentStock < item.quantity) {
            throw new Error(
              `INSUFFICIENT_STOCK:${product.name}:${product.currentStock}:${item.quantity}`
            );
          }
        }

        // Deduct stock + create stock movements
        for (const item of challan.items) {
          const product = await tx.product.findUnique({
            where: {
              id: item.productId,
            },
          });

          if (!product) {
            throw new Error(`PRODUCT_NOT_FOUND:${item.productId}`);
          }

          await tx.product.update({
            where: {
              id: item.productId,
            },
            data: {
              currentStock: {
                decrement: item.quantity,
              },
            },
          });

          await tx.stockMovement.create({
            data: {
              productId: item.productId,
              quantity: item.quantity,
              movementType: "OUT",
              reason: `Sales challan ${challan.challanNumber}`,
              createdById: user.userId,
            },
          });
        }

        return tx.challan.update({
          where: {
            id,
          },
          data: {
            status: "CONFIRMED",
          },
          include: {
            customer: true,
            items: true,
          },
        });
      },
      {
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
      }
    );

    res.status(200).json({
      success: true,
      message: "Challan confirmed successfully",
      data: result,
    });
  } catch (error) {
    console.error("Confirm challan error:", error);

    if (error instanceof Error) {
      if (error.message === "CHALLAN_NOT_FOUND") {
        res.status(404).json({
          success: false,
          message: "Challan not found",
        });
        return;
      }

      if (error.message === "CHALLAN_NOT_DRAFT") {
        res.status(409).json({
          success: false,
          message: "Only draft challans can be confirmed",
        });
        return;
      }

      if (error.message.startsWith("PRODUCT_NOT_FOUND:")) {
        res.status(404).json({
          success: false,
          message: "Product not found",
        });
        return;
      }

      if (error.message.startsWith("INSUFFICIENT_STOCK:")) {
        const [, productName, available, requested] =
          error.message.split(":");

        res.status(409).json({
          success: false,
          message: `Insufficient stock for ${productName}`,
          details: {
            availableStock: Number(available),
            requestedQuantity: Number(requested),
          },
        });
        return;
      }
    }

    res.status(500).json({
      success: false,
      message: "Failed to confirm challan",
    });
  }
};

// CANCEL CHALLAN
export const cancelChallan = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const id = Number(req.params.id);

    if (!Number.isInteger(id) || id <= 0) {
      res.status(400).json({
        success: false,
        message: "Invalid challan ID",
      });
      return;
    }

    const challan = await prisma.challan.findUnique({
      where: { id },
    });

    if (!challan) {
      res.status(404).json({
        success: false,
        message: "Challan not found",
      });
      return;
    }

    if (challan.status !== "DRAFT") {
      res.status(409).json({
        success: false,
        message: "Only draft challans can be cancelled",
      });
      return;
    }

    const updated = await prisma.challan.update({
      where: { id },
      data: {
        status: "CANCELLED",
      },
    });

    res.status(200).json({
      success: true,
      message: "Challan cancelled successfully",
      data: updated,
    });
  } catch (error) {
    console.error("Cancel challan error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to cancel challan",
    });
  }
};