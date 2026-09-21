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

const shipmentQuoteValidation = z.object({
  originZoneId: z.string().uuid("Invalid origin zone ID"),

  destinationZoneId: z.string().uuid("Invalid destination zone ID"),

  weight: z.number().positive("Weight must be greater than 0"),

  codAmount: z.number().nonnegative("COD amount cannot be negative"),
});

const updateShipmentStatusValidation = z.object({
  status: z.enum([
    "PENDING_PAYMENT",
    "READY_FOR_ASSIGNMENT",
    "ASSIGNED",
    "PICKUP_SCHEDULED",
    "PICKED_UP",
    "AT_ORIGIN_HUB",
    "IN_TRANSIT",
    "AT_DESTINATION_HUB",
    "OUT_FOR_DELIVERY",
    "DELIVERY_FAILED",
    "RETURN_INITIATED",
    "RETURN_IN_TRANSIT",
    "DELIVERED",
    "RETURNED_TO_SENDER",
    "CANCELLED",
  ]),

  note: z.string().max(500).optional(),

  location: z.string().max(200).optional(),
});

const updateShipmentValidation = z.object({
  recipientName: z
    .string()
    .min(2, "Recipient name must be at least 2 characters")
    .optional(),

  recipientPhone: z
    .string()
    .min(7, "Invalid recipient phone number")
    .optional(),

  deliveryAddress: z
    .string()
    .min(5, "Delivery address must be at least 5 characters")
    .optional(),

  packageDescription: z
    .string()
    .min(2, "Package description must be at least 2 characters")
    .optional(),

  weight: z.number().positive("Weight must be greater than 0").optional(),

  codAmount: z.number().nonnegative("COD amount cannot be negative").optional(),
});

export const shipmentValidation = {
  createShipmentValidation,
  shipmentQuoteValidation,
  updateShipmentStatusValidation,
  updateShipmentValidation,
};
