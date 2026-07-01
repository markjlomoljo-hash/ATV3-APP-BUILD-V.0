import { z } from "zod";

export const createTreatmentPlanSchema = z.object({
  name: z.string().trim().min(1).max(160),
  description: z.string().max(4000).optional(),
  providerDirected: z.boolean().default(false),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  schedules: z
    .array(
      z.object({
        itemName: z.string().max(160),
        frequency: z.string().max(60).optional(),
        timeOfDay: z.string().max(20).optional(),
        dosageInstructions: z.string().max(500).optional(),
      }),
    )
    .max(30)
    .optional(),
});

export const updateTreatmentPlanSchema = z.object({
  status: z.enum(["draft", "active", "paused", "completed", "archived"]).optional(),
  description: z.string().max(4000).optional(),
  endDate: z.string().datetime().optional(),
});

export const planEventSchema = z.object({
  planScheduleId: z.string().uuid().optional(),
  occurredAt: z.string().datetime().optional(),
  status: z.enum(["completed", "skipped", "missed"]).default("completed"),
  notes: z.string().max(1000).optional(),
});

export const planCheckInSchema = z.object({
  toleranceRating: z.enum(["well_tolerated", "mild_irritation", "severe_irritation"]).optional(),
  sideEffects: z.array(z.string().max(80)).max(20).optional(),
  perceivedProgress: z.enum(["worse", "no_change", "slight_improvement", "improved"]).optional(),
  notes: z.string().max(2000).optional(),
});
