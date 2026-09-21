import bcrypt from "bcrypt";
import crypto from "crypto";
import httpStatus from "http-status-codes";
import { SignOptions } from "jsonwebtoken";

import config from "../../config";
import { googleClient } from "../../lib/googleAuth";
import { prisma } from "../../lib/prisma";
import { AppError } from "../../utils/AppError";
import { jwtUtils } from "../../utils/jwt";

import type {
  IGoogleLoginPayload,
  ILoginUser,
  IRegisterUser,
} from "./auth.interface";

const hashRefreshToken = (token: string) => {
  return crypto.createHash("sha256").update(token).digest("hex");
};

const createRefreshSession = async (user: {
  id: string;
  email: string;
  role: string;
}) => {
  const accessToken = jwtUtils.createToken(
    {
      id: user.id,
      email: user.email,
      role: user.role,
    },
    config.jwt_access_secret,
    config.jwt_access_expires_in as SignOptions["expiresIn"],
  );

  const refreshToken = jwtUtils.createToken(
    {
      id: user.id,
      email: user.email,
      role: user.role,
    },
    config.jwt_refresh_secret,
    config.jwt_refresh_expires_in as SignOptions["expiresIn"],
  );

  const refreshTokenHash = hashRefreshToken(refreshToken);

  const refreshExpiresAt = new Date();
  refreshExpiresAt.setDate(refreshExpiresAt.getDate() + 7);

  await prisma.refreshSession.create({
    data: {
      userId: user.id,
      tokenHash: refreshTokenHash,
      expiresAt: refreshExpiresAt,
    },
  });

  return {
    accessToken,
    refreshToken,
  };
};

const registerUser = async (payload: IRegisterUser) => {
  const existingUser = await prisma.user.findUnique({
    where: {
      email: payload.email,
    },
  });

  if (existingUser) {
    throw new AppError(httpStatus.CONFLICT, "User already exists");
  }

  const hashedPassword = await bcrypt.hash(
    payload.password,
    Number(config.bcrypt_salt_rounds),
  );

  const user = await prisma.user.create({
    data: {
      name: payload.name,
      email: payload.email,
      password: hashedPassword,
      authProvider: "CREDENTIAL",
      role: "CUSTOMER",
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
    },
  });

  return user;
};

const loginUser = async (payload: ILoginUser) => {
  const user = await prisma.user.findUnique({
    where: {
      email: payload.email,
    },
  });

  if (!user) {
    throw new AppError(httpStatus.NOT_FOUND, "User not found");
  }

  if (!user.password) {
    throw new AppError(
      httpStatus.UNAUTHORIZED,
      "Please use your social login method",
    );
  }

  const isPasswordMatched = await bcrypt.compare(
    payload.password,
    user.password,
  );

  if (!isPasswordMatched) {
    throw new AppError(httpStatus.UNAUTHORIZED, "Invalid password");
  }

  if (user.status !== "ACTIVE" || user.isDeleted) {
    throw new AppError(httpStatus.FORBIDDEN, "User account is not active");
  }

  const tokens = await createRefreshSession({
    id: user.id,
    email: user.email,
    role: user.role,
  });

  return {
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      status: user.status,
    },
    ...tokens,
  };
};

const googleLogin = async (payload: IGoogleLoginPayload) => {
  const ticket = await googleClient.verifyIdToken({
    idToken: payload.idToken,
    audience: config.google_client_id,
  });

  const googlePayload = ticket.getPayload();

  if (!googlePayload) {
    throw new AppError(httpStatus.UNAUTHORIZED, "Invalid Google ID token");
  }

  const {
    sub: googleId,
    email,
    email_verified: emailVerified,
    name,
    picture,
  } = googlePayload;

  if (!googleId || !email) {
    throw new AppError(
      httpStatus.UNAUTHORIZED,
      "Google account information is incomplete",
    );
  }

  if (!emailVerified) {
    throw new AppError(httpStatus.UNAUTHORIZED, "Google email is not verified");
  }

  let user = await prisma.user.findUnique({
    where: {
      googleId,
    },
  });

  if (!user) {
    user = await prisma.user.findUnique({
      where: {
        email,
      },
    });

    if (user) {
      if (user.googleId && user.googleId !== googleId) {
        throw new AppError(
          httpStatus.CONFLICT,
          "This email is already linked with another Google account",
        );
      }

      user = await prisma.user.update({
        where: {
          id: user.id,
        },
        data: {
          googleId,
          authProvider: "GOOGLE",
          emailVerified: true,
          ...(user.imageUrl || picture
            ? {
                imageUrl: user.imageUrl || picture,
              }
            : {}),
        },
      });
    } else {
      user = await prisma.user.create({
        data: {
          name: name || email.split("@")[0],
          email,
          googleId,
          authProvider: "GOOGLE",
          emailVerified: true,
          ...(picture
            ? {
                imageUrl: picture,
              }
            : {}),
          role: "CUSTOMER",
        },
      });
    }
  }

  if (user.status !== "ACTIVE" || user.isDeleted) {
    throw new AppError(httpStatus.FORBIDDEN, "User account is not active");
  }

  const tokens = await createRefreshSession({
    id: user.id,
    email: user.email,
    role: user.role,
  });

  return {
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      status: user.status,
    },
    ...tokens,
  };
};

const refreshAccessToken = async (token: string) => {
  const verifiedToken = jwtUtils.verifyToken(token, config.jwt_refresh_secret);

  if (!verifiedToken.success) {
    throw new AppError(
      httpStatus.UNAUTHORIZED,
      "Invalid or expired refresh token",
    );
  }

  const decoded = verifiedToken.data as {
    id: string;
    email: string;
    role: string;
  };

  const tokenHash = hashRefreshToken(token);

  const session = await prisma.refreshSession.findUnique({
    where: {
      tokenHash,
    },
  });

  if (!session) {
    throw new AppError(httpStatus.UNAUTHORIZED, "Refresh session not found");
  }

  if (session.revokedAt) {
    throw new AppError(
      httpStatus.UNAUTHORIZED,
      "Refresh token has been revoked",
    );
  }

  if (session.expiresAt < new Date()) {
    throw new AppError(httpStatus.UNAUTHORIZED, "Refresh token has expired");
  }

  const user = await prisma.user.findUnique({
    where: {
      id: decoded.id,
    },
  });

  if (!user || user.status !== "ACTIVE" || user.isDeleted) {
    throw new AppError(httpStatus.UNAUTHORIZED, "User account is not active");
  }

  const accessToken = jwtUtils.createToken(
    {
      id: user.id,
      email: user.email,
      role: user.role,
    },
    config.jwt_access_secret,
    config.jwt_access_expires_in as SignOptions["expiresIn"],
  );

  return {
    accessToken,
  };
};

const logoutUser = async (token: string) => {
  const tokenHash = hashRefreshToken(token);

  const session = await prisma.refreshSession.findUnique({
    where: {
      tokenHash,
    },
  });

  if (!session) {
    throw new AppError(httpStatus.NOT_FOUND, "Refresh session not found");
  }

  if (session.revokedAt) {
    throw new AppError(httpStatus.BAD_REQUEST, "User already logged out");
  }

  await prisma.refreshSession.update({
    where: {
      id: session.id,
    },
    data: {
      revokedAt: new Date(),
    },
  });
};

export const authService = {
  registerUser,
  loginUser,
  googleLogin,
  refreshAccessToken,
  logoutUser,
};
