import { z } from "zod";

export const createProductSchema = z.object({
  name: z.string().trim().min(2, "Product name is required"),

  sku: z.string().trim().min(1, "SKU is required"),

  category: z.string().trim().min(2, "Category is required"),

  unitPrice: z
    .number()
    .positive("Unit price must be greater than 0"),

  currentStock: z
    .number()
    .int()
    .min(0, "Stock cannot be negative")
    .optional(),

  minimumStock: z
    .number()
    .int()
    .min(0, "Minimum stock cannot be negative"),

  warehouseLocation: z
    .string()
    .trim()
    .min(1, "Warehouse location is required"),
});

export const updateProductSchema =
  createProductSchema.partial();

export const stockMovementSchema = z.object({
  quantity: z
    .number()
    .int()
    .positive("Quantity must be greater than 0"),

  movementType: z.enum(["IN", "OUT"]),

  reason: z
    .string()
    .trim()
    .min(2, "Reason is required"),
});