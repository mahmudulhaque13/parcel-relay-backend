import { z } from "zod";

const assignCourierValidation = z.object({
  shipmentId: z.string().uuid("Invalid shipment ID"),
  courierId: z.string().uuid("Invalid courier ID"),
});

const createCourierValidation = z.object({
  name: z.string().min(2, "Courier name must be at least 2 characters"),
  email: z.string().email("Invalid email"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  phone: z.string().min(7, "Invalid phone number"),
});

const courierShipmentQueryValidation = z.object({
  page: z.coerce.number().int().min(1).default(1),

  limit: z.coerce.number().int().min(1).max(100).default(10),

  status: z
    .enum([
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

  q: z.string().trim().optional(),

  sortOrder: z.enum(["asc", "desc"]).default("desc"),
});

const updateShipmentStatusValidation = z.object({
  body: z
    .object({
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
    })
    .strict(),
});

export const courierValidation = {
  assignCourierValidation,
  createCourierValidation,
  courierShipmentQueryValidation,
  updateShipmentStatusValidation,
};
