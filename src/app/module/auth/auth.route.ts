import { Router } from "express";

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

export const authRoutes = router;
