import { Router } from "express";
import {
  authenticate,
  authorize,
} from "../middleware/auth.middleware.js";
import {
  getCustomerOrders,
  getCustomerOrderById,
  createCustomerOrder,
  updateCustomerOrderStatus,
} from "../controllers/customer-order.controller.js";

const router = Router();

// All routes require authentication
router.use(authenticate);

// GET — all roles can view orders
router.get("/", authorize("ADMIN", "OPERATIONS", "SALES"), getCustomerOrders);
router.get("/:id", authorize("ADMIN", "OPERATIONS", "SALES"), getCustomerOrderById);

// POST — Sales + Operations + Admin can create customer orders (spec: "Sales User can create orders")
router.post("/", authorize("ADMIN", "OPERATIONS", "SALES"), createCustomerOrder);

// PATCH — Operations + Admin manage order status (complete / cancel)
router.patch("/:id/status", authorize("ADMIN", "OPERATIONS"), updateCustomerOrderStatus);

export default router;
