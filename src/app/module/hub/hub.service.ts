import httpStatus from "http-status-codes";

import { prisma } from "../../lib/prisma";
import { AppError } from "../../utils/AppError";
import type { ICreateHub, IUpdateHub } from "./hub.interface";

const createHub = async (payload: ICreateHub) => {
  const existingHub = await prisma.hub.findUnique({
    where: {
      code: payload.code,
    },
  });

  if (existingHub) {
    throw new AppError(
      httpStatus.CONFLICT,
      "Hub with this code already exists",
    );
  }

  const zone = await prisma.zone.findUnique({
    where: {
      id: payload.zoneId,
    },
  });

  if (!zone) {
    throw new AppError(httpStatus.NOT_FOUND, "Zone not found");
  }

  if (!zone.isActive) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      "Cannot create hub under an inactive zone",
    );
  }

  const hub = await prisma.hub.create({
    data: {
      name: payload.name,
      code: payload.code,
      address: payload.address,
      zoneId: payload.zoneId,
    },
  });

  return hub;
};

const getAllHubs = async () => {
  const hubs = await prisma.hub.findMany({
    where: {
      isActive: true,
    },
    include: {
      zone: true,
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  return hubs;
};

const updateHub = async (hubId: string, payload: IUpdateHub) => {
  const existingHub = await prisma.hub.findUnique({
    where: {
      id: hubId,
    },
  });

  if (!existingHub) {
    throw new AppError(httpStatus.NOT_FOUND, "Hub not found");
  }

  if (payload.code && payload.code !== existingHub.code) {
    const existingCode = await prisma.hub.findUnique({
      where: {
        code: payload.code,
      },
    });

    if (existingCode) {
      throw new AppError(
        httpStatus.CONFLICT,
        "Hub with this code already exists",
      );
    }
  }

  if (payload.zoneId && payload.zoneId !== existingHub.zoneId) {
    const zone = await prisma.zone.findUnique({
      where: {
        id: payload.zoneId,
      },
    });

    if (!zone) {
      throw new AppError(httpStatus.NOT_FOUND, "Zone not found");
    }

    if (!zone.isActive) {
      throw new AppError(
        httpStatus.BAD_REQUEST,
        "Cannot move hub to an inactive zone",
      );
    }
  }

  const hub = await prisma.hub.update({
    where: {
      id: hubId,
    },
    data: payload,
  });

  return hub;
};

const deactivateHub = async (hubId: string) => {
  const existingHub = await prisma.hub.findUnique({
    where: {
      id: hubId,
    },
  });

  if (!existingHub) {
    throw new AppError(httpStatus.NOT_FOUND, "Hub not found");
  }

  if (!existingHub.isActive) {
    throw new AppError(httpStatus.BAD_REQUEST, "Hub is already inactive");
  }

  const hub = await prisma.hub.update({
    where: {
      id: hubId,
    },
    data: {
      isActive: false,
    },
  });

  return hub;
};

export const hubService = {
  createHub,
  getAllHubs,
  updateHub,
  deactivateHub,
};
