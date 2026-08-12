import { Router } from "express";

import {
  createChallan,
  getChallans,
  getChallanById,
  confirmChallan,
  cancelChallan,
} from "../controllers/challan.controller.js";

import {
  authenticate,
  authorize,
} from "../middleware/auth.middleware.js";

const router = Router();

router.use(authenticate);

// Create challan
router.post(
  "/",
  authorize("ADMIN", "SALES"),
  createChallan
);

// View challans
router.get(
  "/",
  authorize("ADMIN", "SALES", "WAREHOUSE", "ACCOUNTS"),
  getChallans
);

// View challan details
router.get(
  "/:id",
  authorize("ADMIN", "SALES", "WAREHOUSE", "ACCOUNTS"),
  getChallanById
);

// Confirm challan
router.post(
  "/:id/confirm",
  authorize("ADMIN", "SALES", "WAREHOUSE"),
  confirmChallan
);

// Cancel challan
router.post(
  "/:id/cancel",
  authorize("ADMIN", "SALES"),
  cancelChallan
);

export default router;
