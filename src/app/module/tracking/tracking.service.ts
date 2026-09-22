import httpStatus from 'http-status-codes';

import { prisma } from '../../lib/prisma';
import { AppError } from '../../utils/AppError';
import type { ITrackingResponse } from './tracking.interface';

const getTrackingInfo = async (trackingNumber: string): Promise<ITrackingResponse> => {
  const shipment = await prisma.shipment.findUnique({
    where: {
      trackingNumber,
    },
    include: {
      originZone: true,
      destinationZone: true,
      events: {
        orderBy: {
          createdAt: 'asc',
        },
      },
    },
  });

  if (!shipment) {
    throw new AppError(httpStatus.NOT_FOUND, 'Shipment not found');
  }

  return {
    trackingNumber: shipment.trackingNumber,
    currentStatus: shipment.status,

    shipment: {
      recipientName: shipment.recipientName,
      deliveryAddress: shipment.deliveryAddress,
      weight: shipment.weight.toString(),
      deliveryCharge: shipment.deliveryCharge.toString(),
      codAmount: shipment.codAmount.toString(),
    },

    originZone: {
      name: shipment.originZone.name,
      code: shipment.originZone.code,
    },

    destinationZone: {
      name: shipment.destinationZone.name,
      code: shipment.destinationZone.code,
    },

    timeline: shipment.events.map((event) => ({
      status: event.status,
      description: event.description,
      location: event.location,
      createdAt: event.createdAt,
    })),
  };
};

export const trackingService = {
  getTrackingInfo,
};
