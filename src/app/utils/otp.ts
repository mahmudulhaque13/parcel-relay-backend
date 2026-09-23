import crypto from "crypto";

import { connectRedis, redisClient } from "../lib/redis";

const OTP_EXPIRE_SECONDS = 5 * 60;

const generateOtp = (): string => {
  return crypto.randomInt(100000, 1000000).toString();
};

const saveOtp = async (
  email: string,
  type: string,
  otp: string,
): Promise<void> => {
  await connectRedis();

  const key = `otp:${type}:${email}`;

  await redisClient.set(key, otp, {
    EX: OTP_EXPIRE_SECONDS,
  });
};

const getOtp = async (email: string, type: string): Promise<string | null> => {
  await connectRedis();

  const key = `otp:${type}:${email}`;

  return redisClient.get(key);
};

const deleteOtp = async (email: string, type: string): Promise<void> => {
  await connectRedis();

  const key = `otp:${type}:${email}`;

  await redisClient.del(key);
};

export const otpUtils = {
  generateOtp,
  saveOtp,
  getOtp,
  deleteOtp,
};
