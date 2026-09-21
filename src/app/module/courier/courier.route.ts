import { Router } from "express";
import { UserRole } from "../../../generated/prisma/enums";

import { auth } from "../../middleware/checkAuth";
import { validateRequest } from "../../middleware/validateRequest";
import { courierController } from "./courier.controller";
import { courierValidation } from "./courier.validation";

const router = Router();

router.post(
  "/",
  auth(UserRole.ADMIN),
  validateRequest(courierValidation.createCourierValidation),
  courierController.createCourier,
);

router.post(
  "/assign",
  auth(UserRole.ADMIN),
  validateRequest(courierValidation.assignCourierValidation),
  courierController.assignCourier,
);

export const courierRoutes = router;
