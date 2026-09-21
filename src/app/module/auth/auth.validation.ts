import { z } from "zod";

const registerValidation = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),

  email: z.string().email("Invalid email address"),

  password: z.string().min(6, "Password must be at least 6 characters"),
});

const loginValidation = z.object({
  email: z.string().email("Invalid email address"),

  password: z.string().min(1, "Password is required"),
});

const googleLoginValidation = z.object({
  idToken: z.string().min(1, "Google ID token is required"),
});

export const authValidation = {
  registerValidation,
  loginValidation,
  googleLoginValidation,
};
