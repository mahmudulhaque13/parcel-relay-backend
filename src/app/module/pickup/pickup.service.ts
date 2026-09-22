import httpStatus from "http-status-codes";

import { prisma } from "../../lib/prisma";
import { AppError } from "../../utils/AppError";

import type { ICreatePickup, IUpdatePickupStatus } from "./pickup.interface";

const createPickup = async (
  customerId: string,
  shipmentId: string,
  payload: ICreatePickup,
) => {
  const shipment = await prisma.shipment.findFirst({
    where: {
      id: shipmentId,
      customerId,
      isDeleted: false,
    },
  });

  if (!shipment) {
    throw new AppError(httpStatus.NOT_FOUND, "Shipment not found");
  }

  const existingPickup = await prisma.pickupRequest.findUnique({
    where: {
      shipmentId,
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
        shipmentId,
        pickupDate,
        notes: payload.notes,
        status: "SCHEDULED",
      },
    });

    const updatedShipment = await tx.shipment.updateMany({
      where: {
        id: shipmentId,
        status: "ASSIGNED",
        isDeleted: false,
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
        shipmentId,
        status: "PICKUP_SCHEDULED",
        description: "Pickup scheduled successfully",
      },
    });

    await tx.auditLog.create({
      data: {
        userId: customerId,
        action: "STATUS_CHANGE",
        entityType: "Shipment",
        entityId: shipmentId,
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
  shipmentId: string,
  payload: IUpdatePickupStatus,
) => {
  const pickup = await prisma.pickupRequest.findUnique({
    where: {
      shipmentId,
    },
    include: {
      shipment: true,
    },
  });

  if (!pickup) {
    throw new AppError(httpStatus.NOT_FOUND, "Pickup request not found");
  }

  if (pickup.shipment.isDeleted) {
    throw new AppError(httpStatus.NOT_FOUND, "Shipment not found");
  }

  const courier = await prisma.courierProfile.findUnique({
    where: {
      userId: actorId,
    },
  });

  const isAssignedCourier = courier && pickup.shipment.courierId === courier.id;

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
        id: pickup.id,
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
          id: shipmentId,
          status: "PICKUP_SCHEDULED",
          isDeleted: false,
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
          shipmentId,
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
        entityId: pickup.id,
        description: `Pickup status changed from ${pickup.status} to ${payload.status}`,
        metadata: {
          shipmentId,
        },
      },
    });

    return tx.pickupRequest.findUnique({
      where: {
        id: pickup.id,
      },
    });
  });

  return result;
};

const getPickup = async (actorId: string, shipmentId: string) => {
  const shipment = await prisma.shipment.findFirst({
    where: {
      id: shipmentId,
      isDeleted: false,
    },
    select: {
      id: true,
      customerId: true,
      courierId: true,
    },
  });

  if (!shipment) {
    throw new AppError(httpStatus.NOT_FOUND, "Shipment not found");
  }

  const user = await prisma.user.findUnique({
    where: {
      id: actorId,
    },
    select: {
      role: true,
    },
  });

  if (!user) {
    throw new AppError(httpStatus.UNAUTHORIZED, "User not found");
  }

  if (user.role === "CUSTOMER" && shipment.customerId !== actorId) {
    throw new AppError(
      httpStatus.FORBIDDEN,
      "You don't have permission to access this pickup",
    );
  }

  if (user.role === "COURIER") {
    const courier = await prisma.courierProfile.findUnique({
      where: {
        userId: actorId,
      },
      select: {
        id: true,
      },
    });

    if (!courier || shipment.courierId !== courier.id) {
      throw new AppError(
        httpStatus.FORBIDDEN,
        "You are not assigned to this shipment",
      );
    }
  }

  const pickup = await prisma.pickupRequest.findUnique({
    where: {
      shipmentId,
    },
  });

  if (!pickup) {
    throw new AppError(httpStatus.NOT_FOUND, "Pickup request not found");
  }

  return pickup;
};

export const pickupService = {
  createPickup,
  updatePickupStatus,
  getPickup,
};
