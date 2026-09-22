import type { Request, Response } from "express";
import httpStatus from "http-status-codes";

import { catchAsync } from "../../utils/catchAsync";
import { sendResponse } from "../../utils/sendResponse";
import { pricingService } from "./pricing.service";

const createPricingRule = catchAsync(async (req: Request, res: Response) => {
  const result = await pricingService.createPricingRule(req.body);

  sendResponse(res, {
    statusCode: httpStatus.CREATED,
    message: "Pricing rule created successfully",
    data: result,
  });
});

const getAllPricingRules = catchAsync(async (_req: Request, res: Response) => {
  const result = await pricingService.getAllPricingRules();

  sendResponse(res, {
    statusCode: httpStatus.OK,
    message: "Pricing rules retrieved successfully",
    data: result,
  });
});

const getPricingRuleById = catchAsync(async (req: Request, res: Response) => {
  const result = await pricingService.getPricingRuleById(req.params.id);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    message: "Pricing rule retrieved successfully",
    data: result,
  });
});

const updatePricingRule = catchAsync(async (req: Request, res: Response) => {
  const result = await pricingService.updatePricingRule(
    req.params.id,
    req.body,
  );

  sendResponse(res, {
    statusCode: httpStatus.OK,
    message: "Pricing rule updated successfully",
    data: result,
  });
});

const deactivatePricingRule = catchAsync(
  async (req: Request, res: Response) => {
    const result = await pricingService.deactivatePricingRule(req.params.id);

    sendResponse(res, {
      statusCode: httpStatus.OK,
      message: "Pricing rule deactivated successfully",
      data: result,
    });
  },
);

const deletePricingRule = catchAsync(async (req: Request, res: Response) => {
  const result = await pricingService.deletePricingRule(req.params.id);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    message: "Pricing rule deleted successfully",
    data: result,
  });
});

export const pricingController = {
  createPricingRule,
  getAllPricingRules,
  getPricingRuleById,
  updatePricingRule,
  deactivatePricingRule,
  deletePricingRule,
};
