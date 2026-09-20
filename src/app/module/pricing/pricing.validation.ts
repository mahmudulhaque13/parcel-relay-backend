import { z } from "zod";

const createPricingRuleValidation = z.object({
  name: z.string().min(2, "Pricing rule name must be at least 2 characters"),

  basePrice: z.number().nonnegative("Base price cannot be negative"),

  perKgPrice: z.number().nonnegative("Per kg price cannot be negative"),

  codPercentage: z
    .number()
    .min(0, "COD percentage cannot be negative")
    .max(100, "COD percentage cannot exceed 100"),
});

const updatePricingRuleValidation = z.object({
  name: z
    .string()
    .min(2, "Pricing rule name must be at least 2 characters")
    .optional(),

  basePrice: z.number().nonnegative("Base price cannot be negative").optional(),

  perKgPrice: z
    .number()
    .nonnegative("Per kg price cannot be negative")
    .optional(),

  codPercentage: z
    .number()
    .min(0, "COD percentage cannot be negative")
    .max(100, "COD percentage cannot exceed 100")
    .optional(),
});

export const pricingValidation = {
  createPricingRuleValidation,
  updatePricingRuleValidation,
};
