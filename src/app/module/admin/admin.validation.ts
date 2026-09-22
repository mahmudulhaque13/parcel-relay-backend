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

export const adminValidation = {
  reassignCourierValidation,
  adminUserQueryValidation,
  updateUserRoleValidation,
  updateUserStatusValidation,
  auditLogQueryValidation,
};
