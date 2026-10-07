import bcrypt from "bcryptjs";
import httpStatus from "http-status-codes";

import { ShipmentStatus } from "../../../generated/prisma/enums";

import config from "../../config";
import { prisma } from "../../lib/prisma";
import { AppError } from "../../utils/AppError";
import { emailUtils } from "../../utils/email";
import { otpUtils } from "../../utils/otp";
import { shippingLabelPdfUtils } from "../../utils/pdf/shipping-label.pdf";
import { cloudinaryUtils } from "../../utils/cloudinary";

import type {
  IAssignCourier,
  ICreateCourier,
  ICourierShipmentQuery,
  IReviewCourierApplication,
  IVerifyCourierEmail,
  ICourierApplicationFiles,
} from "./courier.interface";

const createCourier = async (payload: ICreateCourier) => {
  const existingUser = await prisma.user.findUnique({
    where: {
      email: payload.email,
    },
  });

  if (existingUser) {
    throw new AppError(
      httpStatus.CONFLICT,
      "User with this email already exists",
    );
  }

  const hashedPassword = await bcrypt.hash(
    payload.password,
    Number(config.bcrypt_salt_rounds),
  );

  const result = await prisma.$transaction(async (tx) => {
    const courier = await tx.user.create({
      data: {
        name: payload.name,
        email: payload.email,
        password: hashedPassword,
        role: "COURIER",
        status: "ACTIVE",
        authProvider: "CREDENTIAL",
        emailVerified: false,
      },
    });

    await tx.courierProfile.create({
      data: {
        userId: courier.id,
        phone: payload.phone,
      },
    });

    return courier;
  });

  return {
    id: result.id,
    name: result.name,
    email: result.email,
    role: result.role,
    status: result.status,
  };
};

const applyCourier = async (
  payload: ICreateCourier,
  files: ICourierApplicationFiles,
) => {
  if (!files.identityDocument || !files.profilePhoto) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      "Identity document and profile photo are required",
    );
  }

  const existingUser = await prisma.user.findUnique({
    where: { email: payload.email },
  });

  if (existingUser) {
    throw new AppError(
      httpStatus.CONFLICT,
      "User with this email already exists",
    );
  }

  const hashedPassword = await bcrypt.hash(
    payload.password,
    Number(config.bcrypt_salt_rounds),
  );

  // Upload courier documents to Cloudinary
  const [identityDocumentUpload, profilePhotoUpload] = await Promise.all([
    cloudinaryUtils.uploadToCloudinary({
      buffer: files.identityDocument.buffer,
      folder: "parcel-relay/courier-documents",
      resourceType: "auto",
    }),

    cloudinaryUtils.uploadToCloudinary({
      buffer: files.profilePhoto.buffer,
      folder: "parcel-relay/courier-profiles",
      resourceType: "image",
    }),
  ]);

  const result = await prisma.$transaction(async (tx) => {
    const courier = await tx.user.create({
      data: {
        name: payload.name,
        email: payload.email,
        password: hashedPassword,
        role: "COURIER",
        status: "INACTIVE",
        authProvider: "CREDENTIAL",
        emailVerified: false,
      },
    });

    await tx.courierProfile.create({
      data: {
        userId: courier.id,
        phone: payload.phone,
        applicationStatus: "PENDING",
        identityDocumentUrl: identityDocumentUpload.secure_url,
        profilePhotoUrl: profilePhotoUpload.secure_url,
      },
    });

    return courier;
  });

  const otp = otpUtils.generateOtp();

  await otpUtils.saveOtp(result.email, "COURIER_EMAIL_VERIFICATION", otp);

  await emailUtils.sendOtpEmail(
    result.email,
    otp,
    "Courier Email Verification",
  );

  return {
    id: result.id,
    name: result.name,
    email: result.email,
    role: result.role,
    status: result.status,
    applicationStatus: "PENDING",
  };
};

const verifyCourierEmail = async (payload: IVerifyCourierEmail) => {
  const user = await prisma.user.findUnique({
    where: {
      email: payload.email,
    },
    include: {
      courierProfile: true,
    },
  });

  if (!user || user.role !== "COURIER" || !user.courierProfile) {
    throw new AppError(httpStatus.NOT_FOUND, "Courier application not found");
  }

  if (user.emailVerified) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      "Courier email is already verified",
    );
  }

  const otpResult = await otpUtils.verifyOtp(
    user.email,
    "COURIER_EMAIL_VERIFICATION",
    payload.otp,
  );

  if (otpResult === "NOT_FOUND") {
    throw new AppError(httpStatus.BAD_REQUEST, "OTP is expired or invalid");
  }

  if (otpResult === "INVALID") {
    throw new AppError(httpStatus.BAD_REQUEST, "Invalid OTP");
  }

  if (otpResult === "MAX_ATTEMPTS") {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      "Maximum OTP attempts exceeded. Please request a new OTP.",
    );
  }

  const result = await prisma.$transaction(async (tx) => {
    const updatedUser = await tx.user.update({
      where: {
        id: user.id,
      },
      data: {
        emailVerified: true,
      },
    });

    await tx.courierProfile.update({
      where: {
        userId: user.id,
      },
      data: {
        applicationStatus: "PENDING",
      },
    });

    return updatedUser;
  });

  await otpUtils.deleteOtp(user.email, "COURIER_EMAIL_VERIFICATION");

  return {
    id: result.id,
    name: result.name,
    email: result.email,
    role: result.role,
    status: result.status,
    emailVerified: result.emailVerified,
    applicationStatus: "PENDING",
  };
};

const reviewCourierApplication = async (
  courierId: string,
  payload: IReviewCourierApplication,
) => {
  const courier = await prisma.user.findUnique({
    where: {
      id: courierId,
    },
    include: {
      courierProfile: true,
    },
  });

  if (!courier || courier.role !== "COURIER" || !courier.courierProfile) {
    throw new AppError(httpStatus.NOT_FOUND, "Courier application not found");
  }

  if (courier.courierProfile.applicationStatus !== "PENDING") {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      "Courier application has already been reviewed",
    );
  }

  if (!courier.emailVerified) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      "Courier email must be verified before approval",
    );
  }

  const result = await prisma.$transaction(async (tx) => {
    const applicationStatus =
      payload.action === "APPROVE" ? "APPROVED" : "REJECTED";

    const userStatus = payload.action === "APPROVE" ? "ACTIVE" : "INACTIVE";

    await tx.courierProfile.update({
      where: {
        userId: courier.id,
      },
      data: {
        applicationStatus,
        isVerified: payload.action === "APPROVE",
      },
    });

    const updatedUser = await tx.user.update({
      where: {
        id: courier.id,
      },
      data: {
        status: userStatus,
      },
    });

    await tx.auditLog.create({
      data: {
        userId: courier.id,
        action: "UPDATE",
        entityType: "CourierApplication",
        entityId: courier.id,
        description: `Courier application ${applicationStatus.toLowerCase()}`,
        metadata: {
          applicationStatus,
          userStatus,
          email: courier.email,
        },
      },
    });

    return updatedUser;
  });

  await emailUtils.sendCourierApprovalEmail(
    result.email,
    result.name,
    payload.action === "APPROVE",
  );

  return {
    id: result.id,
    name: result.name,
    email: result.email,
    role: result.role,
    status: result.status,
    emailVerified: result.emailVerified,
    applicationStatus: payload.action === "APPROVE" ? "APPROVED" : "REJECTED",
  };
};

const assignCourier = async (adminId: string, payload: IAssignCourier) => {
  const courier = await prisma.user.findFirst({
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

  const shipment = await prisma.shipment.findUnique({
    where: {
      id: payload.shipmentId,
    },
    include: {
      originZone: true,
      destinationZone: true,
      customer: true,
    },
  });

  if (!courier) {
    throw new AppError(httpStatus.NOT_FOUND, "Active courier not found");
  }

  if (!shipment) {
    throw new AppError(httpStatus.NOT_FOUND, "Shipment not found");
  }

  const courierProfile = courier.courierProfile;

  if (!courierProfile) {
    throw new AppError(httpStatus.BAD_REQUEST, "Courier profile not found");
  }

  const result = await prisma.$transaction(async (tx) => {
    const updatedShipment = await tx.shipment.updateMany({
      where: {
        id: payload.shipmentId,
        courierId: null,
        status: "READY_FOR_ASSIGNMENT",
      },
      data: {
        courierId: courierProfile.id,
        status: "ASSIGNED",
      },
    });

    if (updatedShipment.count !== 1) {
      throw new AppError(
        httpStatus.CONFLICT,
        "Shipment is no longer available for assignment",
      );
    }

    const shipmentEvent = await tx.shipmentEvent.create({
      data: {
        shipmentId: payload.shipmentId,
        status: "ASSIGNED",
        description: `Shipment assigned to courier ${courier.name}`,
      },
    });

    await tx.auditLog.create({
      data: {
        userId: adminId,
        action: "ASSIGN",
        entityType: "Shipment",
        entityId: payload.shipmentId,
        description: `Shipment assigned to courier ${courier.name}`,
        metadata: {
          courierId: payload.courierId,
          courierName: courier.name,
        },
      },
    });

    return {
      shipmentId: payload.shipmentId,
      courierId: payload.courierId,
      status: "ASSIGNED",
      eventId: shipmentEvent.id,
    };
  });

  const shippingLabelPdf = await shippingLabelPdfUtils.generateShippingLabelPdf(
    {
      shipmentId: shipment.id,
      trackingNumber: shipment.trackingNumber,
      recipientName: shipment.recipientName,
      recipientPhone: shipment.recipientPhone,
      deliveryAddress: shipment.deliveryAddress,
      originZone: shipment.originZone.name,
      destinationZone: shipment.destinationZone.name,
      packageDescription: shipment.packageDescription,
      weight: Number(shipment.weight),
      codAmount: Number(shipment.codAmount),
    },
  );

  await cloudinaryUtils.uploadToCloudinary({
    buffer: shippingLabelPdf,
    folder: "parcel-relay/shipping-labels",
    publicId: `shipping-label-${shipment.trackingNumber}`,
    resourceType: "raw",
  });

  await emailUtils.sendShippingLabelEmail({
    to: shipment.customer.email,
    customerName: shipment.customer.name,
    trackingNumber: shipment.trackingNumber,
    shipmentId: shipment.id,
    shippingLabel: shippingLabelPdf,
  });

  return result;
};

const getCourierShipments = async (
  courierUserId: string,
  query: ICourierShipmentQuery,
) => {
  const { page = 1, limit = 10, status, q, sortOrder = "desc" } = query;

  const courier = await prisma.courierProfile.findUnique({
    where: {
      userId: courierUserId,
    },
    select: {
      id: true,
    },
  });

  if (!courier) {
    throw new AppError(httpStatus.NOT_FOUND, "Courier profile not found");
  }

  const skip = (page - 1) * limit;

  const where = {
    courierId: courier.id,
    isDeleted: false,
    ...(status && {
      status: status as ShipmentStatus,
    }),
    ...(q && {
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
      ],
    }),
  };

  const [shipments, total] = await prisma.$transaction([
    prisma.shipment.findMany({
      where,
      include: {
        originZone: true,
        destinationZone: true,
      },
      orderBy: {
        createdAt: sortOrder,
      },
      skip,
      take: limit,
    }),

    prisma.shipment.count({
      where,
    }),
  ]);

  return {
    data: shipments,
    meta: {
      page,
      limit,
      total,
      totalPage: Math.ceil(total / limit),
    },
  };
};

const getCourierShipmentById = async (
  courierUserId: string,
  shipmentId: string,
) => {
  const courier = await prisma.courierProfile.findUnique({
    where: {
      userId: courierUserId,
    },
    select: {
      id: true,
    },
  });

  if (!courier) {
    throw new AppError(httpStatus.NOT_FOUND, "Courier profile not found");
  }

  const shipment = await prisma.shipment.findFirst({
    where: {
      id: shipmentId,
      courierId: courier.id,
      isDeleted: false,
    },
    include: {
      originZone: true,
      destinationZone: true,
      pickupRequest: true,
      transfers: {
        orderBy: {
          createdAt: "asc",
        },
      },
      events: {
        orderBy: {
          createdAt: "asc",
        },
      },
    },
  });

  if (!shipment) {
    throw new AppError(
      httpStatus.NOT_FOUND,
      "Shipment not found or not assigned to you",
    );
  }

  return shipment;
};

export const courierService = {
  createCourier,
  applyCourier,
  verifyCourierEmail,
  reviewCourierApplication,
  assignCourier,
  getCourierShipments,
  getCourierShipmentById,
};
