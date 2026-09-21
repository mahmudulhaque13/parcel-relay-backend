import type { Request, Response } from "express";
import httpStatus from "http-status-codes";

import { catchAsync } from "../../utils/catchAsync";
import { sendResponse } from "../../utils/sendResponse";
import { transferService } from "./transfer.service";

const createTransfer = catchAsync(async (req: Request, res: Response) => {
  const actorId = req.user!.id;

  const result = await transferService.createTransfer(actorId, req.body);

  sendResponse(res, {
    statusCode: httpStatus.CREATED,
    message: "Shipment transfer created successfully",
    data: result,
  });
});

const updateTransferStatus = catchAsync(async (req: Request, res: Response) => {
  const actorId = req.user!.id;
  const { id } = req.params;

  const result = await transferService.updateTransferStatus(
    actorId,
    id,
    req.body,
  );

  sendResponse(res, {
    statusCode: httpStatus.OK,
    message: "Transfer status updated successfully",
    data: result,
  });
});

export const transferController = {
  createTransfer,
  updateTransferStatus,
};
