import { Router } from "express";

import { UserRole } from "../../../generated/prisma/enums";
import { auth } from "../../middleware/checkAuth";
import { validateRequest } from "../../middleware/validateRequest";
import { hubController } from "./hub.controller";
import { hubValidation } from "./hub.validation";

const router = Router();

router.post(
  "/",
  auth(UserRole.ADMIN),
  validateRequest(hubValidation.createHubValidation),
  hubController.createHub,
);

router.get("/", auth(UserRole.ADMIN), hubController.getAllHubs);

router.patch(
  "/:id",
  auth(UserRole.ADMIN),
  validateRequest(hubValidation.updateHubValidation),
  hubController.updateHub,
);

router.patch(
  "/:id/deactivate",
  auth(UserRole.ADMIN),
  hubController.deactivateHub,
);

export const hubRoutes = router;
