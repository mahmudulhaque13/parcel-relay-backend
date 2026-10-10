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

  weight: z
    .number()
    .finite("Weight must be a finite number")
    .positive("Weight must be greater than 0")
    .max(1000, "Weight cannot exceed 1000 kg"),

  codAmount: z
    .number()
    .finite("COD amount must be a finite number")
    .nonnegative("COD amount cannot be negative")
    .max(10000000, "COD amount exceeds the maximum allowed"),
});

const shipmentQuoteValidation = z.object({
  originZoneId: z.string().uuid("Invalid origin zone ID"),

  destinationZoneId: z.string().uuid("Invalid destination zone ID"),

  weight: z
    .number()
    .finite("Weight must be a finite number")
    .positive("Weight must be greater than 0")
    .max(1000, "Weight cannot exceed 1000 kg"),

  codAmount: z
    .number()
    .finite("COD amount must be a finite number")
    .nonnegative("COD amount cannot be negative")
    .max(10000000, "COD amount exceeds the maximum allowed"),
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

  weight: z
    .number()
    .finite("Weight must be a finite number")
    .positive("Weight must be greater than 0")
    .max(1000, "Weight cannot exceed 1000 kg")
    .optional(),

  codAmount: z
    .number()
    .finite("COD amount must be a finite number")
    .nonnegative("COD amount cannot be negative")
    .max(10000000, "COD amount exceeds the maximum allowed")
    .optional(),
});

const shipmentQueryValidation = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10),
  status: z
    .enum([
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
    ])
    .optional(),
  q: z.string().trim().max(100, "Search query is too long").optional(),
  sortBy: z
    .enum(["createdAt", "updatedAt", "deliveryCharge"])
    .default("createdAt"),
  sortOrder: z.enum(["asc", "desc"]).default("desc"),
});

export const shipmentValidation = {
  createShipmentValidation,
  shipmentQuoteValidation,
  updateShipmentStatusValidation,
  updateShipmentValidation,
  shipmentQueryValidation,
};
