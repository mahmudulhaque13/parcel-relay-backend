import { Router } from "express";

import { UserRole } from "../../../generated/prisma/enums";
import { auth } from "../../middleware/checkAuth";
import { validateRequest } from "../../middleware/validateRequest";
import { pricingController } from "./pricing.controller";
import { pricingValidation } from "./pricing.validation";

const router = Router();

router.post(
  "/",
  auth(UserRole.ADMIN),
  validateRequest(pricingValidation.createPricingRuleValidation),
  pricingController.createPricingRule,
);

router.get("/", auth(UserRole.ADMIN), pricingController.getAllPricingRules);

router.patch(
  "/:id",
  auth(UserRole.ADMIN),
  validateRequest(pricingValidation.updatePricingRuleValidation),
  pricingController.updatePricingRule,
);

router.patch(
  "/:id/deactivate",
  auth(UserRole.ADMIN),
  pricingController.deactivatePricingRule,
);

router.get("/:id", auth(UserRole.ADMIN), pricingController.getPricingRuleById);

router.delete(
  "/:id",
  auth(UserRole.ADMIN),
  pricingController.deletePricingRule,
);

export const pricingRoutes = router;
