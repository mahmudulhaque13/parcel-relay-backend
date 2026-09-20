import httpStatus from "http-status-codes";
import type { Request, Response } from "express";

import { paymentService } from "./payment.service";
import { catchAsync } from "../../utils/catchAsync";
import { sendResponse } from "../../utils/sendResponse";

const initiatePayment = catchAsync(async (req: Request, res: Response) => {
  const result = await paymentService.initiatePayment(req.user!.id, req.body);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    message: "Payment initiated successfully",
    data: result,
  });
});

const paymentSuccess = catchAsync(async (req: Request, res: Response) => {
  const { session_id } = req.query;

  const result = await paymentService.paymentSuccess(session_id as string);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    message: "Payment session retrieved successfully",
    data: result,
  });
});

const paymentCancel = catchAsync(async (_req: Request, res: Response) => {
  const result = await paymentService.paymentCancel();

  sendResponse(res, {
    statusCode: httpStatus.OK,
    message: "Payment cancelled",
    data: result,
  });
});

const handleWebhook = catchAsync(async (req: Request, res: Response) => {
  const signature = req.headers["stripe-signature"];

  const result = await paymentService.handleWebhook(
    req.body,
    signature as string,
  );

  sendResponse(res, {
    statusCode: httpStatus.OK,
    message: "Webhook processed successfully",
    data: result,
  });
});

export const paymentController = {
  initiatePayment,
  paymentSuccess,
  paymentCancel,
  handleWebhook,
};
