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
  "/verify-email",
  validateRequest(authValidation.verifyEmailValidation),
  authController.verifyEmail,
);

router.post(
  "/resend-verification",
  validateRequest(authValidation.resendVerificationValidation),
  authController.resendVerification,
);

router.post(
  "/forgot-password",
  validateRequest(authValidation.forgotPasswordValidation),
  authController.forgotPassword,
);

router.post(
  "/reset-password",
  validateRequest(authValidation.resetPasswordValidation),
  authController.resetPassword,
);

router.post(
  "/login",
  validateRequest(authValidation.loginValidation),
  authController.loginUser,
);

router.post(
  "/demo-login",
  validateRequest(authValidation.demoLoginValidation),
  authController.demoLogin,
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
