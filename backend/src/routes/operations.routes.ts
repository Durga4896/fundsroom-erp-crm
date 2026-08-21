import { Router } from "express";

import {
    authenticate,
    authorize,
} from "../middleware/auth.middleware.js";

import {
    getLocations,
    createLocation,
    getInventory,
    createInventory,
    getOperationsProducts,
    getOperationsCustomers,
    createOperationsProduct,
} from "../controllers/operations.controller.js";

import {
  getOperationsDashboard,
} from "../controllers/operations-dashboard.controller.js";
const router = Router();

/**
 * All Operations APIs require authentication
 * and OPERATIONS role.
 */

router.get(
    "/locations",
    authenticate,
    authorize("OPERATIONS"),
    getLocations
);

router.post(
    "/locations",
    authenticate,
    authorize("OPERATIONS"),
    createLocation
);

router.get(
    "/inventory",
    authenticate,
    authorize("OPERATIONS"),
    getInventory
);

router.post(
    "/inventory",
    authenticate,
    authorize("OPERATIONS"),
    createInventory
);

router.get(
  "/products",
  authenticate,
  authorize("OPERATIONS"),
  getOperationsProducts
);

router.post(
  "/products",
  authenticate,
  authorize("OPERATIONS"),
  createOperationsProduct
);

router.get(
  "/customers",
  authenticate,
  authorize("OPERATIONS"),
  getOperationsCustomers
);

router.get(
  "/dashboard",
  authenticate,
  authorize("OPERATIONS"),
  getOperationsDashboard
);

export default router;