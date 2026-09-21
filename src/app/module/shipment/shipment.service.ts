import httpStatus from "http-status-codes";

import { prisma } from "../../lib/prisma";
import { AppError } from "../../utils/AppError";
import type {
  ICreateShipment,
  IUpdateShipmentStatus,
} from "./shipment.interface";

const generateTrackingNumber = () => {
  const timestamp = Date.now();
  const randomNumber = Math.floor(1000 + Math.random() * 9000);

  return `PR-${timestamp}-${randomNumber}`;
};

const createShipment = async (customerId: string, payload: ICreateShipment) => {
  const originZone = await prisma.zone.findUnique({
    where: {
      id: payload.originZoneId,
    },
  });

  if (!originZone) {
    throw new AppError(httpStatus.NOT_FOUND, "Origin zone not found");
  }

  if (!originZone.isActive) {
    throw new AppError(httpStatus.BAD_REQUEST, "Origin zone is inactive");
  }

  const destinationZone = await prisma.zone.findUnique({
    where: {
      id: payload.destinationZoneId,
    },
  });

  if (!destinationZone) {
    throw new AppError(httpStatus.NOT_FOUND, "Destination zone not found");
  }

  if (!destinationZone.isActive) {
    throw new AppError(httpStatus.BAD_REQUEST, "Destination zone is inactive");
  }

  const pricingRule = await prisma.pricingRule.findFirst({
    where: {
      isActive: true,
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  if (!pricingRule) {
    throw new AppError(httpStatus.NOT_FOUND, "No active pricing rule found");
  }

  const basePrice = Number(pricingRule.basePrice);
  const perKgPrice = Number(pricingRule.perKgPrice);
  const codPercentage = Number(pricingRule.codPercentage);

  const weightCharge = payload.weight * perKgPrice;
  const codCharge = (payload.codAmount * codPercentage) / 100;

  const deliveryCharge = basePrice + weightCharge + codCharge;

  const shipment = await prisma.shipment.create({
    data: {
      trackingNumber: generateTrackingNumber(),
      customerId,

      originZoneId: payload.originZoneId,
      destinationZoneId: payload.destinationZoneId,
      pricingRuleId: pricingRule.id,

      recipientName: payload.recipientName,
      recipientPhone: payload.recipientPhone,
      deliveryAddress: payload.deliveryAddress,
      packageDescription: payload.packageDescription,

      weight: payload.weight,
      deliveryCharge,
      codAmount: payload.codAmount,

      status: "PENDING_PAYMENT",
      paymentStatus: "PENDING",
    },
  });

  return shipment;
};

const getMyShipments = async (customerId: string) => {
  const shipments = await prisma.shipment.findMany({
    where: {
      customerId,
    },
    include: {
      originZone: true,
      destinationZone: true,
      pricingRule: true,
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  return shipments;
};

const getShipmentById = async (shipmentId: string, customerId: string) => {
  const shipment = await prisma.shipment.findUnique({
    where: {
      id: shipmentId,
    },
    include: {
      originZone: true,
      destinationZone: true,
      pricingRule: true,
      events: {
        orderBy: {
          createdAt: "desc",
        },
      },
    },
  });

  if (!shipment) {
    throw new AppError(httpStatus.NOT_FOUND, "Shipment not found");
  }

  if (shipment.customerId !== customerId) {
    throw new AppError(
      httpStatus.FORBIDDEN,
      "You do not have permission to access this shipment",
    );
  }

  return shipment;
};

const updateShipmentStatus = async (
  shipmentId: string,
  actorId: string,
  actorRole: "CUSTOMER" | "COURIER" | "ADMIN",
  payload: IUpdateShipmentStatus,
) => {
  const shipment = await prisma.shipment.findUnique({
    where: {
      id: shipmentId,
    },
  });

  if (!shipment) {
    throw new AppError(httpStatus.NOT_FOUND, "Shipment not found");
  }

  const currentStatus = shipment.status;
  const nextStatus = payload.status;

  const allowedTransitions: Record<string, string[]> = {
    PENDING_PAYMENT: ["CANCELLED"],
    READY_FOR_ASSIGNMENT: ["CANCELLED"],
    ASSIGNED: ["PICKUP_SCHEDULED"],
    PICKUP_SCHEDULED: ["PICKED_UP", "CANCELLED"],
    PICKED_UP: ["AT_ORIGIN_HUB"],
    AT_ORIGIN_HUB: ["IN_TRANSIT"],
    IN_TRANSIT: ["AT_DESTINATION_HUB"],
    AT_DESTINATION_HUB: ["OUT_FOR_DELIVERY"],
    OUT_FOR_DELIVERY: ["DELIVERY_FAILED", "DELIVERED"],
    DELIVERY_FAILED: ["OUT_FOR_DELIVERY", "RETURN_INITIATED"],
    RETURN_INITIATED: ["RETURN_IN_TRANSIT"],
    RETURN_IN_TRANSIT: ["RETURNED_TO_SENDER"],
    DELIVERED: [],
    RETURNED_TO_SENDER: [],
    CANCELLED: [],
  };

  const allowedNextStatuses = allowedTransitions[currentStatus] ?? [];

  if (!allowedNextStatuses.includes(nextStatus)) {
    throw new AppError(
      httpStatus.CONFLICT,
      `Invalid shipment status transition: ${currentStatus} -> ${nextStatus}`,
    );
  }

  // Customer ownership
  if (actorRole === "CUSTOMER") {
    if (shipment.customerId !== actorId) {
      throw new AppError(
        httpStatus.FORBIDDEN,
        "You do not have permission to update this shipment",
      );
    }

    if (nextStatus !== "CANCELLED") {
      throw new AppError(
        httpStatus.FORBIDDEN,
        "Customer can only cancel a shipment",
      );
    }
  }

  // Courier ownership
  if (actorRole === "COURIER") {
    const courier = await prisma.courierProfile.findUnique({
      where: {
        userId: actorId,
      },
    });

    if (!courier) {
      throw new AppError(httpStatus.FORBIDDEN, "Courier profile not found");
    }

    if (shipment.courierId !== courier.id) {
      throw new AppError(
        httpStatus.FORBIDDEN,
        "This shipment is not assigned to you",
      );
    }
  }

  const result = await prisma.$transaction(async (tx) => {
    const updatedShipment = await tx.shipment.updateMany({
      where: {
        id: shipmentId,
        status: currentStatus,
      },
      data: {
        status: nextStatus,
      },
    });

    if (updatedShipment.count !== 1) {
      throw new AppError(
        httpStatus.CONFLICT,
        "Shipment status was changed by another request",
      );
    }

    const event = await tx.shipmentEvent.create({
      data: {
        shipmentId,
        status: nextStatus,
        description:
          payload.note ||
          `Shipment status changed from ${currentStatus} to ${nextStatus}`,
        location: payload.location,
      },
    });

    await tx.auditLog.create({
      data: {
        userId: actorId,
        action: "STATUS_CHANGE",
        entityType: "Shipment",
        entityId: shipmentId,
        description: `Shipment status changed from ${currentStatus} to ${nextStatus}`,
        metadata: {
          actorRole,
          previousStatus: currentStatus,
          nextStatus,
          location: payload.location,
        },
      },
    });

    return {
      status: nextStatus,
      eventId: event.id,
    };
  });

  return {
    shipmentId,
    previousStatus: currentStatus,
    status: result.status,
    eventId: result.eventId,
  };
};

export const shipmentService = {
  createShipment,
  getMyShipments,
  getShipmentById,
  updateShipmentStatus,
};
