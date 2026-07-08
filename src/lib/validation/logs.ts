import { z } from "zod";

const dateOnly = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Expected YYYY-MM-DD");
const isoDateTime = z.string().datetime({ offset: true }).or(z.string().datetime());

export const sleepLogSchema = z.object({
  logDate: dateOnly.optional(),
  sleepStart: isoDateTime,
  wakeTime: isoDateTime,
  quality: z.enum(["poor", "fair", "good", "excellent"]).optional(),
  disturbances: z.array(z.string().max(80)).max(20).optional(),
  naps: z
    .array(
      z.object({
        start: isoDateTime,
        end: isoDateTime,
        durationMinutes: z.number().int().min(0).max(1000).optional(),
      }),
    )
    .max(10)
    .optional(),
  notes: z.string().max(2000).optional(),
});

export const foodLogSchema = z.object({
  logDate: dateOnly.optional(),
  baselineMealsPerDay: z.number().int().min(0).max(20).optional(),
  completionState: z.enum(["incomplete", "complete", "skipped"]).optional(),
  notes: z.string().max(2000).optional(),
});

export const mealEventSchema = z.object({
  logDate: dateOnly.optional(),
  eventType: z.enum(["meal", "snack"]).default("meal"),
  category: z.enum(["breakfast", "lunch", "dinner", "snack", "drink"]).optional(),
  occurredAt: isoDateTime,
  description: z.string().max(500).optional(),
  portionSize: z.enum(["small", "medium", "large"]).optional(),
  items: z.array(z.object({ name: z.string().max(120), quantity: z.string().max(60).optional() })).max(30).optional(),
  notes: z.string().max(1000).optional(),
});

export const stressLogSchema = z.object({
  logDate: dateOnly.optional(),
  stressLevel: z.number().int().min(1).max(10),
  triggers: z.array(z.string().max(80)).max(20).optional(),
  copingActions: z.array(z.string().max(80)).max(20).optional(),
  notes: z.string().max(2000).optional(),
});

export const activityLogSchema = z.object({
  logDate: dateOnly.optional(),
  activityType: z.string().max(60).optional(),
  durationMinutes: z.number().int().min(0).max(1440).optional(),
  intensity: z.enum(["light", "moderate", "vigorous"]).optional(),
  sweatLevel: z.enum(["none", "light", "moderate", "heavy"]).optional(),
  postActivityCleansed: z.boolean().optional(),
  notes: z.string().max(2000).optional(),
});

export const cycleLogSchema = z.object({
  logDate: dateOnly.optional(),
  phase: z.enum(["menstrual", "follicular", "ovulation", "luteal", "unknown"]).optional(),
  flow: z.enum(["none", "light", "medium", "heavy"]).optional(),
  symptoms: z.array(z.string().max(80)).max(20).optional(),
  notes: z.string().max(2000).optional(),
});

export const contactLogSchema = z.object({
  logDate: dateOnly.optional(),
  contactType: z.enum(["helmet", "mask", "phone", "pillowcase", "hands", "hair_product", "other"]),
  durationMinutes: z.number().int().min(0).max(1440).optional(),
  zone: z.enum(["forehead", "cheeks", "chin", "jawline"]).optional(),
  notes: z.string().max(1000).optional(),
});

export const listQuerySchema = z.object({
  from: dateOnly.optional(),
  to: dateOnly.optional(),
  limit: z.coerce.number().int().min(1).max(200).optional(),
});
