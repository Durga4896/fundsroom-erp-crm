import { Router } from "express";
import {
  createCustomer,
  getCustomers,
  getCustomerById,
  updateCustomer,
  deleteCustomer,
  addFollowUp,
  getFollowUps,
} from "../controllers/customer.controller.js";
import {
  authenticate,
  authorize,
} from "../middleware/auth.middleware.js";

const router = Router();

router.use(authenticate);

// Customer management
router.post(
  "/",
  authorize("ADMIN", "SALES"),
  createCustomer
);

router.get(
  "/",
  authorize("ADMIN", "SALES", "ACCOUNTS"),
  getCustomers
);

router.get(
  "/:id",
  authorize("ADMIN", "SALES", "ACCOUNTS"),
  getCustomerById
);

router.put(
  "/:id",
  authorize("ADMIN", "SALES"),
  updateCustomer
);

router.delete(
  "/:id",
  authorize("ADMIN"),
  deleteCustomer
);

// Follow-ups
router.post(
  "/:id/follow-ups",
  authorize("ADMIN", "SALES"),
  addFollowUp
);

router.get(
  "/:id/follow-ups",
  authorize("ADMIN", "SALES", "ACCOUNTS"),
  getFollowUps
);

export default router;