import type { Request, Response } from "express";
import httpStatus from "http-status-codes";

import config from "../../config";
import { catchAsync } from "../../utils/catchAsync";
import { sendResponse } from "../../utils/sendResponse";

import { authService } from "./auth.service";

const refreshCookieOptions = {
  httpOnly: true,
  secure: config.node_env === "production",
  sameSite:
    config.node_env === "production" ? ("none" as const) : ("lax" as const),
  path: "/api/v1/auth",
  maxAge: 7 * 24 * 60 * 60 * 1000,
};

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

  res.cookie("refreshToken", result.refreshToken, refreshCookieOptions);

  const { refreshToken, ...responseData } = result;

  sendResponse(res, {
    statusCode: httpStatus.OK,
    message: "User logged in successfully",
    data: responseData,
  });
});

const refreshToken = catchAsync(async (req: Request, res: Response) => {
  const token = req.cookies.refreshToken;

  if (!token) {
    sendResponse(res, {
      statusCode: httpStatus.UNAUTHORIZED,
      message: "Refresh token is missing",
      data: null,
    });

    return;
  }

  const result = await authService.refreshAccessToken(token);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    message: "Access token refreshed successfully",
    data: result,
  });
});

const logoutUser = catchAsync(async (req: Request, res: Response) => {
  const token = req.cookies.refreshToken;

  if (token) {
    await authService.logoutUser(token);
  }

  res.clearCookie("refreshToken", refreshCookieOptions);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    message: "User logged out successfully",
    data: null,
  });
});

const getMe = catchAsync(async (req: Request, res: Response) => {
  sendResponse(res, {
    statusCode: httpStatus.OK,
    message: "User retrieved successfully",
    data: req.user,
  });
});

const adminTest = catchAsync(async (_req: Request, res: Response) => {
  sendResponse(res, {
    statusCode: httpStatus.OK,
    message: "Admin authorization successful",
    data: {
      message: "Only ADMIN can access this resource",
    },
  });
});

export const authController = {
  registerUser,
  loginUser,
  refreshToken,
  logoutUser,
  getMe,
  adminTest,
};
