import type { Request, Response } from "express";
import httpStatus from "http-status-codes";

import { catchAsync } from "../../utils/catchAsync";
import { sendResponse } from "../../utils/sendResponse";
import { courierService } from "./courier.service";

const createCourier = catchAsync(async (req: Request, res: Response) => {
  const result = await courierService.createCourier(req.body);

  sendResponse(res, {
    statusCode: httpStatus.CREATED,
    message: "Courier created successfully",
    data: result,
  });
});

const assignCourier = catchAsync(async (req: Request, res: Response) => {
  const adminId = req.user!.id;

  const result = await courierService.assignCourier(adminId, req.body);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    message: "Courier assigned successfully",
    data: result,
  });
});

export const courierController = {
  createCourier,
  assignCourier,
};
