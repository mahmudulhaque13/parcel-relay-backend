import httpStatus from "http-status-codes";

import { prisma } from "../../lib/prisma";
import { AppError } from "../../utils/AppError";
import type { ICreateZone, IUpdateZone } from "./zone.interface";

const createZone = async (payload: ICreateZone) => {
  const existingZone = await prisma.zone.findUnique({
    where: {
      code: payload.code,
    },
  });

  if (existingZone) {
    throw new AppError(
      httpStatus.CONFLICT,
      "Zone with this code already exists",
    );
  }

  const zone = await prisma.zone.create({
    data: {
      name: payload.name,
      code: payload.code,
      description: payload.description,
    },
  });

  return zone;
};

const getAllZones = async () => {
  const zones = await prisma.zone.findMany({
    where: {
      isActive: true,
      isDeleted: false,
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  return zones;
};

const updateZone = async (zoneId: string, payload: IUpdateZone) => {
  const existingZone = await prisma.zone.findFirst({
    where: {
      id: zoneId,
      isDeleted: false,
    },
  });

  if (!existingZone) {
    throw new AppError(httpStatus.NOT_FOUND, "Zone not found");
  }

  if (payload.code && payload.code !== existingZone.code) {
    const existingCode = await prisma.zone.findUnique({
      where: {
        code: payload.code,
      },
    });

    if (existingCode) {
      throw new AppError(
        httpStatus.CONFLICT,
        "Zone with this code already exists",
      );
    }
  }

  const zone = await prisma.zone.update({
    where: {
      id: zoneId,
    },
    data: payload,
  });

  return zone;
};

const deactivateZone = async (zoneId: string) => {
  const existingZone = await prisma.zone.findUnique({
    where: {
      id: zoneId,
    },
  });

  if (!existingZone) {
    throw new AppError(httpStatus.NOT_FOUND, "Zone not found");
  }

  if (!existingZone.isActive) {
    throw new AppError(httpStatus.BAD_REQUEST, "Zone is already inactive");
  }

  const zone = await prisma.zone.update({
    where: {
      id: zoneId,
    },
    data: {
      isActive: false,
    },
  });

  return zone;
};

const deleteZone = async (zoneId: string) => {
  const existingZone = await prisma.zone.findFirst({
    where: {
      id: zoneId,
      isDeleted: false,
    },
  });

  if (!existingZone) {
    throw new AppError(httpStatus.NOT_FOUND, "Zone not found");
  }

  const zone = await prisma.zone.update({
    where: {
      id: zoneId,
    },
    data: {
      isDeleted: true,
      deletedAt: new Date(),
      isActive: false,
    },
  });

  return zone;
};

export const zoneService = {
  createZone,
  getAllZones,
  updateZone,
  deactivateZone,
  deleteZone,
};
