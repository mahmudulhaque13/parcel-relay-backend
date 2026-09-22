import httpStatus from 'http-status-codes';

import { prisma } from '../../lib/prisma';
import { AppError } from '../../utils/AppError';

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
      createdAt: 'desc',
    },
  });

  if (!users.length) {
    throw new AppError(httpStatus.NOT_FOUND, 'No users found');
  }

  return users;
};

const getMyProfile = async (userId: string) => {
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
      createdAt: true,
      updatedAt: true,
      courierProfile: true,
    },
  });

  if (!user) {
    throw new AppError(httpStatus.NOT_FOUND, 'User not found');
  }

  return user;
};

interface IUpdateMyProfile {
  name?: string;
  imageUrl?: string;
}

const updateMyProfile = async (userId: string, payload: IUpdateMyProfile) => {
  const user = await prisma.user.findFirst({
    where: {
      id: userId,
      isDeleted: false,
    },
    select: {
      id: true,
    },
  });

  if (!user) {
    throw new AppError(httpStatus.NOT_FOUND, 'User not found');
  }

  const updatedUser = await prisma.user.update({
    where: {
      id: userId,
    },
    data: payload,
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      status: true,
      authProvider: true,
      emailVerified: true,
      imageUrl: true,
      createdAt: true,
      updatedAt: true,
      courierProfile: true,
    },
  });

  return updatedUser;
};

export const userService = {
  getAllUsers,
  getMyProfile,
  updateMyProfile,
};
