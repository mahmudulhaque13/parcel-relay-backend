import httpStatus from "http-status-codes";

import { prisma } from "../../lib/prisma";
import { AppError } from "../../utils/AppError";
import type { IReassignCourier } from "./admin.interface";

const reassignCourier = async (
  adminId: string,
  shipmentId: string,
  payload: IReassignCourier,
) => {
  const newCourier = await prisma.user.findFirst({
    where: {
      id: payload.courierId,
      role: "COURIER",
      status: "ACTIVE",
      isDeleted: false,
    },
    include: {
      courierProfile: true,
    },
  });

  if (!newCourier) {
    throw new AppError(httpStatus.NOT_FOUND, "Active courier not found");
  }

  if (!newCourier.courierProfile) {
    throw new AppError(httpStatus.BAD_REQUEST, "Courier profile not found");
  }

  const newCourierProfile = newCourier.courierProfile;

  const result = await prisma.$transaction(async (tx) => {
    const shipment = await tx.shipment.findFirst({
      where: {
        id: shipmentId,
        isDeleted: false,
      },
      select: {
        id: true,
        courierId: true,
        status: true,
      },
    });

    if (!shipment) {
      throw new AppError(httpStatus.NOT_FOUND, "Shipment not found");
    }

    if (!shipment.courierId) {
      throw new AppError(
        httpStatus.BAD_REQUEST,
        "Shipment is not currently assigned to a courier",
      );
    }

    if (shipment.courierId === newCourierProfile.id) {
      throw new AppError(
        httpStatus.CONFLICT,
        "Shipment is already assigned to this courier",
      );
    }

    const updatedShipment = await tx.shipment.updateMany({
      where: {
        id: shipmentId,
        courierId: shipment.courierId,
        isDeleted: false,
      },
      data: {
        courierId: newCourierProfile.id,
      },
    });

    if (updatedShipment.count !== 1) {
      throw new AppError(
        httpStatus.CONFLICT,
        "Shipment assignment changed. Please try again",
      );
    }

    const event = await tx.shipmentEvent.create({
      data: {
        shipmentId,
        status: shipment.status,
        description: `Shipment reassigned to courier ${newCourier.name}`,
      },
    });

    await tx.auditLog.create({
      data: {
        userId: adminId,
        action: "ASSIGN",
        entityType: "Shipment",
        entityId: shipmentId,
        description: `Shipment reassigned to courier ${newCourier.name}`,
        metadata: {
          previousCourierProfileId: shipment.courierId,
          newCourierId: payload.courierId,
          newCourierName: newCourier.name,
        },
      },
    });

    return {
      shipmentId,
      courierId: payload.courierId,
      status: shipment.status,
      eventId: event.id,
    };
  });

  return result;
};

export const adminService = {
  reassignCourier,
};
