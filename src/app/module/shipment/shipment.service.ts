import httpStatus from "http-status-codes";

import { prisma } from "../../lib/prisma";
import { AppError } from "../../utils/AppError";
import type { ICreateShipment } from "./shipment.interface";

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

export const shipmentService = {
  createShipment,
  getMyShipments,
  getShipmentById,
};
