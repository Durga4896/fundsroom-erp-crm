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

router.use(authenticate);
router.use(authorize("OPERATIONS"));

router.get("/", getCustomerOrders);

router.get("/:id", getCustomerOrderById);

router.post("/", createCustomerOrder);

router.patch("/:id/status", updateCustomerOrderStatus);

export default router;
