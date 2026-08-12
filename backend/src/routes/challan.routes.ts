import { Router } from "express";

import {
  createChallan,
  getChallans,
  getChallanById,
  confirmChallan,
  cancelChallan,
} from "../controllers/challan.controller.js";

import { authenticate } from "../middleware/auth.middleware.js";

const router = Router();

router.use(authenticate);

router.post("/", createChallan);

router.get("/", getChallans);

router.get("/:id", getChallanById);

router.post("/:id/confirm", confirmChallan);

router.post("/:id/cancel", cancelChallan);

export default router;