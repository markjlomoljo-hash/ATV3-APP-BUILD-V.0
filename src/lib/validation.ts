import { z } from "zod";

export const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8, "Password must be at least 8 characters."),
  displayName: z.string().min(1).max(80).optional(),
  timezone: z.string().min(1).max(80).default("UTC"),
  mealFrequencyBaseline: z.number().int().min(1).max(6).default(3),
});

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const sleepLogSchema = z.object({
  logDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  sleepTime: z.string().optional(),
  wakeTime: z.string().optional(),
  quality: z.number().int().min(1).max(5).optional(),
  disturbances: z.string().optional(),
  notes: z.string().optional(),
});

export const foodLogSchema = z.object({
  logDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  mealType: z.enum(["breakfast", "lunch", "dinner", "snack"]),
  notes: z.string().optional(),
});

export const scanSchema = z.object({
  scanDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  anglesCompleted: z.array(z.string()).default([]),
  annotationComplete: z.boolean().default(false),
});

export const completeTaskSchema = z.object({
  clientCompletionId: z.string().min(1),
  source: z.enum(["online", "offline_sync"]).default("online"),
  completedAtLocalDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
});

export const restoreStreakSchema = z.object({
  targetDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

export const scheduleStrategySchema = z.object({
  frequency: z.enum(["daily", "every_other_day", "twice_daily", "weekly"]),
  weeklyDays: z.array(z.number().int().min(0).max(6)).optional(),
  rampWeeks: z.number().int().min(0).max(12).optional(),
  horizonDays: z.number().int().min(1).max(90).optional(),
});

export const createPlanSchema = z.object({
  name: z.string().min(1).max(120),
  brand: z.string().max(120).optional(),
  activeIngredient: z.string().min(1).max(120),
  strength: z.string().max(60).optional(),
  vehicleForm: z.string().max(60).optional(),
  route: z.enum(["topical", "oral"]).default("topical"),
  targetZones: z.array(z.string()).default([]),
  sourceType: z.enum(["provider_prescribed", "provider_recommended", "otc", "self_selected"]),
  prescriptionStatus: z.enum(["prescription", "not_prescription"]).default("not_prescription"),
  providerName: z.string().max(120).optional(),
  providerInstructions: z.string().max(2000).optional(),
  baselineTolerance: z.record(z.string(), z.unknown()).optional(),
  scheduleStrategy: scheduleStrategySchema,
  escalationRules: z.record(z.string(), z.unknown()).optional(),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  reviewDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  evidenceSummary: z.string().max(2000).optional(),
});

export const updatePlanSchema = z.object({
  name: z.string().min(1).max(120).optional(),
  targetZones: z.array(z.string()).optional(),
  providerInstructions: z.string().max(2000).optional(),
  baselineTolerance: z.record(z.string(), z.unknown()).optional(),
  reviewDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  evidenceSummary: z.string().max(2000).optional(),
  scheduleStrategy: scheduleStrategySchema.optional(),
  escalationRules: z.record(z.string(), z.unknown()).optional(),
  providerConfirmed: z.boolean().optional(),
});

export const checkinSchema = z.object({
  clientCheckinId: z.string().min(1),
  checkinDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  usageStatus: z.enum(["used", "skipped", "delayed", "partial", "stopped"]),
  irritationLevel: z.enum(["none", "mild", "moderate", "severe"]).optional(),
  barrierSymptoms: z.array(z.string()).optional(),
  acneChange: z.enum(["better", "same", "worse", "unsure"]).optional(),
  sideEffects: z.array(z.string()).optional(),
  sunscreenUsed: z.boolean().optional(),
  conflictingActives: z.array(z.string()).optional(),
  toleranceScore: z.number().int().min(0).max(10).optional(),
  notes: z.string().max(2000).optional(),
});

export const treatmentEventSchema = z.object({
  clientEventId: z.string().min(1),
  eventDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  eventType: z.enum(["use", "skip", "delay", "partial", "stop"]),
  notes: z.string().max(2000).optional(),
});

export const statusChangeSchema = z.object({
  reason: z.string().max(500).optional(),
});
