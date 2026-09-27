import { z } from "zod";

const reassignCourierValidation = z.object({
  courierId: z.string().uuid("Invalid courier ID"),
});

const adminUserQueryValidation = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10),

  role: z.enum(["CUSTOMER", "COURIER", "ADMIN"]).optional(),

  status: z.enum(["ACTIVE", "INACTIVE", "BLOCKED", "DELETED"]).optional(),

  q: z.string().trim().optional(),

  sortOrder: z.enum(["asc", "desc"]).default("desc"),
});

const createAdminValidation = z.object({
  name: z.string().min(2, "Admin name must be at least 2 characters"),
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
});

const updateUserRoleValidation = z.object({
  role: z.enum(["CUSTOMER", "COURIER", "ADMIN"]),
  phone: z.string().min(7, "Invalid phone number").optional(),
});

const updateUserStatusValidation = z.object({
  status: z.enum(["ACTIVE", "INACTIVE", "BLOCKED", "DELETED"]),
});

const auditLogQueryValidation = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10),
  action: z.string().trim().optional(),
  entityType: z.string().trim().optional(),
  userId: z.string().uuid("Invalid user ID").optional(),
  q: z.string().trim().optional(),
  sortOrder: z.enum(["asc", "desc"]).default("desc"),
});

const shipmentReportQueryValidation = z.object({
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

  originZoneId: z.string().uuid("Invalid origin zone ID").optional(),

  destinationZoneId: z.string().uuid("Invalid destination zone ID").optional(),

  q: z.string().trim().optional(),

  sortBy: z
    .enum(["createdAt", "deliveryCharge", "weight"])
    .default("createdAt"),

  sortOrder: z.enum(["asc", "desc"]).default("desc"),
});

export const adminValidation = {
  reassignCourierValidation,
  createAdminValidation,
  adminUserQueryValidation,
  updateUserRoleValidation,
  updateUserStatusValidation,
  auditLogQueryValidation,
  shipmentReportQueryValidation,
};
