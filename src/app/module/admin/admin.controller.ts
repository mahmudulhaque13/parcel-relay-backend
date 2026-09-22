import type { Request, Response } from "express";
import httpStatus from "http-status-codes";

import { catchAsync } from "../../utils/catchAsync";
import { sendResponse } from "../../utils/sendResponse";
import { adminService } from "./admin.service";
import { adminValidation } from "./admin.validation";

const reassignCourier = catchAsync(async (req: Request, res: Response) => {
  const adminId = req.user!.id;
  const { id: shipmentId } = req.params;

  const payload = adminValidation.reassignCourierValidation.parse(req.body);

  const result = await adminService.reassignCourier(
    adminId,
    shipmentId,
    payload,
  );

  sendResponse(res, {
    statusCode: httpStatus.OK,
    message: "Courier reassigned successfully",
    data: result,
  });
});

const getAdminUsers = catchAsync(async (req: Request, res: Response) => {
  const query = adminValidation.adminUserQueryValidation.parse(req.query);

  const result = await adminService.getAdminUsers(query);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    message: "Admin users retrieved successfully",
    data: result,
  });
});

const getAdminUserById = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;

  const result = await adminService.getAdminUserById(id);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    message: "Admin user retrieved successfully",
    data: result,
  });
});

const updateUserRole = catchAsync(async (req: Request, res: Response) => {
  const adminId = req.user!.id;
  const { id: userId } = req.params;

  const payload = adminValidation.updateUserRoleValidation.parse(req.body);

  const result = await adminService.updateUserRole(adminId, userId, payload);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    message: "User role updated successfully",
    data: result,
  });
});

const updateUserStatus = catchAsync(async (req, res) => {
  const adminId = req.user!.id;
  const { id: userId } = req.params;

  const payload = adminValidation.updateUserStatusValidation.parse(req.body);

  const result = await adminService.updateUserStatus(adminId, userId, payload);

  sendResponse(res, {
    statusCode: 200,
    message: "User status updated successfully",
    data: result,
  });
});

const getAuditLogs = catchAsync(async (req, res) => {
  const query = adminValidation.auditLogQueryValidation.parse(req.query);

  const result = await adminService.getAuditLogs(query);

  sendResponse(res, {
    statusCode: 200,
    message: "Audit logs retrieved successfully",
    data: result,
  });
});

export const adminController = {
  reassignCourier,
  getAdminUsers,
  getAdminUserById,
  updateUserRole,
  updateUserStatus,
  getAuditLogs,
};
