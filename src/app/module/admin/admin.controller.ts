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

const getAdminUsers = catchAsync(async (req: Request, res: Response) => {
  const query = adminValidation.adminUserQueryValidation.parse(req.query);

  const result = await adminService.getAdminUsers(query);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    message: "Admin users retrieved successfully",
    data: result,
  });
});

const getAdminUserById = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;

  const result = await adminService.getAdminUserById(id);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    message: "Admin user retrieved successfully",
    data: result,
  });
});

export const adminController = {
  reassignCourier,
  getAdminUsers,
  getAdminUserById,
};
