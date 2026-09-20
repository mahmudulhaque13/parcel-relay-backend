import httpStatus from "http-status-codes";

import { prisma } from "../../lib/prisma";
import { AppError } from "../../utils/AppError";
import type { ICreateZone } from "./zone.interface";

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

export const zoneService = {
  createZone,
};
