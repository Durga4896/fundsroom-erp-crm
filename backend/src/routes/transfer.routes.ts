import { Router } from "express";
import {
  authenticate,
  authorize,
} from "../middleware/auth.middleware.js";
import {
  getTransfers,
  getTransferById,
  createTransfer,
  updateTransferStatus,
} from "../controllers/transfer.controller.js";

const router = Router();

router.use(authenticate);
router.use(authorize("ADMIN", "OPERATIONS"));

router.get("/", getTransfers);
router.get("/:id", getTransferById);
router.post("/", createTransfer);
router.patch("/:id/status", updateTransferStatus);

export default router;
