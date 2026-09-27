import { z } from "zod";

const assignCourierValidation = z.object({
  shipmentId: z.string().uuid("Invalid shipment ID"),
  courierId: z.string().uuid("Invalid courier ID"),
});

const createCourierValidation = z.object({
  name: z.string().min(2, "Courier name must be at least 2 characters"),
  email: z.string().email("Invalid email"),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
    .regex(/[a-z]/, "Password must contain at least one lowercase letter")
    .regex(/[0-9]/, "Password must contain at least one number")
    .regex(
      /[^A-Za-z0-9]/,
      "Password must contain at least one special character",
    )
    .refine((value) => !/\s/.test(value), {
      message: "Password must not contain whitespace",
    }),
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

const updateShipmentStatusValidation = z
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
  .strict();

const verifyCourierEmailValidation = z.object({
  email: z.string().email("Invalid email address"),
  otp: z.string().regex(/^\d{6}$/, "OTP must be 6 digits"),
});

const reviewCourierApplicationValidation = z
  .object({
    action: z.enum(["APPROVE", "REJECT"]),
  })
  .strict();

export const courierValidation = {
  assignCourierValidation,
  createCourierValidation,
  courierShipmentQueryValidation,
  updateShipmentStatusValidation,
  verifyCourierEmailValidation,
  reviewCourierApplicationValidation,
};
