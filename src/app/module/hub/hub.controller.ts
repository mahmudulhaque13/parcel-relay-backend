import type { Request, Response } from 'express';
import httpStatus from 'http-status-codes';

import { catchAsync } from '../../utils/catchAsync';
import { sendResponse } from '../../utils/sendResponse';
import { hubService } from './hub.service';

const createHub = catchAsync(async (req: Request, res: Response) => {
  const result = await hubService.createHub(req.body);

  sendResponse(res, {
    statusCode: httpStatus.CREATED,
    message: 'Hub created successfully',
    data: result,
  });
});

const getAllHubs = catchAsync(async (_req: Request, res: Response) => {
  const result = await hubService.getAllHubs();

  sendResponse(res, {
    statusCode: httpStatus.OK,
    message: 'Hubs retrieved successfully',
    data: result,
  });
});

const updateHub = catchAsync(async (req: Request, res: Response) => {
  const result = await hubService.updateHub(req.params.id, req.body);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    message: 'Hub updated successfully',
    data: result,
  });
});

const deactivateHub = catchAsync(async (req: Request, res: Response) => {
  const result = await hubService.deactivateHub(req.params.id);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    message: 'Hub deactivated successfully',
    data: result,
  });
});

export const hubController = {
  createHub,
  getAllHubs,
  updateHub,
  deactivateHub,
};
