import httpStatus from "http-status-codes";

import { prisma } from "../../lib/prisma";
import { AppError } from "../../utils/AppError";
import type {
  ICreateTransfer,
  IUpdateTransferStatus,
} from "./transfer.interface";

const createTransfer = async (actorId: string, payload: ICreateTransfer) => {
  const shipment = await prisma.shipment.findUnique({
    where: {
      id: payload.shipmentId,
    },
  });

  if (!shipment) {
    throw new AppError(httpStatus.NOT_FOUND, "Shipment not found");
  }

  const existingTransfer = await prisma.shipmentTransfer.findFirst({
    where: {
      shipmentId: payload.shipmentId,
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
        shipmentId: payload.shipmentId,
        fromHubId: payload.fromHubId,
        toHubId: payload.toHubId,
        status: "CREATED",
      },
    });

    const updatedShipment = await tx.shipment.updateMany({
      where: {
        id: payload.shipmentId,
        status: "PICKED_UP",
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
        shipmentId: payload.shipmentId,
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
          shipmentId: payload.shipmentId,
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

const updateTransferStatus = async (
  actorId: string,
  transferId: string,
  payload: IUpdateTransferStatus,
) => {
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

  // Verify the logged-in user is a courier
  const courier = await prisma.courierProfile.findUnique({
    where: {
      userId: actorId,
    },
  });

  if (!courier) {
    throw new AppError(httpStatus.FORBIDDEN, "Courier profile not found");
  }

  // Verify that this courier is assigned to the shipment
  if (transfer.shipment.courierId !== courier.id) {
    throw new AppError(
      httpStatus.FORBIDDEN,
      "You are not assigned to this shipment",
    );
  }

  const allowedTransitions: Record<string, string[]> = {
    CREATED: ["IN_TRANSIT", "CANCELLED"],
    IN_TRANSIT: ["RECEIVED", "CANCELLED"],
    RECEIVED: [],
    CANCELLED: [],
  };

  const allowedStatuses = allowedTransitions[transfer.status] ?? [];

  if (!allowedStatuses.includes(payload.status)) {
    throw new AppError(
      httpStatus.CONFLICT,
      `Invalid transfer status transition from ${transfer.status} to ${payload.status}`,
    );
  }

  const result = await prisma.$transaction(async (tx) => {
    const updatedTransfer = await tx.shipmentTransfer.updateMany({
      where: {
        id: transferId,
        status: transfer.status,
      },
      data: {
        status: payload.status,
      },
    });

    if (updatedTransfer.count !== 1) {
      throw new AppError(
        httpStatus.CONFLICT,
        "Transfer status was changed by another request",
      );
    }

    // CREATED -> IN_TRANSIT
    if (payload.status === "IN_TRANSIT") {
      const updatedShipment = await tx.shipment.updateMany({
        where: {
          id: transfer.shipmentId,
          status: "AT_ORIGIN_HUB",
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

      await tx.shipmentTransfer.update({
        where: {
          id: transferId,
        },
        data: {
          dispatchedAt: new Date(),
        },
      });

      await tx.shipmentEvent.create({
        data: {
          shipmentId: transfer.shipmentId,
          status: "IN_TRANSIT",
          description: `Shipment is in transit to ${transfer.toHub!.name}`,
          location: transfer.fromHub!.name,
        },
      });
    }

    // IN_TRANSIT -> RECEIVED
    if (payload.status === "RECEIVED") {
      const updatedShipment = await tx.shipment.updateMany({
        where: {
          id: transfer.shipmentId,
          status: "IN_TRANSIT",
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

      await tx.shipmentTransfer.update({
        where: {
          id: transferId,
        },
        data: {
          receivedAt: new Date(),
        },
      });

      await tx.shipmentEvent.create({
        data: {
          shipmentId: transfer.shipmentId,
          status: "AT_DESTINATION_HUB",
          description: `Shipment received at ${transfer.toHub!.name}`,
          location: transfer.toHub!.name,
        },
      });
    }

    // Audit log
    await tx.auditLog.create({
      data: {
        userId: actorId,
        action: "TRANSFER",
        entityType: "ShipmentTransfer",
        entityId: transferId,
        description: `Transfer status changed from ${transfer.status} to ${payload.status}`,
        metadata: {
          shipmentId: transfer.shipmentId,
          fromHubId: transfer.fromHubId,
          toHubId: transfer.toHubId,
        },
      },
    });

    const transferResult = await tx.shipmentTransfer.findUnique({
      where: {
        id: transferId,
      },
    });

    return transferResult;
  });

  return result;
};

export const transferService = {
  createTransfer,
  updateTransferStatus,
};
