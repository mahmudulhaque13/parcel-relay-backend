import type { Request, Response } from "express";
import httpStatus from "http-status-codes";

import { catchAsync } from "../../utils/catchAsync";
import { sendResponse } from "../../utils/sendResponse";
import { pickupService } from "./pickup.service";

const createPickup = catchAsync(async (req: Request, res: Response) => {
  const customerId = req.user!.id;

  const result = await pickupService.createPickup(customerId, req.body);

  sendResponse(res, {
    statusCode: httpStatus.CREATED,
    message: "Pickup request created successfully",
    data: result,
  });
});

const updatePickupStatus = catchAsync(async (req: Request, res: Response) => {
  const actorId = req.user!.id;
  const { id } = req.params;

  const result = await pickupService.updatePickupStatus(actorId, id, req.body);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    message: "Pickup status updated successfully",
    data: result,
  });
});

export const pickupController = {
  createPickup,
  updatePickupStatus,
};
