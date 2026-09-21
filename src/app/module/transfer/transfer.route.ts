import { Router } from "express";
import { UserRole } from "../../../generated/prisma/enums";

import { auth } from "../../middleware/checkAuth";
import { validateRequest } from "../../middleware/validateRequest";
import { transferController } from "./transfer.controller";
import { transferValidation } from "./transfer.validation";

const router = Router();

router.post(
  "/",
  auth(UserRole.ADMIN),
  validateRequest(transferValidation.createTransferValidation),
  transferController.createTransfer,
);

router.patch(
  "/:id/status",
  auth(UserRole.COURIER),
  validateRequest(transferValidation.updateTransferStatusValidation),
  transferController.updateTransferStatus,
);

export const transferRoutes = router;
