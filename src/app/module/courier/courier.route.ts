import { Router } from "express";

import { UserRole } from "../../../generated/prisma/enums";

import { auth } from "../../middleware/checkAuth";

import { validateRequest } from "../../middleware/validateRequest";

import { shipmentController } from "../shipment/shipment.controller";

import { courierController } from "./courier.controller";

import { courierValidation } from "./courier.validation";

import { upload } from "../../middleware/upload";

const router = Router();

router.post(
  "/apply",
  upload.fields([
    { name: "identityDocument", maxCount: 1 },
    { name: "profilePhoto", maxCount: 1 },
  ]),
  validateRequest(courierValidation.createCourierValidation),
  courierController.applyCourier,
);

router.post(
  "/verify-email",
  validateRequest(courierValidation.verifyCourierEmailValidation),
  courierController.verifyCourierEmail,
);

router.get(
  "/applications",
  auth(UserRole.ADMIN),
  courierController.getCourierApplications,
);

router.patch(
  "/applications/:id/review",
  auth(UserRole.ADMIN),
  validateRequest(courierValidation.reviewCourierApplicationValidation),
  courierController.reviewCourierApplication,
);

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
