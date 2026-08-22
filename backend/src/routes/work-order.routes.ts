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

// All routes require authentication
router.use(authenticate);

// GET — Admin and Operations can view work orders
router.get("/", authorize("ADMIN", "OPERATIONS"), getWorkOrders);
router.get("/:id", authorize("ADMIN", "OPERATIONS"), getWorkOrderById);

// POST — Only Admin can create work orders (spec: "Admin can create Work Orders")
router.post("/", authorize("ADMIN"), createWorkOrder);

// PATCH — Admin and Operations can update status
router.patch("/:id/status", authorize("ADMIN", "OPERATIONS"), updateWorkOrderStatus);

export default router;
