import { Router } from "express";
import {
  authenticate,
  authorize,
} from "../middleware/auth.middleware.js";

import {
  getLocations,
  getLocationById,
  createLocation,
  updateLocation,
} from "../controllers/location.controller.js";

const router = Router();

router.get(
  "/",
  authenticate,
  authorize("ADMIN", "OPERATIONS", "SALES"),
  getLocations
);

router.get(
  "/:id",
  authenticate,
  authorize("ADMIN", "OPERATIONS", "SALES"),
  getLocationById
);

router.post(
  "/",
  authenticate,
  authorize("ADMIN", "OPERATIONS"),
  createLocation
);

router.put(
  "/:id",
  authenticate,
  authorize("ADMIN", "OPERATIONS"),
  updateLocation
);

export default router;