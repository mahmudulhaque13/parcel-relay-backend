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

export const adminRoutes = router;
