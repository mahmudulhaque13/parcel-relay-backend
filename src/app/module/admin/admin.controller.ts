import type { Request, Response } from "express";
import httpStatus from "http-status-codes";

import { catchAsync } from "../../utils/catchAsync";
import { sendResponse } from "../../utils/sendResponse";
import { adminService } from "./admin.service";
import { adminValidation } from "./admin.validation";

const reassignCourier = catchAsync(async (req: Request, res: Response) => {
  const adminId = req.user!.id;
  const { id: shipmentId } = req.params;

  const payload = adminValidation.reassignCourierValidation.parse(req.body);

  const result = await adminService.reassignCourier(
    adminId,
    shipmentId,
    payload,
  );

  sendResponse(res, {
    statusCode: httpStatus.OK,
    message: "Courier reassigned successfully",
    data: result,
  });
});

export const adminController = {
  reassignCourier,
};
