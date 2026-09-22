import httpStatus from "http-status-codes";

import { prisma } from "../../lib/prisma";
import { AppError } from "../../utils/AppError";

import type { ICreateTransfer } from "./transfer.interface";

const createTransfer = async (
  actorId: string,
  shipmentId: string,
  payload: ICreateTransfer,
) => {
  const shipment = await prisma.shipment.findFirst({
    where: {
      id: shipmentId,
      isDeleted: false,
    },
  });

  if (!shipment) {
    throw new AppError(httpStatus.NOT_FOUND, "Shipment not found");
  }

  const existingTransfer = await prisma.shipmentTransfer.findFirst({
    where: {
      shipmentId,
      status: {
        in: ["CREATED", "IN_TRANSIT"],
      },
    },
  });

  if (existingTransfer) {
    throw new AppError(
      httpStatus.CONFLICT,
      "Shipment already has an active transfer",
    );
  }

  if (shipment.status !== "PICKED_UP") {
    throw new AppError(
      httpStatus.CONFLICT,
      "Transfer can only be created for a picked up shipment",
    );
  }

  if (payload.fromHubId === payload.toHubId) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      "Source and destination hubs must be different",
    );
  }

  const [fromHub, toHub] = await Promise.all([
    prisma.hub.findUnique({
      where: {
        id: payload.fromHubId,
      },
    }),
    prisma.hub.findUnique({
      where: {
        id: payload.toHubId,
      },
    }),
  ]);

  if (!fromHub || !fromHub.isActive) {
    throw new AppError(
      httpStatus.NOT_FOUND,
      "Source hub not found or inactive",
    );
  }

  if (!toHub || !toHub.isActive) {
    throw new AppError(
      httpStatus.NOT_FOUND,
      "Destination hub not found or inactive",
    );
  }

  const result = await prisma.$transaction(async (tx) => {
    const transfer = await tx.shipmentTransfer.create({
      data: {
        shipmentId,
        fromHubId: payload.fromHubId,
        toHubId: payload.toHubId,
        status: "CREATED",
      },
    });

    const updatedShipment = await tx.shipment.updateMany({
      where: {
        id: shipmentId,
        status: "PICKED_UP",
        isDeleted: false,
      },
      data: {
        status: "AT_ORIGIN_HUB",
      },
    });

    if (updatedShipment.count !== 1) {
      throw new AppError(
        httpStatus.CONFLICT,
        "Shipment status changed before transfer creation",
      );
    }

    const shipmentEvent = await tx.shipmentEvent.create({
      data: {
        shipmentId,
        status: "AT_ORIGIN_HUB",
        description: `Shipment arrived at ${fromHub.name}`,
        location: fromHub.name,
      },
    });

    await tx.auditLog.create({
      data: {
        userId: actorId,
        action: "TRANSFER",
        entityType: "ShipmentTransfer",
        entityId: transfer.id,
        description: `Shipment transfer created from ${fromHub.name} to ${toHub.name}`,
        metadata: {
          shipmentId,
          fromHubId: payload.fromHubId,
          toHubId: payload.toHubId,
        },
      },
    });

    return {
      transfer,
      shipmentEvent,
    };
  });

  return result;
};

const dispatchTransfer = async (actorId: string, transferId: string) => {
  const transfer = await prisma.shipmentTransfer.findUnique({
    where: {
      id: transferId,
    },
    include: {
      shipment: true,
      fromHub: true,
      toHub: true,
    },
  });

  if (!transfer) {
    throw new AppError(httpStatus.NOT_FOUND, "Transfer not found");
  }

  if (transfer.shipment.isDeleted) {
    throw new AppError(httpStatus.NOT_FOUND, "Shipment not found");
  }

  if (transfer.status !== "CREATED") {
    throw new AppError(
      httpStatus.CONFLICT,
      `Transfer cannot be dispatched from ${transfer.status} status`,
    );
  }

  const result = await prisma.$transaction(async (tx) => {
    const updatedTransfer = await tx.shipmentTransfer.updateMany({
      where: {
        id: transferId,
        status: "CREATED",
      },
      data: {
        status: "IN_TRANSIT",
        dispatchedAt: new Date(),
      },
    });

    if (updatedTransfer.count !== 1) {
      throw new AppError(
        httpStatus.CONFLICT,
        "Transfer was changed by another request",
      );
    }

    const updatedShipment = await tx.shipment.updateMany({
      where: {
        id: transfer.shipmentId,
        status: "AT_ORIGIN_HUB",
        isDeleted: false,
      },
      data: {
        status: "IN_TRANSIT",
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
        shipmentId: transfer.shipmentId,
        status: "IN_TRANSIT",
        description: `Shipment is in transit to ${transfer.toHub!.name}`,
        location: transfer.fromHub!.name,
      },
    });

    await tx.auditLog.create({
      data: {
        userId: actorId,
        action: "TRANSFER",
        entityType: "ShipmentTransfer",
        entityId: transferId,
        description: "Shipment transfer dispatched",
        metadata: {
          shipmentId: transfer.shipmentId,
          fromHubId: transfer.fromHubId,
          toHubId: transfer.toHubId,
        },
      },
    });

    return tx.shipmentTransfer.findUnique({
      where: {
        id: transferId,
      },
    });
  });

  return result;
};

const receiveTransfer = async (actorId: string, transferId: string) => {
  const transfer = await prisma.shipmentTransfer.findUnique({
    where: {
      id: transferId,
    },
    include: {
      shipment: true,
      toHub: true,
    },
  });

  if (!transfer) {
    throw new AppError(httpStatus.NOT_FOUND, "Transfer not found");
  }

  if (transfer.shipment.isDeleted) {
    throw new AppError(httpStatus.NOT_FOUND, "Shipment not found");
  }

  if (transfer.status !== "IN_TRANSIT") {
    throw new AppError(
      httpStatus.CONFLICT,
      `Transfer cannot be received from ${transfer.status} status`,
    );
  }

  const result = await prisma.$transaction(async (tx) => {
    const updatedTransfer = await tx.shipmentTransfer.updateMany({
      where: {
        id: transferId,
        status: "IN_TRANSIT",
      },
      data: {
        status: "RECEIVED",
        receivedAt: new Date(),
      },
    });

    if (updatedTransfer.count !== 1) {
      throw new AppError(
        httpStatus.CONFLICT,
        "Transfer was changed by another request",
      );
    }

    const updatedShipment = await tx.shipment.updateMany({
      where: {
        id: transfer.shipmentId,
        status: "IN_TRANSIT",
        isDeleted: false,
      },
      data: {
        status: "AT_DESTINATION_HUB",
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
        shipmentId: transfer.shipmentId,
        status: "AT_DESTINATION_HUB",
        description: `Shipment received at ${transfer.toHub!.name}`,
        location: transfer.toHub!.name,
      },
    });

    await tx.auditLog.create({
      data: {
        userId: actorId,
        action: "TRANSFER",
        entityType: "ShipmentTransfer",
        entityId: transferId,
        description: "Shipment transfer received",
        metadata: {
          shipmentId: transfer.shipmentId,
          fromHubId: transfer.fromHubId,
          toHubId: transfer.toHubId,
        },
      },
    });

    return tx.shipmentTransfer.findUnique({
      where: {
        id: transferId,
      },
    });
  });

  return result;
};

const cancelTransfer = async (actorId: string, transferId: string) => {
  const transfer = await prisma.shipmentTransfer.findUnique({
    where: {
      id: transferId,
    },
    include: {
      shipment: true,
    },
  });

  if (!transfer) {
    throw new AppError(httpStatus.NOT_FOUND, "Transfer not found");
  }

  if (transfer.shipment.isDeleted) {
    throw new AppError(httpStatus.NOT_FOUND, "Shipment not found");
  }

  if (!["CREATED", "IN_TRANSIT"].includes(transfer.status)) {
    throw new AppError(
      httpStatus.CONFLICT,
      `Transfer cannot be cancelled from ${transfer.status} status`,
    );
  }

  const result = await prisma.$transaction(async (tx) => {
    const updatedTransfer = await tx.shipmentTransfer.updateMany({
      where: {
        id: transferId,
        status: transfer.status,
      },
      data: {
        status: "CANCELLED",
      },
    });

    if (updatedTransfer.count !== 1) {
      throw new AppError(
        httpStatus.CONFLICT,
        "Transfer was changed by another request",
      );
    }

    await tx.auditLog.create({
      data: {
        userId: actorId,
        action: "TRANSFER",
        entityType: "ShipmentTransfer",
        entityId: transferId,
        description: `Shipment transfer cancelled from ${transfer.status} status`,
        metadata: {
          shipmentId: transfer.shipmentId,
        },
      },
    });

    return tx.shipmentTransfer.findUnique({
      where: {
        id: transferId,
      },
    });
  });

  return result;
};

const getShipmentTransfers = async (actorId: string, shipmentId: string) => {
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
      "You don't have permission to access these transfers",
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

  return prisma.shipmentTransfer.findMany({
    where: {
      shipmentId,
    },
    include: {
      fromHub: true,
      toHub: true,
    },
    orderBy: {
      createdAt: "asc",
    },
  });
};

export const transferService = {
  createTransfer,
  dispatchTransfer,
  receiveTransfer,
  cancelTransfer,
  getShipmentTransfers,
};
