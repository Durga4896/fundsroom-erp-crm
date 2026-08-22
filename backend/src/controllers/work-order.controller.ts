import { Response } from "express";
import prisma from "../config/prisma.js";
import { AuthenticatedRequest } from "../middleware/auth.middleware.js";

const WORK_ORDER_INCLUDE = {
  product: true,
  location: true,
  assignedUser: {
    select: { id: true, name: true, email: true, role: true },
  },
  createdBy: {
    select: { id: true, name: true, email: true, role: true },
  },
} as const;

/**
 * GET /api/operations/work-orders
 * Admin + Operations can list work orders.
 */
export const getWorkOrders = async (
  _req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const workOrders = await prisma.workOrder.findMany({
      orderBy: { createdAt: "desc" },
      include: WORK_ORDER_INCLUDE,
    });

    res.status(200).json({ success: true, data: workOrders });
  } catch (error) {
    console.error("Get work orders error:", error);
    res.status(500).json({ success: false, message: "Failed to fetch work orders" });
  }
};

/**
 * GET /api/operations/work-orders/:id
 */
export const getWorkOrderById = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const id = Number(req.params.id);

    if (!Number.isInteger(id) || id <= 0) {
      res.status(400).json({ success: false, message: "Invalid work order ID" });
      return;
    }

    const workOrder = await prisma.workOrder.findUnique({
      where: { id },
      include: WORK_ORDER_INCLUDE,
    });

    if (!workOrder) {
      res.status(404).json({ success: false, message: "Work order not found" });
      return;
    }

    // Calculate inventory availability for this work order
    const inventoryRecords = await prisma.inventory.findMany({
      where: {
        productId: workOrder.productId,
        locationId: workOrder.locationId,
      },
    });

    const availableQty = inventoryRecords.reduce(
      (total, inv) => total + inv.physicalQuantity - inv.reservedQuantity,
      0
    );

    const shortage = Math.max(0, workOrder.requiredQuantity - availableQty);

    res.status(200).json({
      success: true,
      data: {
        ...workOrder,
        availableInventory: availableQty,
        shortage,
      },
    });
  } catch (error) {
    console.error("Get work order error:", error);
    res.status(500).json({ success: false, message: "Failed to fetch work order" });
  }
};

/**
 * POST /api/operations/work-orders
 * Admin only — creates a work order.
 */
export const createWorkOrder = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const { productId, locationId, requiredQuantity, assignedUserId } = req.body;

    if (
      productId === undefined ||
      locationId === undefined ||
      requiredQuantity === undefined ||
      assignedUserId === undefined
    ) {
      res.status(400).json({
        success: false,
        message: "productId, locationId, requiredQuantity and assignedUserId are required",
      });
      return;
    }

    const parsedProductId = Number(productId);
    const parsedLocationId = Number(locationId);
    const parsedQuantity = Number(requiredQuantity);
    const parsedAssignedUserId = Number(assignedUserId);

    if (!Number.isInteger(parsedProductId) || parsedProductId <= 0) {
      res.status(400).json({ success: false, message: "productId must be a valid positive integer" });
      return;
    }
    if (!Number.isInteger(parsedLocationId) || parsedLocationId <= 0) {
      res.status(400).json({ success: false, message: "locationId must be a valid positive integer" });
      return;
    }
    if (!Number.isInteger(parsedQuantity) || parsedQuantity <= 0) {
      res.status(400).json({ success: false, message: "requiredQuantity must be a positive integer" });
      return;
    }
    if (!Number.isInteger(parsedAssignedUserId) || parsedAssignedUserId <= 0) {
      res.status(400).json({ success: false, message: "assignedUserId must be a valid positive integer" });
      return;
    }

    if (!req.user) {
      res.status(401).json({ success: false, message: "Authentication required" });
      return;
    }

    const [product, location, assignedUser] = await Promise.all([
      prisma.product.findUnique({ where: { id: parsedProductId } }),
      prisma.location.findUnique({ where: { id: parsedLocationId } }),
      prisma.user.findUnique({ where: { id: parsedAssignedUserId } }),
    ]);

    if (!product) {
      res.status(404).json({ success: false, message: "Product not found" });
      return;
    }
    if (!location) {
      res.status(404).json({ success: false, message: "Location not found" });
      return;
    }
    if (!assignedUser) {
      res.status(404).json({ success: false, message: "Assigned user not found" });
      return;
    }

    // Calculate available inventory and shortage
    const inventoryRecords = await prisma.inventory.findMany({
      where: { productId: parsedProductId, locationId: parsedLocationId },
    });

    const availableQty = inventoryRecords.reduce(
      (total, inv) => total + inv.physicalQuantity - inv.reservedQuantity,
      0
    );

    const workOrderNumber = `WO-${Date.now()}`;

    const workOrder = await prisma.workOrder.create({
      data: {
        workOrderNumber,
        productId: parsedProductId,
        locationId: parsedLocationId,
        requiredQuantity: parsedQuantity,
        assignedUserId: parsedAssignedUserId,
        status: "ASSIGNED",
        createdById: req.user.userId,
      },
      include: WORK_ORDER_INCLUDE,
    });

    const shortage = Math.max(0, parsedQuantity - availableQty);

    res.status(201).json({
      success: true,
      message: "Work order created successfully",
      data: {
        ...workOrder,
        availableInventory: availableQty,
        shortage,
      },
    });
  } catch (error) {
    console.error("Create work order error:", error);
    res.status(500).json({ success: false, message: "Failed to create work order" });
  }
};

/**
 * PATCH /api/operations/work-orders/:id/status
 * Admin + Operations can update status.
 */
export const updateWorkOrderStatus = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const id = Number(req.params.id);
    const { status } = req.body;

    if (!Number.isInteger(id) || id <= 0) {
      res.status(400).json({ success: false, message: "Invalid work order ID" });
      return;
    }

    const allowedStatuses = ["ASSIGNED", "IN_PROGRESS", "COMPLETED"];

    if (!allowedStatuses.includes(status)) {
      res.status(400).json({
        success: false,
        message: "Invalid status. Allowed values: ASSIGNED, IN_PROGRESS, COMPLETED",
      });
      return;
    }

    const existingWorkOrder = await prisma.workOrder.findUnique({ where: { id } });

    if (!existingWorkOrder) {
      res.status(404).json({ success: false, message: "Work order not found" });
      return;
    }

    const workOrder = await prisma.workOrder.update({
      where: { id },
      data: { status },
      include: WORK_ORDER_INCLUDE,
    });

    res.status(200).json({
      success: true,
      message: "Work order status updated successfully",
      data: workOrder,
    });
  } catch (error) {
    console.error("Update work order status error:", error);
    res.status(500).json({ success: false, message: "Failed to update work order status" });
  }
};
