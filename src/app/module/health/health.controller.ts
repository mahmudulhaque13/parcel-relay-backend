import type { Request, Response } from "express";
import config from "../../config";
import { sendResponse } from "../../utils/sendResponse";

const check = (_req: Request, res: Response): void => {
  sendResponse(res, {
    statusCode: 200,
    message: "ParcelRelay API is healthy",
    data: {
      status: "ok",
      environment: config.node_env,
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
    },
  });
};

export const healthController = { check };
