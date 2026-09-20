import type { Request, Response } from "express";
import httpStatus from "http-status-codes";

import { catchAsync } from "../../utils/catchAsync";
import { sendResponse } from "../../utils/sendResponse";
import { shipmentService } from "./shipment.service";

const createShipment = catchAsync(async (req: Request, res: Response) => {
  const result = await shipmentService.createShipment(req.user!.id, req.body);

  sendResponse(res, {
    statusCode: httpStatus.CREATED,
    message: "Shipment created successfully",
    data: result,
  });
});

const getMyShipments = catchAsync(async (req: Request, res: Response) => {
  const result = await shipmentService.getMyShipments(req.user!.id);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    message: "Shipments retrieved successfully",
    data: result,
  });
});

const getShipmentById = catchAsync(async (req: Request, res: Response) => {
  const result = await shipmentService.getShipmentById(
    req.params.id,
    req.user!.id,
  );

  sendResponse(res, {
    statusCode: httpStatus.OK,
    message: "Shipment retrieved successfully",
    data: result,
  });
});

export const shipmentController = {
  createShipment,
  getMyShipments,
  getShipmentById,
};
