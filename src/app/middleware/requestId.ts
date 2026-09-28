import { randomUUID } from "crypto";
import type { NextFunction, Request, Response } from "express";

export const requestId = (req: Request, res: Response, next: NextFunction) => {
  const existingRequestId = req.headers["x-request-id"];

  const id =
    typeof existingRequestId === "string" && existingRequestId.trim()
      ? existingRequestId
      : randomUUID();

  res.setHeader("X-Request-ID", id);

  next();
};
