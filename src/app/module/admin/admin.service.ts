import httpStatus from "http-status-codes";

import { prisma } from "../../lib/prisma";
import { AppError } from "../../utils/AppError";
import type {
  IAdminUserQuery,
  IReassignCourier,
  IUpdateUserRole,
} from "./admin.interface";

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

const getAdminUsers = async (query: IAdminUserQuery) => {
  const { page = 1, limit = 10, role, status, q, sortOrder = "desc" } = query;

  const skip = (page - 1) * limit;

  const where = {
    ...(role && {
      role,
    }),

    ...(status && {
      status,
    }),

    ...(q && {
      OR: [
        {
          name: {
            contains: q,
            mode: "insensitive" as const,
          },
        },
        {
          email: {
            contains: q,
            mode: "insensitive" as const,
          },
        },
      ],
    }),
  };

  const [users, total] = await prisma.$transaction([
    prisma.user.findMany({
      where,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        status: true,
        authProvider: true,
        emailVerified: true,
        imageUrl: true,
        isDeleted: true,
        deletedAt: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: {
        createdAt: sortOrder,
      },
      skip,
      take: limit,
    }),

    prisma.user.count({
      where,
    }),
  ]);

  return {
    data: users,
    meta: {
      page,
      limit,
      total,
      totalPage: Math.ceil(total / limit),
    },
  };
};

const getAdminUserById = async (userId: string) => {
  const user = await prisma.user.findFirst({
    where: {
      id: userId,
      isDeleted: false,
    },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      status: true,
      authProvider: true,
      emailVerified: true,
      imageUrl: true,
      isDeleted: true,
      deletedAt: true,
      createdAt: true,
      updatedAt: true,
      courierProfile: true,
    },
  });

  if (!user) {
    throw new AppError(httpStatus.NOT_FOUND, "User not found");
  }

  return user;
};

const updateUserRole = async (
  adminId: string,
  userId: string,
  payload: IUpdateUserRole,
) => {
  const user = await prisma.user.findFirst({
    where: {
      id: userId,
      isDeleted: false,
    },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      status: true,
      courierProfile: {
        select: {
          id: true,
        },
      },
    },
  });

  if (!user) {
    throw new AppError(httpStatus.NOT_FOUND, "User not found");
  }

  if (user.role === payload.role) {
    throw new AppError(httpStatus.CONFLICT, "User already has this role");
  }

  const result = await prisma.$transaction(async (tx) => {
    if (payload.role === "COURIER" && !user.courierProfile) {
      if (!payload.phone) {
        throw new AppError(
          httpStatus.BAD_REQUEST,
          "Phone number is required when changing role to COURIER",
        );
      }

      await tx.courierProfile.create({
        data: {
          userId: user.id,
          phone: payload.phone,
        },
      });
    }

    const updatedUser = await tx.user.update({
      where: {
        id: userId,
      },
      data: {
        role: payload.role,
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        status: true,
      },
    });

    await tx.auditLog.create({
      data: {
        userId: adminId,
        action: "UPDATE",
        entityType: "User",
        entityId: userId,
        description: `User role changed from ${user.role} to ${payload.role}`,
        metadata: {
          previousRole: user.role,
          newRole: payload.role,
        },
      },
    });

    return updatedUser;
  });

  return result;
};

export const adminService = {
  reassignCourier,
  getAdminUsers,
  getAdminUserById,
  updateUserRole,
};
