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
  authorize("ADMIN", "WAREHOUSE"),
  createProduct
);

router.get(
  "/",
  authorize("ADMIN", "SALES", "WAREHOUSE", "ACCOUNTS"),
  getProducts
);

router.get(
  "/:id",
  authorize("ADMIN", "SALES", "WAREHOUSE", "ACCOUNTS"),
  getProductById
);

router.put(
  "/:id",
  authorize("ADMIN", "WAREHOUSE"),
  updateProduct
);

// Stock management
router.post(
  "/:id/stock",
  authorize("ADMIN", "WAREHOUSE"),
  addStockMovement
);

router.get(
  "/:id/stock",
  authorize("ADMIN", "SALES", "WAREHOUSE", "ACCOUNTS"),
  getStockMovements
);

export default router;