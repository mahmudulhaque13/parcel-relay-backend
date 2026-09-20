import { z } from "zod";

const createHubValidation = z.object({
  name: z.string().min(2, "Hub name must be at least 2 characters"),
  code: z.string().min(2, "Hub code must be at least 2 characters"),
  address: z.string().min(5, "Hub address must be at least 5 characters"),
  zoneId: z.string().uuid("Invalid zone ID"),
});

const updateHubValidation = z.object({
  name: z.string().min(2, "Hub name must be at least 2 characters").optional(),

  code: z.string().min(2, "Hub code must be at least 2 characters").optional(),

  address: z
    .string()
    .min(5, "Hub address must be at least 5 characters")
    .optional(),

  zoneId: z.string().uuid("Invalid zone ID").optional(),
});

export const hubValidation = {
  createHubValidation,
  updateHubValidation,
};
