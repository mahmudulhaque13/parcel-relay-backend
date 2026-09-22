import { Router } from "express";

import { UserRole } from "../../../generated/prisma/enums";

import { auth } from "../../middleware/checkAuth";

import { validateRequest } from "../../middleware/validateRequest";

import { shipmentController } from "../shipment/shipment.controller";

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

router.patch(
  "/shipments/:id/status",
  auth(UserRole.COURIER),
  validateRequest(courierValidation.updateShipmentStatusValidation),
  shipmentController.updateShipmentStatus,
);

router.get(
  "/shipments/:id",
  auth(UserRole.COURIER),
  courierController.getCourierShipmentById,
);

router.get(
  "/shipments",
  auth(UserRole.COURIER),
  courierController.getCourierShipments,
);

export const courierRoutes = router;
