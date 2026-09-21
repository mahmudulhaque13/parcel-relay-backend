import { z } from "zod";

const createPickupValidation = z.object({
  shipmentId: z.string().uuid("Invalid shipment ID"),
  pickupDate: z.string().min(1, "Pickup date is required"),
  notes: z.string().max(500, "Notes cannot exceed 500 characters").optional(),
});

const updatePickupStatusValidation = z.object({
  status: z.enum(["SCHEDULED", "PICKED_UP", "FAILED", "CANCELLED"]),
  notes: z.string().max(500, "Notes cannot exceed 500 characters").optional(),
});

export const pickupValidation = {
  createPickupValidation,
  updatePickupStatusValidation,
};
