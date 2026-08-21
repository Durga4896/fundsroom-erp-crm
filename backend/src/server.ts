import express from "express";
import cors from "cors";
import dotenv from "dotenv";

import authRoutes from "./routes/auth.routes.js";
import customerRoutes from "./routes/customer.routes.js";
import productRoutes from "./routes/product.routes.js";
import challanRoutes from "./routes/challan.routes.js";
import operationsRoutes from "./routes/operations.routes.js";
import locationRoutes from "./routes/location.routes.js";
import inventoryRoutes from "./routes/inventory.routes.js";
import workOrderRoutes from "./routes/work-order.routes.js";
import transferRoutes from "./routes/transfer.routes.js";
import customerOrderRoutes from "./routes/customer-order.routes.js";


import {
  authenticate,
  authorize,
  AuthenticatedRequest,
} from "./middleware/auth.middleware.js";

dotenv.config();

const app = express();

app.use(
  cors({
    origin:
      process.env.CLIENT_URL ||
      "http://localhost:5173",
  })
);

app.use(express.json());

app.get("/api/health", (_req, res) => {
  res.status(200).json({
    success: true,
    message: "Fundsroom ERP CRM API is running",
  });
});

app.use("/api/auth", authRoutes);

app.get(
  "/api/auth/me",
  authenticate,
  (req: AuthenticatedRequest, res) => {
    res.status(200).json({
      success: true,
      user: req.user,
    });
  }
);

app.get(
  "/api/auth/admin-test",
  authenticate,
  authorize("ADMIN"),
  (_req, res) => {
    res.status(200).json({
      success: true,
      message: "Admin access granted",
    });
  }
);

app.use("/api/customers", customerRoutes);

app.use("/api/products", productRoutes);


app.use("/api/challans", challanRoutes);

app.use("/api/operations", operationsRoutes);

app.use("/api/locations", locationRoutes);
app.use("/api/inventory", inventoryRoutes);
app.use("/api/operations/work-orders", workOrderRoutes);
app.use("/api/operations/transfers", transferRoutes);
app.use("/api/operations/customer-orders", customerOrderRoutes);

const PORT = Number(process.env.PORT) || 5001;

app.listen(PORT, "0.0.0.0", () => {
  console.log(
    `Server running on port ${PORT}`
  );
});