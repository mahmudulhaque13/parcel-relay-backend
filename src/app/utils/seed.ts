import bcrypt from 'bcrypt';
import httpStatus from 'http-status-codes';

import { CourierApplicationStatus, UserRole, UserStatus } from '../../generated/prisma/enums';
import config from '../config';
import { prisma } from '../lib/prisma';
import { AppError } from './AppError';

export const seedAdmin = async () => {
  try {
    const isAdminExist = await prisma.user.findFirst({
      where: {
        role: UserRole.ADMIN,
      },
    });

    if (isAdminExist) {
      console.log('Admin Already Exists!');
      return;
    }

    const name = config.admin_name;
    const email = config.admin_email;
    const password = config.admin_password;

    if (!name || !email || !password) {
      throw new AppError(
        httpStatus.INTERNAL_SERVER_ERROR,
        'Admin Name, Email, Password Missing In Env File!!!',
      );
    }

    const hashedPassword = await bcrypt.hash(password, Number(config.bcrypt_salt_rounds));

    const admin = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        role: UserRole.ADMIN,
        needPasswordChange: false,
        emailVerified: true,
      },
    });

    console.log('Admin Created:', admin.email);
  } catch (error) {
    console.log('Error Seeding Admin:', error);
  }
};

export const seedDemoUsers = async () => {
  try {
    const demoPassword = config.demo_password;

    if (!demoPassword) {
      throw new AppError(httpStatus.INTERNAL_SERVER_ERROR, 'Demo Password Missing In Env File!!!');
    }

    const hashedPassword = await bcrypt.hash(demoPassword, Number(config.bcrypt_salt_rounds));

    // -------------------------
    // Demo Customer
    // -------------------------

    const customer = await prisma.user.upsert({
      where: {
        email: 'customer@parcelrelay.demo',
      },

      update: {
        name: 'Demo Customer',
        password: hashedPassword,
        role: UserRole.CUSTOMER,
        status: UserStatus.ACTIVE,
        emailVerified: true,
        isDeleted: false,
      },

      create: {
        name: 'Demo Customer',
        email: 'customer@parcelrelay.demo',
        password: hashedPassword,
        role: UserRole.CUSTOMER,
        status: UserStatus.ACTIVE,
        emailVerified: true,
        isDeleted: false,
      },
    });

    // -------------------------
    // Demo Courier
    // -------------------------

    const courier = await prisma.user.upsert({
      where: {
        email: 'courier@parcelrelay.demo',
      },

      update: {
        name: 'Demo Courier',
        password: hashedPassword,
        role: UserRole.COURIER,
        status: UserStatus.ACTIVE,
        emailVerified: true,
        isDeleted: false,
      },

      create: {
        name: 'Demo Courier',
        email: 'courier@parcelrelay.demo',
        password: hashedPassword,
        role: UserRole.COURIER,
        status: UserStatus.ACTIVE,
        emailVerified: true,
        isDeleted: false,
      },
    });

    // -------------------------
    // Demo Courier Profile
    // -------------------------

    await prisma.courierProfile.upsert({
      where: {
        userId: courier.id,
      },

      update: {
        phone: '01700000000',
        vehicleType: 'Bike',
        vehicleNumber: 'DHAKA-DEMO',
        isAvailable: true,
        isVerified: true,
        applicationStatus: CourierApplicationStatus.APPROVED,
      },

      create: {
        userId: courier.id,
        phone: '01700000000',
        vehicleType: 'Bike',
        vehicleNumber: 'DHAKA-DEMO',
        isAvailable: true,
        isVerified: true,
        applicationStatus: CourierApplicationStatus.APPROVED,
      },
    });

    console.log('Demo Customer Ready:', customer.email);
    console.log('Demo Courier Ready:', courier.email);
  } catch (error) {
    console.log('Error Seeding Demo Users:', error);
  }
};
