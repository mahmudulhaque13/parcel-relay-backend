import { z } from "zod";

const createShipmentValidation = z.object({
  originZoneId: z.string().uuid("Invalid origin zone ID"),

  destinationZoneId: z.string().uuid("Invalid destination zone ID"),

  recipientName: z
    .string()
    .min(2, "Recipient name must be at least 2 characters"),

  recipientPhone: z.string().min(7, "Invalid recipient phone number"),

  deliveryAddress: z
    .string()
    .min(5, "Delivery address must be at least 5 characters"),

  packageDescription: z
    .string()
    .min(2, "Package description must be at least 2 characters"),

  weight: z.number().positive("Weight must be greater than 0"),

  codAmount: z.number().nonnegative("COD amount cannot be negative"),
});

export const shipmentValidation = {
  createShipmentValidation,
};
