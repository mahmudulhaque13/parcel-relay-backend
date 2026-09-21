import type { Request, Response } from "express";
import httpStatus from "http-status-codes";

import { catchAsync } from "../../utils/catchAsync";
import { sendResponse } from "../../utils/sendResponse";
import { trackingService } from "./tracking.service";

const getTrackingInfo = catchAsync(async (req: Request, res: Response) => {
  const { trackingNumber } = req.params;

  const result = await trackingService.getTrackingInfo(trackingNumber);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    message: "Tracking information retrieved successfully",
    data: result,
  });
});

export const trackingController = {
  getTrackingInfo,
};
