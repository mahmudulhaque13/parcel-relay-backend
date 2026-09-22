import httpStatus from "http-status-codes";

import { prisma } from "../../lib/prisma";
import { AppError } from "../../utils/AppError";
import type {
  IAdminUserQuery,
  IAuditLogQuery,
  IReassignCourier,
  IShipmentReportQuery,
  IUpdateUserRole,
  IUpdateUserStatus,
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

const updateUserStatus = async (
  adminId: string,
  userId: string,
  payload: IUpdateUserStatus,
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
    },
  });

  if (!user) {
    throw new AppError(httpStatus.NOT_FOUND, "User not found");
  }

  if (user.status === payload.status) {
    throw new AppError(httpStatus.CONFLICT, "User already has this status");
  }

  const result = await prisma.$transaction(async (tx) => {
    const updatedUser = await tx.user.update({
      where: {
        id: userId,
      },
      data: {
        status: payload.status,
        ...(payload.status === "DELETED"
          ? {
              isDeleted: true,
              deletedAt: new Date(),
            }
          : {
              isDeleted: false,
              deletedAt: null,
            }),
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        status: true,
        isDeleted: true,
        deletedAt: true,
      },
    });

    await tx.auditLog.create({
      data: {
        userId: adminId,
        action: "UPDATE",
        entityType: "User",
        entityId: userId,
        description: `User status changed from ${user.status} to ${payload.status}`,
        metadata: {
          previousStatus: user.status,
          newStatus: payload.status,
        },
      },
    });

    return updatedUser;
  });

  return result;
};

const getAuditLogs = async (query: IAuditLogQuery) => {
  const {
    page = 1,
    limit = 10,
    action,
    entityType,
    userId,
    q,
    sortOrder = "desc",
  } = query;

  const skip = (page - 1) * limit;

  const where: any = {
    ...(action ? { action: action as any } : {}),
    ...(entityType
      ? {
          entityType: {
            contains: entityType,
            mode: "insensitive",
          },
        }
      : {}),
    ...(userId ? { userId } : {}),
    ...(q
      ? {
          OR: [
            {
              description: {
                contains: q,
                mode: "insensitive",
              },
            },
            {
              entityType: {
                contains: q,
                mode: "insensitive",
              },
            },
            {
              entityId: {
                contains: q,
                mode: "insensitive",
              },
            },
          ],
        }
      : {}),
  };

  const [logs, total] = await prisma.$transaction([
    prisma.auditLog.findMany({
      where,
      skip,
      take: limit,
      orderBy: {
        createdAt: sortOrder,
      },
      select: {
        id: true,
        userId: true,
        action: true,
        entityType: true,
        entityId: true,
        description: true,
        metadata: true,
        createdAt: true,
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          },
        },
      },
    }),
    prisma.auditLog.count({
      where,
    }),
  ]);

  return {
    data: logs,
    meta: {
      page,
      limit,
      total,
      totalPage: Math.ceil(total / limit),
    },
  };
};

const getDashboardStats = async () => {
  const [
    totalUsers,
    customers,
    couriers,
    admins,

    totalShipments,
    pendingPayment,
    readyForAssignment,
    inTransit,
    delivered,
    cancelled,
    returned,

    totalPayments,
    paidPayments,
    pendingPayments,
    failedPayments,
    refundedPayments,

    totalCouriers,
    availableCouriers,
    unavailableCouriers,
  ] = await Promise.all([
    // Users
    prisma.user.count({
      where: {
        isDeleted: false,
      },
    }),

    prisma.user.count({
      where: {
        role: "CUSTOMER",
        isDeleted: false,
      },
    }),

    prisma.user.count({
      where: {
        role: "COURIER",
        isDeleted: false,
      },
    }),

    prisma.user.count({
      where: {
        role: "ADMIN",
        isDeleted: false,
      },
    }),

    // Shipments
    prisma.shipment.count({
      where: {
        isDeleted: false,
      },
    }),

    prisma.shipment.count({
      where: {
        status: "PENDING_PAYMENT",
        isDeleted: false,
      },
    }),

    prisma.shipment.count({
      where: {
        status: "READY_FOR_ASSIGNMENT",
        isDeleted: false,
      },
    }),

    prisma.shipment.count({
      where: {
        status: "IN_TRANSIT",
        isDeleted: false,
      },
    }),

    prisma.shipment.count({
      where: {
        status: "DELIVERED",
        isDeleted: false,
      },
    }),

    prisma.shipment.count({
      where: {
        status: "CANCELLED",
        isDeleted: false,
      },
    }),

    prisma.shipment.count({
      where: {
        status: "RETURNED_TO_SENDER",
        isDeleted: false,
      },
    }),

    // Payments
    prisma.paymentAttempt.count(),

    prisma.paymentAttempt.count({
      where: {
        status: "PAID",
      },
    }),

    prisma.paymentAttempt.count({
      where: {
        status: "PENDING",
      },
    }),

    prisma.paymentAttempt.count({
      where: {
        status: "FAILED",
      },
    }),

    prisma.paymentAttempt.count({
      where: {
        status: "REFUNDED",
      },
    }),

    // Courier availability
    prisma.courierProfile.count({
      where: {
        user: {
          isDeleted: false,
        },
      },
    }),

    prisma.courierProfile.count({
      where: {
        isAvailable: true,
        user: {
          isDeleted: false,
        },
      },
    }),

    prisma.courierProfile.count({
      where: {
        isAvailable: false,
        user: {
          isDeleted: false,
        },
      },
    }),
  ]);

  return {
    users: {
      total: totalUsers,
      customers,
      couriers,
      admins,
    },

    shipments: {
      total: totalShipments,
      pendingPayment,
      readyForAssignment,
      inTransit,
      delivered,
      cancelled,
      returned,
    },

    payments: {
      total: totalPayments,
      paid: paidPayments,
      pending: pendingPayments,
      failed: failedPayments,
      refunded: refundedPayments,
    },

    couriers: {
      total: totalCouriers,
      available: availableCouriers,
      unavailable: unavailableCouriers,
    },
  };
};

const getShipmentReports = async (query: IShipmentReportQuery) => {
  const {
    page = 1,
    limit = 10,
    status,
    originZoneId,
    destinationZoneId,
    q,
    sortBy = "createdAt",
    sortOrder = "desc",
  } = query;

  const skip = (page - 1) * limit;

  const where = {
    isDeleted: false,

    ...(status ? { status } : {}),

    ...(originZoneId ? { originZoneId } : {}),

    ...(destinationZoneId ? { destinationZoneId } : {}),

    ...(q
      ? {
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
            {
              recipientPhone: {
                contains: q,
                mode: "insensitive" as const,
              },
            },
          ],
        }
      : {}),
  };

  const [shipments, total, summary] = await prisma.$transaction([
    prisma.shipment.findMany({
      where,
      skip,
      take: limit,
      orderBy: {
        [sortBy]: sortOrder,
      },
      select: {
        id: true,
        trackingNumber: true,
        recipientName: true,
        recipientPhone: true,
        deliveryAddress: true,
        weight: true,
        deliveryCharge: true,
        codAmount: true,
        status: true,
        paymentStatus: true,
        createdAt: true,
        updatedAt: true,

        customer: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },

        originZone: {
          select: {
            id: true,
            name: true,
            code: true,
          },
        },

        destinationZone: {
          select: {
            id: true,
            name: true,
            code: true,
          },
        },
      },
    }),

    prisma.shipment.count({
      where,
    }),

    prisma.shipment.aggregate({
      where,
      _count: {
        id: true,
      },
      _sum: {
        deliveryCharge: true,
        codAmount: true,
        weight: true,
      },
    }),
  ]);

  return {
    data: shipments,

    summary: {
      totalShipments: summary._count.id,
      totalDeliveryCharge: summary._sum.deliveryCharge ?? 0,
      totalCodAmount: summary._sum.codAmount ?? 0,
      totalWeight: summary._sum.weight ?? 0,
    },

    meta: {
      page,
      limit,
      total,
      totalPage: Math.ceil(total / limit),
    },
  };
};

export const adminService = {
  reassignCourier,
  getAdminUsers,
  getAdminUserById,
  updateUserRole,
  updateUserStatus,
  getAuditLogs,
  getDashboardStats,
  getShipmentReports,
};
