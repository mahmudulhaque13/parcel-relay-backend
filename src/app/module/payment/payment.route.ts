import express from "express";

import { paymentController } from "./payment.controller";

import { paymentValidation } from "./payment.validation";

import { validateRequest } from "../../middleware/validateRequest";

import { auth } from "../../middleware/checkAuth";

import { UserRole } from "../../../generated/prisma/client";

const router = express.Router();

router.post(
  "/initiate",
  auth(UserRole.CUSTOMER),
  validateRequest(paymentValidation.initiatePaymentValidation),
  paymentController.initiatePayment,
);

router.get("/success", paymentController.paymentSuccess);

router.post(
  "/refund",
  auth(UserRole.ADMIN),
  validateRequest(paymentValidation.refundPaymentValidation),
  paymentController.refundPayment,
);

router.get("/cancel", paymentController.paymentCancel);

router.get(
  "/:shipmentId",
  auth(UserRole.CUSTOMER),
  paymentController.getPaymentStatus,
);

export const paymentRoutes = router;
