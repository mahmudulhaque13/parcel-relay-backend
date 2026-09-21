import { Router } from "express";

import { UserRole } from "../../../generated/prisma/enums";

import { auth } from "../../middleware/checkAuth";

import { validateRequest } from "../../middleware/validateRequest";

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

router.post(
  "/google",
  validateRequest(authValidation.googleLoginValidation),
  authController.googleLogin,
);

router.post("/refresh-token", authController.refreshToken);

router.post("/logout", authController.logoutUser);

router.get("/me", auth(), authController.getMe);

router.get("/admin-test", auth(UserRole.ADMIN), authController.adminTest);

export const authRoutes = router;
