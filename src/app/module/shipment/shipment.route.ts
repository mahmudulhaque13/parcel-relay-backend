import { Router } from "express";

import { UserRole } from "../../../generated/prisma/enums";

import { auth } from "../../middleware/checkAuth";

import { validateRequest } from "../../middleware/validateRequest";

import { shipmentController } from "./shipment.controller";

import { shipmentValidation } from "./shipment.validation";

const router = Router();

router.post(
  "/quote",
  auth(UserRole.CUSTOMER),
  validateRequest(shipmentValidation.shipmentQuoteValidation),
  shipmentController.getShipmentQuote,
);

router.post(
  "/",
  auth(),
  validateRequest(shipmentValidation.createShipmentValidation),
  shipmentController.createShipment,
);

router.get("/", auth(UserRole.CUSTOMER), shipmentController.getMyShipments);

router.get(
  "/:id/timeline",
  auth(UserRole.CUSTOMER),
  shipmentController.getShipmentTimeline,
);

router.get(
  "/:id",
  auth(UserRole.CUSTOMER, UserRole.COURIER, UserRole.ADMIN),
  shipmentController.getShipmentById,
);

router.patch(
  "/:id",
  auth(UserRole.CUSTOMER),
  validateRequest(shipmentValidation.updateShipmentValidation),
  shipmentController.updateShipment,
);

router.patch(
  "/:id/cancel",
  auth(UserRole.CUSTOMER),
  shipmentController.cancelShipment,
);

router.delete(
  "/:id",
  auth(UserRole.CUSTOMER),
  shipmentController.deleteShipment,
);

// Shipment status transition
router.patch(
  "/:id/status",
  auth(UserRole.CUSTOMER, UserRole.COURIER, UserRole.ADMIN),
  validateRequest(shipmentValidation.updateShipmentStatusValidation),
  shipmentController.updateShipmentStatus,
);

export const shipmentRoutes = router;
