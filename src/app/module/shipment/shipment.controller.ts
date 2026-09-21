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

const updateShipmentStatus = catchAsync(async (req: Request, res: Response) => {
  const result = await shipmentService.updateShipmentStatus(
    req.params.id,
    req.user!.id,
    req.user!.role,
    req.body,
  );

  sendResponse(res, {
    statusCode: httpStatus.OK,
    message: "Shipment status updated successfully",
    data: result,
  });
});

const getShipmentQuote = catchAsync(async (req: Request, res: Response) => {
  const result = await shipmentService.getShipmentQuote(req.body);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    message: "Shipment quote calculated successfully",
    data: result,
  });
});

const updateShipment = catchAsync(async (req: Request, res: Response) => {
  const result = await shipmentService.updateShipment(
    req.params.id,
    req.user!.id,
    req.body,
  );

  sendResponse(res, {
    statusCode: httpStatus.OK,
    message: "Shipment updated successfully",
    data: result,
  });
});

const cancelShipment = catchAsync(async (req: Request, res: Response) => {
  const result = await shipmentService.cancelShipment(
    req.params.id,
    req.user!.id,
  );

  sendResponse(res, {
    statusCode: httpStatus.OK,
    message: "Shipment cancelled successfully",
    data: result,
  });
});

const deleteShipment = catchAsync(async (req: Request, res: Response) => {
  const result = await shipmentService.deleteShipment(
    req.params.id,
    req.user!.id,
  );

  sendResponse(res, {
    statusCode: httpStatus.OK,
    message: "Shipment deleted successfully",
    data: result,
  });
});

export const shipmentController = {
  getShipmentQuote,
  createShipment,
  updateShipment,
  getMyShipments,
  getShipmentById,
  updateShipmentStatus,
  deleteShipment,
  cancelShipment,
};
