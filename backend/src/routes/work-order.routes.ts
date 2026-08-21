import { Router } from "express";

import {
  authenticate,
  authorize,
} from "../middleware/auth.middleware.js";

import {
  getWorkOrders,
  getWorkOrderById,
  createWorkOrder,
  updateWorkOrderStatus,
} from "../controllers/work-order.controller.js";

const router = Router();

/**
 * All Work Order APIs require authentication
 * and OPERATIONS role.
 */

router.use(authenticate);
router.use(authorize("OPERATIONS"));

router.get("/", getWorkOrders);

router.get("/:id", getWorkOrderById);

router.post("/", createWorkOrder);

router.patch("/:id/status", updateWorkOrderStatus);

export default router;
