import { z } from "zod";

const strongPasswordSchema = z
  .string()
  .min(8, "Password must be at least 8 characters")
  .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
  .regex(/[a-z]/, "Password must contain at least one lowercase letter")
  .regex(/\d/, "Password must contain at least one number")
  .regex(/[!@#$%^&*]/, "Password must contain at least one special character")
  .refine((value) => !/\s/.test(value), {
    message: "Password must not contain whitespace",
  });

const registerValidation = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Invalid email address"),
  password: strongPasswordSchema,
});

const loginValidation = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
});

const demoLoginValidation = z.object({
  role: z.enum(["CUSTOMER", "COURIER", "ADMIN"]),
});

const googleLoginValidation = z.object({
  idToken: z.string().min(1, "Google ID token is required"),
});

const verifyEmailValidation = z.object({
  email: z.string().email("Invalid email address"),
  otp: z.string().regex(/^\d{6}$/, "OTP must be 6 digits"),
});

const resendVerificationValidation = z.object({
  email: z.string().email("Invalid email address"),
});

const forgotPasswordValidation = z.object({
  email: z.string().email("Invalid email address"),
});

const resetPasswordValidation = z.object({
  email: z.string().email("Invalid email address"),
  otp: z.string().regex(/^\d{6}$/, "OTP must be 6 digits"),
  newPassword: strongPasswordSchema,
});

const changePasswordValidation = z.object({
  currentPassword: z.string().min(1, "Current password is required"),
  newPassword: strongPasswordSchema,
});

export const authValidation = {
  registerValidation,
  loginValidation,
  demoLoginValidation,
  googleLoginValidation,
  verifyEmailValidation,
  resendVerificationValidation,
  forgotPasswordValidation,
  resetPasswordValidation,
  changePasswordValidation,
};
