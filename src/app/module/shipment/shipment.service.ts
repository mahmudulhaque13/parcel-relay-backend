import httpStatus from "http-status-codes";

import { prisma } from "../../lib/prisma";
import { AppError } from "../../utils/AppError";
import type {
  ICreateShipment,
  IShipmentQuery,
  IShipmentQuote,
  IUpdateShipment,
  IUpdateShipmentStatus,
} from "./shipment.interface";

const generateTrackingNumber = () => {
  const timestamp = Date.now();
  const randomNumber = Math.floor(1000 + Math.random() * 9000);

  return `PR-${timestamp}-${randomNumber}`;
};

const getShipmentQuote = async (payload: IShipmentQuote) => {
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

  return {
    originZone: {
      id: originZone.id,
      name: originZone.name,
      code: originZone.code,
    },

    destinationZone: {
      id: destinationZone.id,
      name: destinationZone.name,
      code: destinationZone.code,
    },

    pricing: {
      pricingRuleId: pricingRule.id,
      basePrice,
      perKgPrice,
      codPercentage,
      weightCharge,
      codCharge,
      deliveryCharge,
    },

    shipment: {
      weight: payload.weight,
      codAmount: payload.codAmount,
    },
  };
};

const updateShipment = async (
  shipmentId: string,
  customerId: string,
  payload: IUpdateShipment,
) => {
  const shipment = await prisma.shipment.findUnique({
    where: {
      id: shipmentId,
    },
  });

  if (!shipment) {
    throw new AppError(httpStatus.NOT_FOUND, "Shipment not found");
  }

  if (shipment.customerId !== customerId) {
    throw new AppError(
      httpStatus.FORBIDDEN,
      "You do not have permission to update this shipment",
    );
  }

  if (shipment.status !== "PENDING_PAYMENT") {
    throw new AppError(
      httpStatus.CONFLICT,
      "Shipment can only be updated before payment",
    );
  }

  if (shipment.paymentStatus !== "PENDING") {
    throw new AppError(
      httpStatus.CONFLICT,
      "Shipment payment has already been processed",
    );
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

  const weight = payload.weight ?? Number(shipment.weight);
  const codAmount = payload.codAmount ?? Number(shipment.codAmount);

  const basePrice = Number(pricingRule.basePrice);
  const perKgPrice = Number(pricingRule.perKgPrice);
  const codPercentage = Number(pricingRule.codPercentage);

  const weightCharge = weight * perKgPrice;
  const codCharge = (codAmount * codPercentage) / 100;

  const deliveryCharge = basePrice + weightCharge + codCharge;

  const result = await prisma.$transaction(async (tx) => {
    const updatedShipment = await tx.shipment.updateMany({
      where: {
        id: shipmentId,
        customerId,
        status: "PENDING_PAYMENT",
        paymentStatus: "PENDING",
      },
      data: {
        ...(payload.recipientName !== undefined && {
          recipientName: payload.recipientName,
        }),

        ...(payload.recipientPhone !== undefined && {
          recipientPhone: payload.recipientPhone,
        }),

        ...(payload.deliveryAddress !== undefined && {
          deliveryAddress: payload.deliveryAddress,
        }),

        ...(payload.packageDescription !== undefined && {
          packageDescription: payload.packageDescription,
        }),

        weight,
        codAmount,
        deliveryCharge,
        pricingRuleId: pricingRule.id,
      },
    });

    if (updatedShipment.count !== 1) {
      throw new AppError(
        httpStatus.CONFLICT,
        "Shipment was changed by another request",
      );
    }

    await tx.auditLog.create({
      data: {
        userId: customerId,
        action: "UPDATE",
        entityType: "Shipment",
        entityId: shipmentId,
        description: "Shipment details updated",
        metadata: {
          updatedFields: Object.keys(payload),
          deliveryCharge,
        },
      },
    });

    return tx.shipment.findUnique({
      where: {
        id: shipmentId,
      },
    });
  });

  return result;
};

const cancelShipment = async (shipmentId: string, customerId: string) => {
  const shipment = await prisma.shipment.findFirst({
    where: {
      id: shipmentId,
      customerId,
      isDeleted: false,
    },
    select: {
      id: true,
      customerId: true,
      status: true,
      paymentStatus: true,
    },
  });

  if (!shipment) {
    throw new AppError(httpStatus.NOT_FOUND, "Shipment not found");
  }

  const cancellableStatuses = ["PENDING_PAYMENT", "READY_FOR_ASSIGNMENT"];

  if (!cancellableStatuses.includes(shipment.status)) {
    throw new AppError(
      httpStatus.CONFLICT,
      "Shipment cannot be cancelled in its current status",
    );
  }

  if (shipment.paymentStatus !== "PENDING") {
    throw new AppError(
      httpStatus.CONFLICT,
      "Paid shipment cannot be cancelled",
    );
  }

  const result = await prisma.$transaction(async (tx) => {
    const updatedShipment = await tx.shipment.update({
      where: {
        id: shipmentId,
      },
      data: {
        status: "CANCELLED",
      },
    });

    await tx.shipmentEvent.create({
      data: {
        shipmentId,
        status: "CANCELLED",
        description: "Shipment cancelled by customer",
      },
    });

    await tx.auditLog.create({
      data: {
        userId: customerId,
        action: "STATUS_CHANGE",
        entityType: "Shipment",
        entityId: shipmentId,
        description: "Shipment cancelled by customer",
      },
    });

    return updatedShipment;
  });

  return result;
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

const getMyShipments = async (customerId: string, query: IShipmentQuery) => {
  const {
    page = 1,
    limit = 10,
    status,
    q,
    sortBy = "createdAt",
    sortOrder = "desc",
  } = query;

  const skip = (page - 1) * limit;

  const where = {
    customerId,
    isDeleted: false,
    ...(status && {
      status,
    }),
    ...(q && {
      OR: [
        {
          trackingNumber: {
            contains: q,
            mode: "insensitive" as const,
          },
        },
        {
          recipientName: {
            contains: q,
            mode: "insensitive" as const,
          },
        },
      ],
    }),
  };

  const [shipments, total] = await prisma.$transaction([
    prisma.shipment.findMany({
      where,
      include: {
        originZone: true,
        destinationZone: true,
        pricingRule: true,
      },
      orderBy: {
        [sortBy]: sortOrder,
      },
      skip,
      take: limit,
    }),

    prisma.shipment.count({
      where,
    }),
  ]);

  return {
    data: shipments,
    meta: {
      page,
      limit,
      total,
      totalPage: Math.ceil(total / limit),
    },
  };
};

const getShipmentById = async (shipmentId: string, customerId: string) => {
  const shipment = await prisma.shipment.findFirst({
    where: {
      id: shipmentId,
      customerId,
      isDeleted: false,
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

  return shipment;
};

const getShipmentTimeline = async (shipmentId: string, customerId: string) => {
  const shipment = await prisma.shipment.findFirst({
    where: {
      id: shipmentId,
      customerId,
      isDeleted: false,
    },
    select: {
      id: true,
      trackingNumber: true,
      status: true,
    },
  });

  if (!shipment) {
    throw new AppError(httpStatus.NOT_FOUND, "Shipment not found");
  }

  const events = await prisma.shipmentEvent.findMany({
    where: {
      shipmentId,
    },
    orderBy: {
      createdAt: "asc",
    },
  });

  return {
    shipment,
    events,
  };
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

const deleteShipment = async (shipmentId: string, userId: string) => {
  const shipment = await prisma.shipment.findUnique({
    where: {
      id: shipmentId,
    },
    select: {
      id: true,
      customerId: true,
      status: true,
      paymentStatus: true,
      isDeleted: true,
    },
  });

  if (!shipment) {
    throw new AppError(httpStatus.NOT_FOUND, "Shipment not found");
  }

  if (shipment.customerId !== userId) {
    throw new AppError(
      httpStatus.FORBIDDEN,
      "You are not allowed to delete this shipment",
    );
  }

  if (shipment.isDeleted) {
    throw new AppError(httpStatus.NOT_FOUND, "Shipment not found");
  }

  if (shipment.status !== "PENDING_PAYMENT") {
    throw new AppError(
      httpStatus.CONFLICT,
      "Only pending payment shipments can be deleted",
    );
  }

  if (shipment.paymentStatus !== "PENDING") {
    throw new AppError(httpStatus.CONFLICT, "Paid shipment cannot be deleted");
  }

  const result = await prisma.$transaction(async (tx) => {
    const updatedShipment = await tx.shipment.update({
      where: {
        id: shipmentId,
      },
      data: {
        isDeleted: true,
        deletedAt: new Date(),
      },
    });

    await tx.auditLog.create({
      data: {
        userId,
        action: "DELETE",
        entityType: "Shipment",
        entityId: shipmentId,
        description: "Shipment soft deleted",
      },
    });

    return updatedShipment;
  });

  return result;
};

export const shipmentService = {
  getShipmentQuote,
  createShipment,
  updateShipment,
  getMyShipments,
  getShipmentById,
  getShipmentTimeline,
  updateShipmentStatus,
  deleteShipment,
  cancelShipment,
};
