import { Router } from "express";

import { auth } from "../../middleware/checkAuth";
import { validateRequest } from "../../middleware/validateRequest";
import { shipmentController } from "./shipment.controller";
import { shipmentValidation } from "./shipment.validation";
import { UserRole } from "../../../generated/prisma/enums";

const router = Router();

router.post(
  "/",
  auth(),
  validateRequest(shipmentValidation.createShipmentValidation),
  shipmentController.createShipment,
);

router.get("/my", auth(UserRole.CUSTOMER), shipmentController.getMyShipments);

router.get("/:id", auth(UserRole.CUSTOMER), shipmentController.getShipmentById);

export const shipmentRoutes = router;
