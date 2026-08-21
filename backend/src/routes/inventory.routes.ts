import { Router } from "express";
import {
  authenticate,
  authorize,
} from "../middleware/auth.middleware.js";

import {
  getInventory,
  getInventoryById,
  createInventory,
  adjustInventory,
} from "../controllers/inventory.controller.js";

const router = Router();

router.get(
  "/",
  authenticate,
  authorize("ADMIN", "OPERATIONS", "SALES"),
  getInventory
);

router.get(
  "/:id",
  authenticate,
  authorize("ADMIN", "OPERATIONS", "SALES"),
  getInventoryById
);

router.post(
  "/",
  authenticate,
  authorize("ADMIN", "OPERATIONS"),
  createInventory
);

router.patch(
  "/:id/adjust",
  authenticate,
  authorize("ADMIN", "OPERATIONS"),
  adjustInventory
);

export default router;