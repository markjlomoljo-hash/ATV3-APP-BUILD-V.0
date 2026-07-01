import { z } from "zod";

export const registerSchema = z.object({
  email: z.string().trim().toLowerCase().email().max(320),
  password: z.string().min(8).max(200),
  displayName: z.string().trim().min(1).max(120).optional(),
});

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email().max(320),
  password: z.string().min(1).max(200),
});

export const requestPasswordResetSchema = z.object({
  email: z.string().trim().toLowerCase().email().max(320),
});

export const resetPasswordSchema = z.object({
  token: z.string().min(10),
  newPassword: z.string().min(8).max(200),
});
