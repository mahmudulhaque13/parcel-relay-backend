import { z } from "zod";

const createZoneValidation = z.object({
  name: z.string().min(2, "Zone name must be at least 2 characters"),
  code: z.string().min(2, "Zone code must be at least 2 characters"),
  description: z.string().optional(),
});

export const zoneValidation = {
  createZoneValidation,
};
