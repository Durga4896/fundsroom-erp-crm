import { Router } from "express";
import {
  createProduct,
  getProducts,
  getProductById,
  updateProduct,
  addStockMovement,
  getStockMovements,
} from "../controllers/product.controller.js";

import {
  authenticate,
  authorize,
} from "../middleware/auth.middleware.js";

const router = Router();

router.use(authenticate);

// Product management
router.post(
  "/",
  authorize("ADMIN", "OPERATIONS"),
  createProduct
);

router.get(
  "/",
  authorize("ADMIN", "OPERATIONS", "SALES"),
  getProducts
);

router.get(
  "/:id",
  authorize("ADMIN", "OPERATIONS", "SALES"),
  getProductById
);

router.put(
  "/:id",
  authorize("ADMIN", "OPERATIONS"),
  updateProduct
);

// Stock management
router.post(
  "/:id/stock",
  authorize("ADMIN", "OPERATIONS"),
  addStockMovement
);

router.get(
  "/:id/stock",
  authorize("ADMIN", "OPERATIONS", "SALES"),
  getStockMovements
);

export default router;
