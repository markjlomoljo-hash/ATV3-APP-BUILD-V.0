import { z } from "zod";

export const createTaskSchema = z.object({
  title: z.string().trim().min(1).max(160),
  description: z.string().max(2000).optional(),
  category: z.enum(["routine", "logging", "education", "treatment"]).optional(),
  pointsValue: z.number().int().min(1).max(1000).default(10),
  dueDate: z.string().datetime().optional(),
  isRecurring: z.boolean().default(false),
});
