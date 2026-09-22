import { Router } from "express";

import { UserRole } from "../../../generated/prisma/enums";

import { auth } from "../../middleware/checkAuth";

import { userController } from "./user.controller";

import { userValidation } from "./user.validation";

import { validateRequest } from "../../middleware/validateRequest";

const router = Router();

router.get(
  "/me",
  auth(UserRole.CUSTOMER, UserRole.COURIER, UserRole.ADMIN),
  userController.getMyProfile,
);

router.get("/", auth(UserRole.ADMIN), userController.getAllUsers);

router.patch(
  "/me",
  auth(UserRole.CUSTOMER, UserRole.COURIER, UserRole.ADMIN),
  validateRequest(userValidation.updateMyProfileValidation),
  userController.updateMyProfile,
);

export const userRoutes = router;
