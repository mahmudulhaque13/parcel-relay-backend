import httpStatus from "http-status-codes";

import { prisma } from "../../lib/prisma";
import { AppError } from "../../utils/AppError";
import type { ICreatePickup, IUpdatePickupStatus } from "./pickup.interface";

const createPickup = async (customerId: string, payload: ICreatePickup) => {
  const shipment = await prisma.shipment.findFirst({
    where: {
      id: payload.shipmentId,
      customerId,
    },
  });

  if (!shipment) {
    throw new AppError(httpStatus.NOT_FOUND, "Shipment not found");
  }

  const existingPickup = await prisma.pickupRequest.findUnique({
    where: {
      shipmentId: payload.shipmentId,
    },
  });

  if (existingPickup) {
    throw new AppError(
      httpStatus.CONFLICT,
      "Pickup request already exists for this shipment",
    );
  }

  if (shipment.status !== "ASSIGNED") {
    throw new AppError(
      httpStatus.CONFLICT,
      "Pickup request can only be created for an assigned shipment",
    );
  }

  const pickupDate = new Date(payload.pickupDate);

  if (Number.isNaN(pickupDate.getTime())) {
    throw new AppError(httpStatus.BAD_REQUEST, "Invalid pickup date");
  }

  if (pickupDate <= new Date()) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      "Pickup date must be in the future",
    );
  }

  const result = await prisma.$transaction(async (tx) => {
    const pickup = await tx.pickupRequest.create({
      data: {
        shipmentId: payload.shipmentId,
        pickupDate,
        notes: payload.notes,
        status: "SCHEDULED",
      },
    });

    const updatedShipment = await tx.shipment.updateMany({
      where: {
        id: payload.shipmentId,
        status: "ASSIGNED",
      },
      data: {
        status: "PICKUP_SCHEDULED",
      },
    });

    if (updatedShipment.count !== 1) {
      throw new AppError(
        httpStatus.CONFLICT,
        "Shipment status changed before pickup scheduling",
      );
    }

    const shipmentEvent = await tx.shipmentEvent.create({
      data: {
        shipmentId: payload.shipmentId,
        status: "PICKUP_SCHEDULED",
        description: "Pickup scheduled successfully",
      },
    });

    await tx.auditLog.create({
      data: {
        userId: customerId,
        action: "STATUS_CHANGE",
        entityType: "Shipment",
        entityId: payload.shipmentId,
        description: "Pickup scheduled for shipment",
        metadata: {
          pickupRequestId: pickup.id,
          pickupDate: pickupDate.toISOString(),
        },
      },
    });

    return {
      pickup,
      shipmentEvent,
    };
  });

  return result;
};

const updatePickupStatus = async (
  actorId: string,
  pickupId: string,
  payload: IUpdatePickupStatus,
) => {
  const pickup = await prisma.pickupRequest.findUnique({
    where: {
      id: pickupId,
    },
    include: {
      shipment: true,
    },
  });

  if (!pickup) {
    throw new AppError(httpStatus.NOT_FOUND, "Pickup request not found");
  }

  const shipment = pickup.shipment;

  const courier = await prisma.courierProfile.findUnique({
    where: {
      userId: actorId,
    },
  });

  const isAssignedCourier = courier && shipment.courierId === courier.id;

  if (!isAssignedCourier) {
    throw new AppError(
      httpStatus.FORBIDDEN,
      "You are not assigned to this shipment",
    );
  }

  const allowedTransitions: Record<string, string[]> = {
    REQUESTED: ["SCHEDULED", "CANCELLED"],
    SCHEDULED: ["PICKED_UP", "FAILED", "CANCELLED"],
    PICKED_UP: [],
    FAILED: [],
    CANCELLED: [],
  };

  const allowedStatuses = allowedTransitions[pickup.status] ?? [];

  if (!allowedStatuses.includes(payload.status)) {
    throw new AppError(
      httpStatus.CONFLICT,
      `Invalid pickup status transition from ${pickup.status} to ${payload.status}`,
    );
  }

  const result = await prisma.$transaction(async (tx) => {
    const updatedPickup = await tx.pickupRequest.updateMany({
      where: {
        id: pickupId,
        status: pickup.status,
      },
      data: {
        status: payload.status,
        notes: payload.notes ?? pickup.notes,
      },
    });

    if (updatedPickup.count !== 1) {
      throw new AppError(
        httpStatus.CONFLICT,
        "Pickup status was changed by another request",
      );
    }

    if (payload.status === "PICKED_UP") {
      const updatedShipment = await tx.shipment.updateMany({
        where: {
          id: shipment.id,
          status: "PICKUP_SCHEDULED",
        },
        data: {
          status: "PICKED_UP",
        },
      });

      if (updatedShipment.count !== 1) {
        throw new AppError(
          httpStatus.CONFLICT,
          "Shipment status was changed by another request",
        );
      }

      await tx.shipmentEvent.create({
        data: {
          shipmentId: shipment.id,
          status: "PICKED_UP",
          description: payload.notes || "Shipment picked up successfully",
        },
      });
    }

    await tx.auditLog.create({
      data: {
        userId: actorId,
        action: "STATUS_CHANGE",
        entityType: "PickupRequest",
        entityId: pickupId,
        description: `Pickup status changed from ${pickup.status} to ${payload.status}`,
        metadata: {
          shipmentId: shipment.id,
        },
      },
    });

    const pickupResult = await tx.pickupRequest.findUnique({
      where: {
        id: pickupId,
      },
    });

    return pickupResult;
  });

  return result;
};

export const pickupService = {
  createPickup,
  updatePickupStatus,
};
