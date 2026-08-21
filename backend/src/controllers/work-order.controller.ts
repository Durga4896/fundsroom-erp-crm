import { Response } from "express";
import prisma from "../config/prisma.js";
import { AuthenticatedRequest } from "../middleware/auth.middleware.js";

/**
 * GET /api/operations/work-orders
 * Get all work orders
 */
export const getWorkOrders = async (
  _req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const workOrders = await prisma.workOrder.findMany({
      orderBy: {
        createdAt: "desc",
      },
      include: {
        product: true,
        location: true,
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
      data: workOrders,
    });
  } catch (error) {
    console.error("Get work orders error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to fetch work orders",
    });
  }
};

/**
 * GET /api/operations/work-orders/:id
 * Get a single work order
 */
export const getWorkOrderById = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const id = Number(req.params.id);

    if (!Number.isInteger(id) || id <= 0) {
      res.status(400).json({
        success: false,
        message: "Invalid work order ID",
      });
      return;
    }

    const workOrder = await prisma.workOrder.findUnique({
      where: {
        id,
      },
      include: {
        product: true,
        location: true,
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

    if (!workOrder) {
      res.status(404).json({
        success: false,
        message: "Work order not found",
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: workOrder,
    });
  } catch (error) {
    console.error("Get work order error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to fetch work order",
    });
  }
};

/**
 * POST /api/operations/work-orders
 * Create a work order
 */
export const createWorkOrder = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const {
      productId,
      locationId,
      requiredQuantity,
    } = req.body;

    if (
      productId === undefined ||
      locationId === undefined ||
      requiredQuantity === undefined
    ) {
      res.status(400).json({
        success: false,
        message:
          "productId, locationId and requiredQuantity are required",
      });
      return;
    }

    const parsedProductId = Number(productId);
    const parsedLocationId = Number(locationId);
    const parsedQuantity = Number(requiredQuantity);

    if (
      !Number.isInteger(parsedProductId) ||
      parsedProductId <= 0
    ) {
      res.status(400).json({
        success: false,
        message: "productId must be a valid positive integer",
      });
      return;
    }

    if (
      !Number.isInteger(parsedLocationId) ||
      parsedLocationId <= 0
    ) {
      res.status(400).json({
        success: false,
        message: "locationId must be a valid positive integer",
      });
      return;
    }

    if (
      !Number.isInteger(parsedQuantity) ||
      parsedQuantity <= 0
    ) {
      res.status(400).json({
        success: false,
        message: "requiredQuantity must be a positive integer",
      });
      return;
    }

    if (!req.user) {
      res.status(401).json({
        success: false,
        message: "Authentication required",
      });
      return;
    }

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

    const workOrderNumber = `WO-${Date.now()}`;

    const workOrder = await prisma.workOrder.create({
      data: {
        workOrderNumber,
        productId: parsedProductId,
        locationId: parsedLocationId,
        requiredQuantity: parsedQuantity,
        status: "ASSIGNED",
        createdById: req.user.userId,
      },
      include: {
        product: true,
        location: true,
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
      message: "Work order created successfully",
      data: workOrder,
    });
  } catch (error) {
    console.error("Create work order error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to create work order",
    });
  }
};

/**
 * PATCH /api/operations/work-orders/:id/status
 * Update work order status
 */
export const updateWorkOrderStatus = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const id = Number(req.params.id);
    const { status } = req.body;

    if (!Number.isInteger(id) || id <= 0) {
      res.status(400).json({
        success: false,
        message: "Invalid work order ID",
      });
      return;
    }

    const allowedStatuses = [
      "ASSIGNED",
      "IN_PROGRESS",
      "COMPLETED",
    ];

    if (!allowedStatuses.includes(status)) {
      res.status(400).json({
        success: false,
        message:
          "Invalid status. Allowed values: ASSIGNED, IN_PROGRESS, COMPLETED",
      });
      return;
    }

    const existingWorkOrder = await prisma.workOrder.findUnique({
      where: {
        id,
      },
    });

    if (!existingWorkOrder) {
      res.status(404).json({
        success: false,
        message: "Work order not found",
      });
      return;
    }

    const workOrder = await prisma.workOrder.update({
      where: {
        id,
      },
      data: {
        status,
      },
      include: {
        product: true,
        location: true,
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
      message: "Work order status updated successfully",
      data: workOrder,
    });
  } catch (error) {
    console.error("Update work order status error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to update work order status",
    });
  }
};
