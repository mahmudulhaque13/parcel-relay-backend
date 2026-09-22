import { Router } from "express";

import { UserRole } from "../../../generated/prisma/enums";
import { auth } from "../../middleware/checkAuth";
import { validateRequest } from "../../middleware/validateRequest";
import { adminController } from "./admin.controller";
import { adminValidation } from "./admin.validation";

const router = Router();

router.post(
  "/shipments/:id/reassign",
  auth(UserRole.ADMIN),
  validateRequest(adminValidation.reassignCourierValidation),
  adminController.reassignCourier,
);

router.get("/users", auth(UserRole.ADMIN), adminController.getAdminUsers);

router.get(
  "/users/:id",
  auth(UserRole.ADMIN),
  adminController.getAdminUserById,
);

router.patch(
  "/users/:id/role",
  auth(UserRole.ADMIN),
  validateRequest(adminValidation.updateUserRoleValidation),
  adminController.updateUserRole,
);

router.patch(
  "/users/:id/status",
  auth(UserRole.ADMIN),
  validateRequest(adminValidation.updateUserStatusValidation),
  adminController.updateUserStatus,
);

router.get("/audit-logs", auth(UserRole.ADMIN), adminController.getAuditLogs);

export const adminRoutes = router;
