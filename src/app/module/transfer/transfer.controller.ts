import type { Request, Response } from "express";

import httpStatus from "http-status-codes";

import { catchAsync } from "../../utils/catchAsync";

import { sendResponse } from "../../utils/sendResponse";

import { transferService } from "./transfer.service";

const createTransfer = catchAsync(async (req: Request, res: Response) => {
  const actorId = req.user!.id;
  const { id: shipmentId } = req.params;

  const result = await transferService.createTransfer(
    actorId,
    shipmentId,
    req.body,
  );

  sendResponse(res, {
    statusCode: httpStatus.CREATED,
    message: "Shipment transfer created successfully",
    data: result,
  });
});

const dispatchTransfer = catchAsync(async (req: Request, res: Response) => {
  const actorId = req.user!.id;
  const { id: transferId } = req.params;

  const result = await transferService.dispatchTransfer(actorId, transferId);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    message: "Shipment transfer dispatched successfully",
    data: result,
  });
});

const receiveTransfer = catchAsync(async (req: Request, res: Response) => {
  const actorId = req.user!.id;
  const { id: transferId } = req.params;

  const result = await transferService.receiveTransfer(actorId, transferId);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    message: "Shipment transfer received successfully",
    data: result,
  });
});

const cancelTransfer = catchAsync(async (req: Request, res: Response) => {
  const actorId = req.user!.id;
  const { id: transferId } = req.params;

  const result = await transferService.cancelTransfer(actorId, transferId);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    message: "Shipment transfer cancelled successfully",
    data: result,
  });
});

const getShipmentTransfers = catchAsync(async (req: Request, res: Response) => {
  const actorId = req.user!.id;
  const { id: shipmentId } = req.params;

  const result = await transferService.getShipmentTransfers(
    actorId,
    shipmentId,
  );

  sendResponse(res, {
    statusCode: httpStatus.OK,
    message: "Shipment transfers retrieved successfully",
    data: result,
  });
});

export const transferController = {
  createTransfer,
  dispatchTransfer,
  receiveTransfer,
  cancelTransfer,
  getShipmentTransfers,
};
