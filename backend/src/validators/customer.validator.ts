import { z } from "zod";

export const createCustomerSchema = z.object({
  customerName: z
    .string()
    .trim()
    .min(2, "Customer name must be at least 2 characters"),

  mobile: z
    .string()
    .trim()
    .min(10, "Mobile number must be at least 10 digits"),

  email: z
    .string()
    .trim()
    .email("Invalid email address")
    .optional()
    .or(z.literal("")),

  businessName: z
    .string()
    .trim()
    .min(2, "Business name is required"),

  gstNumber: z
    .string()
    .trim()
    .optional()
    .or(z.literal("")),

  customerType: z.enum([
    "RETAIL",
    "WHOLESALE",
    "DISTRIBUTOR",
  ]),

  address: z
    .string()
    .trim()
    .min(5, "Address is required"),

  status: z
    .enum(["LEAD", "ACTIVE", "INACTIVE"])
    .optional(),

  followUpDate: z
    .string()
    .datetime()
    .optional()
    .nullable(),

  notes: z
    .string()
    .trim()
    .optional()
    .or(z.literal("")),
});

export const updateCustomerSchema =
  createCustomerSchema.partial();

export const followUpSchema = z.object({
  note: z
    .string()
    .trim()
    .min(1, "Follow-up note is required"),

  followUpDate: z
    .string()
    .datetime()
    .optional()
    .nullable(),
});