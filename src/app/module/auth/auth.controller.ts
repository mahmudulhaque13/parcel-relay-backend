import type { Request, Response } from "express";
import httpStatus from "http-status-codes";

import { catchAsync } from "../../utils/catchAsync";
import { sendResponse } from "../../utils/sendResponse";
import { authService } from "./auth.service";

const registerUser = catchAsync(async (req: Request, res: Response) => {
  const result = await authService.registerUser(req.body);

  sendResponse(res, {
    statusCode: httpStatus.CREATED,
    message: "User registered successfully",
    data: result,
  });
});

const loginUser = catchAsync(async (req: Request, res: Response) => {
  const result = await authService.loginUser(req.body);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    message: "User logged in successfully",
    data: result,
  });
});

const getMe = catchAsync(async (req: Request, res: Response) => {
  sendResponse(res, {
    statusCode: httpStatus.OK,
    message: "User retrieved successfully",
    data: req.user,
  });
});

export const authController = {
  registerUser,
  loginUser,
  getMe,
};
