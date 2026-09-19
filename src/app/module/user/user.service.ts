import httpStatus from "http-status-codes";

import { prisma } from "../../lib/prisma";
import { AppError } from "../../utils/AppError";

const getAllUsers = async () => {
  const users = await prisma.user.findMany({
    where: {
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
      createdAt: true,
      updatedAt: true,
      courierProfile: true,
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  if (!users.length) {
    throw new AppError(httpStatus.NOT_FOUND, "No users found");
  }

  return users;
};

export const userService = {
  getAllUsers,
};
