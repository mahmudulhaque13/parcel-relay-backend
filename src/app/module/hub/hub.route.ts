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

// Admin: get all non-deleted hubs, including inactive hubs
router.get("/admin/all", auth(UserRole.ADMIN), hubController.getAllHubs);

// Get all hubs (existing endpoint)
router.get("/", auth(UserRole.ADMIN), hubController.getAllHubs);

// Update hub
router.patch(
  "/:id",
  auth(UserRole.ADMIN),
  validateRequest(hubValidation.updateHubValidation),
  hubController.updateHub,
);

// Deactivate hub
router.patch(
  "/:id/deactivate",
  auth(UserRole.ADMIN),
  hubController.deactivateHub,
);

// Activate hub
router.patch("/:id/activate", auth(UserRole.ADMIN), hubController.activateHub);

// Get hub by ID
router.get("/:id", auth(UserRole.ADMIN), hubController.getHubById);

// Delete hub
router.delete("/:id", auth(UserRole.ADMIN), hubController.deleteHub);

export const hubRoutes = router;
