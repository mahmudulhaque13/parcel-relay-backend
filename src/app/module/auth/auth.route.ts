import { Router } from "express";

import { validateRequest } from "../../middleware/validateRequest";
import { auth } from "../../middleware/checkAuth";
import { UserRole } from "../../../generated/prisma/enums";
import { authController } from "./auth.controller";
import { authValidation } from "./auth.validation";

const router = Router();

router.post(
  "/register",
  validateRequest(authValidation.registerValidation),
  authController.registerUser,
);

router.post(
  "/login",
  validateRequest(authValidation.loginValidation),
  authController.loginUser,
);

router.get("/me", auth(), authController.getMe);

router.get("/admin-test", auth(UserRole.ADMIN), authController.adminTest);

export const authRoutes = router;
