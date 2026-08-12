import { z } from "zod";

export const createChallanSchema = z.object({
  customerId: z.number().int().positive(),

  items: z
    .array(
      z.object({
        productId: z.number().int().positive(),
        quantity: z.number().int().positive(),
      })
    )
    .min(1, "At least one product is required"),
});

export type CreateChallanInput = z.infer<typeof createChallanSchema>;