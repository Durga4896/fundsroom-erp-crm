import { Response } from "express";
import prisma from "../config/prisma.js";
import { AuthenticatedRequest } from "../middleware/auth.middleware.js";

export const getOperationsDashboard = async (
  _req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const [
      inventory,
      products,
      customers,
      workOrders,
      transfers,
      customerOrders,
      stockIn,
      stockOut,
    ] = await Promise.all([
      prisma.inventory.findMany({
        select: {
          productId: true,
          physicalQuantity: true,
          reservedQuantity: true,
        },
      }),

      prisma.product.findMany({
        select: {
          id: true,
          name: true,
          sku: true,
          minimumStock: true,
        },
        orderBy: {
          name: "asc",
        },
      }),

      prisma.customer.groupBy({
        by: ["status"],
        _count: {
          _all: true,
        },
      }),

      prisma.workOrder.groupBy({
        by: ["status"],
        _count: {
          _all: true,
        },
      }),

      prisma.transfer.groupBy({
        by: ["status"],
        _count: {
          _all: true,
        },
      }),

      prisma.customerOrder.groupBy({
        by: ["status"],
        _count: {
          _all: true,
        },
      }),

      prisma.stockMovement.aggregate({
        where: {
          movementType: "IN",
        },
        _sum: {
          quantity: true,
        },
      }),

      prisma.stockMovement.aggregate({
        where: {
          movementType: "OUT",
        },
        _sum: {
          quantity: true,
        },
      }),
    ]);

    const totalPhysicalStock = inventory.reduce(
      (sum, item) => sum + item.physicalQuantity,
      0
    );

    const totalReservedStock = inventory.reduce(
      (sum, item) => sum + item.reservedQuantity,
      0
    );

    const totalAvailableStock =
      totalPhysicalStock - totalReservedStock;

    /*
     * Inventory is the operational source of truth.
     *
     * Calculate physical and available quantity per product
     * instead of relying on Product.currentStock.
     */
    const stockByProduct = new Map<
      number,
      {
        physicalStock: number;
        reservedStock: number;
        availableStock: number;
      }
    >();

    for (const item of inventory) {
      const existing = stockByProduct.get(item.productId) ?? {
        physicalStock: 0,
        reservedStock: 0,
        availableStock: 0,
      };

      existing.physicalStock += item.physicalQuantity;
      existing.reservedStock += item.reservedQuantity;
      existing.availableStock +=
        item.physicalQuantity - item.reservedQuantity;

      stockByProduct.set(item.productId, existing);
    }

    const productStock = products.map((product) => {
      const stock = stockByProduct.get(product.id) ?? {
        physicalStock: 0,
        reservedStock: 0,
        availableStock: 0,
      };

      return {
        id: product.id,
        name: product.name,
        sku: product.sku,
        physicalStock: stock.physicalStock,
        reservedStock: stock.reservedStock,
        availableStock: stock.availableStock,
        minimumStock: product.minimumStock,
      };
    });

    const lowStockProducts = productStock.filter(
      (product) => product.availableStock <= product.minimumStock
    );

    const countByStatus = (
      rows: Array<{
        status: string;
        _count: { _all: number };
      }>
    ) =>
      Object.fromEntries(
        rows.map((row) => [row.status, row._count._all])
      );

    res.status(200).json({
      success: true,
      data: {
        inventory: {
          totalPhysicalStock,
          totalReservedStock,
          totalAvailableStock,
          lowStockCount: lowStockProducts.length,
          lowStockProducts,
          products: productStock,
        },

        customers: {
          total: customers.reduce(
            (sum, row) => sum + row._count._all,
            0
          ),
          byStatus: countByStatus(customers),
        },

        workOrders: {
          total: workOrders.reduce(
            (sum, row) => sum + row._count._all,
            0
          ),
          byStatus: countByStatus(workOrders),
        },

        transfers: {
          total: transfers.reduce(
            (sum, row) => sum + row._count._all,
            0
          ),
          byStatus: countByStatus(transfers),
        },

        customerOrders: {
          total: customerOrders.reduce(
            (sum, row) => sum + row._count._all,
            0
          ),
          byStatus: countByStatus(customerOrders),
        },

        stockMovements: {
          totalStockIn: stockIn._sum.quantity ?? 0,
          totalStockOut: stockOut._sum.quantity ?? 0,
        },
      },
    });
  } catch (error) {
    console.error("Get operations dashboard error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to fetch operations dashboard",
    });
  }
};