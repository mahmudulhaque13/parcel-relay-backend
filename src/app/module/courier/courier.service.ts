import bcrypt from 'bcryptjs';
import httpStatus from 'http-status-codes';

import { ShipmentStatus } from '../../../generated/prisma/enums';
import config from '../../config';
import { prisma } from '../../lib/prisma';
import { AppError } from '../../utils/AppError';
import type { IAssignCourier, ICreateCourier, ICourierShipmentQuery } from './courier.interface';

const createCourier = async (payload: ICreateCourier) => {
  const existingUser = await prisma.user.findUnique({
    where: {
      email: payload.email,
    },
  });

  if (existingUser) {
    throw new AppError(httpStatus.CONFLICT, 'User with this email already exists');
  }

  const hashedPassword = await bcrypt.hash(payload.password, Number(config.bcrypt_salt_rounds));

  const result = await prisma.$transaction(async (tx) => {
    const courier = await tx.user.create({
      data: {
        name: payload.name,
        email: payload.email,
        password: hashedPassword,
        role: 'COURIER',
        status: 'ACTIVE',
        authProvider: 'CREDENTIAL',
        emailVerified: false,
      },
    });

    await tx.courierProfile.create({
      data: {
        userId: courier.id,
        phone: payload.phone,
      },
    });

    return courier;
  });

  return {
    id: result.id,
    name: result.name,
    email: result.email,
    role: result.role,
    status: result.status,
  };
};

const assignCourier = async (adminId: string, payload: IAssignCourier) => {
  const courier = await prisma.user.findFirst({
    where: {
      id: payload.courierId,
      role: 'COURIER',
      status: 'ACTIVE',
      isDeleted: false,
    },
    include: {
      courierProfile: true,
    },
  });

  if (!courier) {
    throw new AppError(httpStatus.NOT_FOUND, 'Active courier not found');
  }

  const courierProfile = courier.courierProfile;

  if (!courierProfile) {
    throw new AppError(httpStatus.BAD_REQUEST, 'Courier profile not found');
  }

  const result = await prisma.$transaction(async (tx) => {
    const updatedShipment = await tx.shipment.updateMany({
      where: {
        id: payload.shipmentId,
        courierId: null,
        status: 'READY_FOR_ASSIGNMENT',
      },
      data: {
        courierId: courierProfile.id,
        status: 'ASSIGNED',
      },
    });

    if (updatedShipment.count !== 1) {
      throw new AppError(httpStatus.CONFLICT, 'Shipment is no longer available for assignment');
    }

    const shipmentEvent = await tx.shipmentEvent.create({
      data: {
        shipmentId: payload.shipmentId,
        status: 'ASSIGNED',
        description: `Shipment assigned to courier ${courier.name}`,
      },
    });

    await tx.auditLog.create({
      data: {
        userId: adminId,
        action: 'ASSIGN',
        entityType: 'Shipment',
        entityId: payload.shipmentId,
        description: `Shipment assigned to courier ${courier.name}`,
        metadata: {
          courierId: payload.courierId,
          courierName: courier.name,
        },
      },
    });

    return {
      shipmentId: payload.shipmentId,
      courierId: payload.courierId,
      status: 'ASSIGNED',
      eventId: shipmentEvent.id,
    };
  });

  return result;
};

const getCourierShipments = async (courierUserId: string, query: ICourierShipmentQuery) => {
  const { page = 1, limit = 10, status, q, sortOrder = 'desc' } = query;

  const courier = await prisma.courierProfile.findUnique({
    where: {
      userId: courierUserId,
    },
    select: {
      id: true,
    },
  });

  if (!courier) {
    throw new AppError(httpStatus.NOT_FOUND, 'Courier profile not found');
  }

  const skip = (page - 1) * limit;

  const where = {
    courierId: courier.id,
    isDeleted: false,
    ...(status && {
      status: status as ShipmentStatus,
    }),
    ...(q && {
      OR: [
        {
          trackingNumber: {
            contains: q,
            mode: 'insensitive' as const,
          },
        },
        {
          recipientName: {
            contains: q,
            mode: 'insensitive' as const,
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
      },
      orderBy: {
        createdAt: sortOrder,
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

const getCourierShipmentById = async (courierUserId: string, shipmentId: string) => {
  const courier = await prisma.courierProfile.findUnique({
    where: {
      userId: courierUserId,
    },
    select: {
      id: true,
    },
  });

  if (!courier) {
    throw new AppError(httpStatus.NOT_FOUND, 'Courier profile not found');
  }

  const shipment = await prisma.shipment.findFirst({
    where: {
      id: shipmentId,
      courierId: courier.id,
      isDeleted: false,
    },
    include: {
      originZone: true,
      destinationZone: true,
      pickupRequest: true,
      transfers: {
        orderBy: {
          createdAt: 'asc',
        },
      },
      events: {
        orderBy: {
          createdAt: 'asc',
        },
      },
    },
  });

  if (!shipment) {
    throw new AppError(httpStatus.NOT_FOUND, 'Shipment not found or not assigned to you');
  }

  return shipment;
};

export const courierService = {
  createCourier,
  assignCourier,
  getCourierShipments,
  getCourierShipmentById,
};
