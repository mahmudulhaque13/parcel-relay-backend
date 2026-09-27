import crypto from "crypto";

import { connectRedis, redisClient } from "../lib/redis";

const OTP_EXPIRE_SECONDS = 5 * 60;
const OTP_MAX_ATTEMPTS = 5;
const OTP_RESEND_COOLDOWN_SECONDS = 60;

const generateOtp = (): string => {
  return crypto.randomInt(100000, 1000000).toString();
};

const getOtpKey = (email: string, type: string): string => {
  return `otp:${type}:${email}`;
};

const getAttemptKey = (email: string, type: string): string => {
  return `otp:attempts:${type}:${email}`;
};

const getCooldownKey = (email: string, type: string): string => {
  return `otp:cooldown:${type}:${email}`;
};

const hashOtp = (otp: string): string => {
  return crypto.createHash("sha256").update(otp).digest("hex");
};

const saveOtp = async (
  email: string,
  type: string,
  otp: string,
): Promise<void> => {
  await connectRedis();

  const normalizedEmail = email.trim().toLowerCase();

  const otpKey = getOtpKey(normalizedEmail, type);
  const attemptKey = getAttemptKey(normalizedEmail, type);
  const cooldownKey = getCooldownKey(normalizedEmail, type);

  const cooldownExists = await redisClient.exists(cooldownKey);

  if (cooldownExists) {
    throw new Error("OTP resend cooldown is active");
  }

  const hashedOtp = hashOtp(otp);

  await redisClient.set(otpKey, hashedOtp, {
    EX: OTP_EXPIRE_SECONDS,
  });

  await redisClient.set(attemptKey, "0", {
    EX: OTP_EXPIRE_SECONDS,
  });

  await redisClient.set(cooldownKey, "1", {
    EX: OTP_RESEND_COOLDOWN_SECONDS,
  });
};

const verifyOtp = async (
  email: string,
  type: string,
  otp: string,
): Promise<"VALID" | "NOT_FOUND" | "INVALID" | "MAX_ATTEMPTS"> => {
  await connectRedis();

  const normalizedEmail = email.trim().toLowerCase();

  const otpKey = getOtpKey(normalizedEmail, type);
  const attemptKey = getAttemptKey(normalizedEmail, type);

  const savedOtpHash = await redisClient.get(otpKey);

  if (!savedOtpHash) {
    return "NOT_FOUND";
  }

  const attempts = Number((await redisClient.get(attemptKey)) ?? "0");

  if (attempts >= OTP_MAX_ATTEMPTS) {
    await redisClient.del(otpKey);
    await redisClient.del(attemptKey);

    return "MAX_ATTEMPTS";
  }

  const inputOtpHash = hashOtp(otp);

  const savedBuffer = Buffer.from(savedOtpHash, "hex");
  const inputBuffer = Buffer.from(inputOtpHash, "hex");

  const isValid =
    savedBuffer.length === inputBuffer.length &&
    crypto.timingSafeEqual(savedBuffer, inputBuffer);

  if (!isValid) {
    const newAttempts = await redisClient.incr(attemptKey);

    if (newAttempts >= OTP_MAX_ATTEMPTS) {
      await redisClient.del(otpKey);
      await redisClient.del(attemptKey);

      return "MAX_ATTEMPTS";
    }

    return "INVALID";
  }

  return "VALID";
};

const deleteOtp = async (email: string, type: string): Promise<void> => {
  await connectRedis();

  const normalizedEmail = email.trim().toLowerCase();

  const otpKey = getOtpKey(normalizedEmail, type);
  const attemptKey = getAttemptKey(normalizedEmail, type);
  const cooldownKey = getCooldownKey(normalizedEmail, type);

  await redisClient.del(otpKey);
  await redisClient.del(attemptKey);
  await redisClient.del(cooldownKey);
};

export const otpUtils = {
  generateOtp,
  saveOtp,
  verifyOtp,
  deleteOtp,
};
