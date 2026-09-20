import type { Request, Response } from "express";
import httpStatus from "http-status-codes";

import { catchAsync } from "../../utils/catchAsync";
import { sendResponse } from "../../utils/sendResponse";
import { zoneService } from "./zone.service";

const createZone = catchAsync(async (req: Request, res: Response) => {
  const result = await zoneService.createZone(req.body);

  sendResponse(res, {
    statusCode: httpStatus.CREATED,
    message: "Zone created successfully",
    data: result,
  });
});

const getAllZones = catchAsync(async (_req: Request, res: Response) => {
  const result = await zoneService.getAllZones();

  sendResponse(res, {
    statusCode: httpStatus.OK,
    message: "Zones retrieved successfully",
    data: result,
  });
});

export const zoneController = {
  createZone,
  getAllZones,
};
