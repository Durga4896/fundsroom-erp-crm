import { Response } from "express";
import prisma from "../config/prisma.js";
import { AuthenticatedRequest } from "../middleware/auth.middleware.js";

/**
 * GET /api/operations/customer-orders
 */
export const getCustomerOrders = async (
  _req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const orders = await prisma.customerOrder.findMany({
      orderBy: {
        createdAt: "desc",
      },
      include: {
        customer: true,
        location: true,
        createdBy: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          },
        },
        items: {
          include: {
            product: true,
          },
        },
      },
    });

    res.status(200).json({
      success: true,
      data: orders,
    });
  } catch (error) {
    console.error("Get customer orders error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to fetch customer orders",
    });
  }
};

/**
 * GET /api/operations/customer-orders/:id
 */
export const getCustomerOrderById = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const id = Number(req.params.id);

    if (!Number.isInteger(id)) {
      res.status(400).json({
        success: false,
        message: "Invalid order ID",
      });
      return;
    }

    const order = await prisma.customerOrder.findUnique({
      where: { id },
      include: {
        customer: true,
        location: true,
        createdBy: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          },
        },
        items: {
          include: {
            product: true,
          },
        },
      },
    });

    if (!order) {
      res.status(404).json({
        success: false,
        message: "Customer order not found",
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: order,
    });
  } catch (error) {
    console.error("Get customer order error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to fetch customer order",
    });
  }
};

/**
 * POST /api/operations/customer-orders
 */
export const createCustomerOrder = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const { customerId, locationId, items } = req.body;

    if (!req.user) {
      res.status(401).json({
        success: false,
        message: "Authentication required",
      });
      return;
    }

    if (!customerId || !locationId || !Array.isArray(items) || items.length === 0) {
      res.status(400).json({
        success: false,
        message: "customerId, locationId and at least one item are required",
      });
      return;
    }

    const parsedCustomerId = Number(customerId);
    const parsedLocationId = Number(locationId);

    if (
      !Number.isInteger(parsedCustomerId) ||
      !Number.isInteger(parsedLocationId)
    ) {
      res.status(400).json({
        success: false,
        message: "customerId and locationId must be valid integers",
      });
      return;
    }

    const customer = await prisma.customer.findUnique({
      where: {
        id: parsedCustomerId,
      },
    });

    if (!customer) {
      res.status(404).json({
        success: false,
        message: "Customer not found",
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

    // Normalize and validate items.
    const normalizedItems = items.map((item: any) => ({
      productId: Number(item.productId),
      quantity: Number(item.quantity),
    }));

    for (const item of normalizedItems) {
      if (
        !Number.isInteger(item.productId) ||
        !Number.isInteger(item.quantity) ||
        item.quantity <= 0
      ) {
        res.status(400).json({
          success: false,
          message: "Each item must contain a valid productId and positive quantity",
        });
        return;
      }
    }

    // Prevent duplicate products in the same order.
    const productIds = normalizedItems.map((item: any) => item.productId);

    if (new Set(productIds).size !== productIds.length) {
      res.status(400).json({
        success: false,
        message: "A product cannot appear more than once in an order",
      });
      return;
    }

    const productRecords = await prisma.product.findMany({
      where: {
        id: {
          in: productIds,
        },
      },
    });

    if (productRecords.length !== productIds.length) {
      res.status(404).json({
        success: false,
        message: "One or more products were not found",
      });
      return;
    }

    const order = await prisma.$transaction(async (tx) => {
      /*
       * Reserve inventory atomically.
       *
       * available quantity =
       * physicalQuantity - reservedQuantity
       */
      for (const item of normalizedItems) {
        const inventoryRecords = await tx.inventory.findMany({
          where: {
            productId: item.productId,
            locationId: parsedLocationId,
          },
          orderBy: {
            id: "asc",
          },
        });

        const availableQuantity = inventoryRecords.reduce(
          (total, inventory) =>
            total + inventory.physicalQuantity - inventory.reservedQuantity,
          0
        );

        if (availableQuantity < item.quantity) {
          const product = productRecords.find(
            (record) => record.id === item.productId
          );

          throw new Error(
            `INSUFFICIENT_STOCK:${product?.name ?? item.productId}:${availableQuantity}`
          );
        }

        let remaining = item.quantity;

        for (const inventory of inventoryRecords) {
          if (remaining <= 0) {
            break;
          }

          const available =
            inventory.physicalQuantity - inventory.reservedQuantity;

          if (available <= 0) {
            continue;
          }

          const reserve = Math.min(available, remaining);

          await tx.inventory.update({
            where: {
              id: inventory.id,
            },
            data: {
              reservedQuantity: {
                increment: reserve,
              },
            },
          });

          remaining -= reserve;
        }
      }

      const orderNumber = `CO-${Date.now()}`;

      return tx.customerOrder.create({
        data: {
          orderNumber,
          customerId: parsedCustomerId,
          locationId: parsedLocationId,
          status: "RESERVED",
          createdById: req.user!.userId,
          items: {
            create: normalizedItems.map((item: any) => ({
              productId: item.productId,
              quantity: item.quantity,
            })),
          },
        },
        include: {
          customer: true,
          location: true,
          createdBy: {
            select: {
              id: true,
              name: true,
              email: true,
              role: true,
            },
          },
          items: {
            include: {
              product: true,
            },
          },
        },
      });
    });

    res.status(201).json({
      success: true,
      message: "Customer order created successfully",
      data: order,
    });
  } catch (error) {
    console.error("Create customer order error:", error);

    if (error instanceof Error && error.message.startsWith("INSUFFICIENT_STOCK:")) {
      const [, product, available] = error.message.split(":");

      res.status(409).json({
        success: false,
        message: `Insufficient stock for ${product}. Available quantity: ${available}`,
      });
      return;
    }

    res.status(500).json({
      success: false,
      message: "Failed to create customer order",
    });
  }
};

/**
 * PATCH /api/operations/customer-orders/:id/status
 */
export const updateCustomerOrderStatus = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const id = Number(req.params.id);
    const { status } = req.body;

    if (!Number.isInteger(id) || id <= 0) {
      res.status(400).json({
        success: false,
        message: "Invalid order ID",
      });
      return;
    }

    if (!["RESERVED", "CANCELLED", "COMPLETED"].includes(status)) {
      res.status(400).json({
        success: false,
        message: "Invalid order status",
      });
      return;
    }

    const order = await prisma.customerOrder.findUnique({
      where: { id },
      include: {
        items: true,
      },
    });

    if (!order) {
      res.status(404).json({
        success: false,
        message: "Customer order not found",
      });
      return;
    }

    if (order.status === "COMPLETED" || order.status === "CANCELLED") {
      res.status(409).json({
        success: false,
        message: "Completed or cancelled orders cannot be modified",
      });
      return;
    }

    if (order.status === status) {
      res.status(400).json({
        success: false,
        message: `Order is already ${status}`,
      });
      return;
    }

    const updatedOrder = await prisma.$transaction(async (tx) => {
      /*
       * CANCELLED
       *
       * Release the stock reservations.
       * Physical stock does not change.
       */
      if (status === "CANCELLED") {
        for (const item of order.items) {
          const inventoryRecords = await tx.inventory.findMany({
            where: {
              productId: item.productId,
              locationId: order.locationId,
            },
            orderBy: {
              id: "asc",
            },
          });

          let remaining = item.quantity;

          for (const inventory of inventoryRecords) {
            if (remaining <= 0) {
              break;
            }

            const release = Math.min(
              inventory.reservedQuantity,
              remaining
            );

            if (release > 0) {
              await tx.inventory.update({
                where: {
                  id: inventory.id,
                },
                data: {
                  reservedQuantity: {
                    decrement: release,
                  },
                },
              });

              remaining -= release;
            }
          }

          if (remaining > 0) {
            throw new Error("RESERVED_STOCK_MISSING");
          }
        }
      }

      /*
       * COMPLETED
       *
       * Convert reserved stock into consumed stock.
       *
       * Inventory:
       *   physicalQuantity decreases
       *   reservedQuantity decreases
       *
       * Product:
       *   currentStock decreases
       *
       * All changes happen inside the same transaction.
       */
      if (status === "COMPLETED") {
        for (const item of order.items) {
          const inventoryRecords = await tx.inventory.findMany({
            where: {
              productId: item.productId,
              locationId: order.locationId,
            },
            orderBy: {
              id: "asc",
            },
          });

          let remaining = item.quantity;

          for (const inventory of inventoryRecords) {
            if (remaining <= 0) {
              break;
            }

            const consume = Math.min(
              inventory.reservedQuantity,
              remaining
            );

            if (consume > 0) {
              await tx.inventory.update({
                where: {
                  id: inventory.id,
                },
                data: {
                  physicalQuantity: {
                    decrement: consume,
                  },
                  reservedQuantity: {
                    decrement: consume,
                  },
                },
              });

              remaining -= consume;
            }
          }

          if (remaining > 0) {
            throw new Error("RESERVED_STOCK_MISSING");
          }

          /*
           * Keep Product.currentStock synchronized
           * with inventory consumption.
           */
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
        }
      }

      return tx.customerOrder.update({
        where: {
          id,
        },
        data: {
          status,
        },
        include: {
          customer: true,
          location: true,
          createdBy: {
            select: {
              id: true,
              name: true,
              email: true,
              role: true,
            },
          },
          items: {
            include: {
              product: true,
            },
          },
        },
      });
    });

    res.status(200).json({
      success: true,
      message: `Customer order status updated to ${status}`,
      data: updatedOrder,
    });
  } catch (error) {
    console.error(
      "Update customer order status error:",
      error
    );

    if (
      error instanceof Error &&
      error.message === "RESERVED_STOCK_MISSING"
    ) {
      res.status(409).json({
        success: false,
        message: "Reserved stock is no longer available",
      });
      return;
    }

    res.status(500).json({
      success: false,
      message: "Failed to update customer order status",
    });
  }
};
