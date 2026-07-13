import { z } from "zod";

const calendarDateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine((value) => {
  const [year, month, day] = value.split("-").map(Number);
  if (month < 1 || month > 12 || day < 1) return false;
  const leapYear = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
  const daysInMonth = [31, leapYear ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  return day <= daysInMonth[month - 1];
}, "Invalid calendar date");

export const confidenceSchema = z.enum([
  "insufficient_data",
  "early_hypothesis",
  "moderate_confidence",
  "high_confidence",
]);

export const sourceRecordRefSchema = z.object({
  table: z.string().min(1).max(80),
  id: z.string().min(1).max(160),
});

export const dailyLogKindSchema = z.enum([
  "sleep",
  "food",
  "stress",
  "activity",
  "hydration",
  "cycle",
  "contact",
  "routine",
  "treatment",
  "skin_state",
]);

export const dailyLogPayloadSchema = z.object({
  kind: dailyLogKindSchema,
  logDate: calendarDateSchema,
  values: z.record(z.string(), z.unknown()),
  notes: z.string().max(2000).optional(),
});

export const faceAtlasAngles = ["front", "left", "right", "chin_up", "forehead"] as const;
export const faceAtlasAngleSchema = z.enum(faceAtlasAngles);

export const lesionTaxonomySchema = z.enum([
  "comedone_open",
  "comedone_closed",
  "papule",
  "pustule",
  "nodule",
  "cyst",
  "PIH",
  "PIE",
  "scar",
  "uncertain",
]);

export const facialZoneSchema = z.enum([
  "forehead",
  "left_cheek",
  "right_cheek",
  "chin",
  "jawline",
  "nose",
  "temple",
  "perioral",
]);

export const faceAtlasAnnotationSchema = z.object({
  scanId: z.string().uuid(),
  lesionType: lesionTaxonomySchema,
  zone: facialZoneSchema,
  x: z.number().min(0).max(1),
  y: z.number().min(0).max(1),
  w: z.number().min(0).max(1).optional(),
  h: z.number().min(0).max(1).optional(),
  userCertainty: z.number().min(0).max(1),
  source: z.enum(["user", "model"]).default("user"),
  notes: z.string().max(2000).optional(),
}).superRefine((annotation, context) => {
  if (annotation.w !== undefined && annotation.x + annotation.w > 1) {
    context.addIssue({ code: "custom", path: ["w"], message: "Annotation extends beyond the image width" });
  }
  if (annotation.h !== undefined && annotation.y + annotation.h > 1) {
    context.addIssue({ code: "custom", path: ["h"], message: "Annotation extends beyond the image height" });
  }
});

export const faceAtlasCaptureSchema = z.object({
  angles: z.array(faceAtlasAngleSchema).min(1).max(faceAtlasAngles.length),
  rawImageRetentionConsent: z.boolean(),
  analysisConsent: z.boolean(),
  notes: z.string().max(2000).optional(),
});

export const skinTwinVariableSchema = z.enum([
  "better_sleep",
  "reduced_sleep_debt",
  "circadian_improvement",
  "lower_stress",
  "reduced_dairy",
  "reduced_high_glycemic",
  "reduced_sugary_processed_snacks",
  "hydration_improvement",
  "meal_timing_consistency",
  "routine_consistency",
  "product_removal",
  "product_replacement",
  "active_ingredient_pause",
  "active_ingredient_introduction_provider_review",
  "sunscreen_consistency",
  "treatment_adherence",
  "missed_dose_reduction",
  "weather_exposure_change",
  "reduced_contact_occlusion",
  "reduced_picking_touching",
  "cycle_context_confounder",
]);

export const skinTwinWindowSchema = z.enum(["3d", "7d", "14d", "30d", "treatment_cycle", "provider_review_custom"]);

export const skinTwinScenarioSchema = z.object({
  name: z.string().min(1).max(120),
  window: skinTwinWindowSchema,
  variables: z.array(skinTwinVariableSchema).min(1).max(8),
  sourceRecordRefs: z.array(sourceRecordRefSchema).default([]),
  providerReview: z.boolean().default(false),
});

export const cutisAiMessageSchema = z.object({
  conversationId: z.string().uuid().optional(),
  message: z.string().min(1).max(4000),
  requestedTools: z.array(z.enum(["memory", "evidence", "faceatlas", "forecast", "skin_twin", "reports"])).default([]),
});

export const treatmentPlanDraftSchema = z.object({
  name: z.string().min(1).max(120),
  activeIngredient: z.string().max(120).optional(),
  startDate: calendarDateSchema,
  reviewDate: calendarDateSchema.optional(),
  providerDirected: z.boolean().default(false),
  instructions: z.string().max(2000).optional(),
});

export const reportRequestDraftSchema = z.object({
  type: z.enum(["dermatologist", "progress", "export"]),
  includeFaceAtlas: z.boolean().default(false),
  includeTreatments: z.boolean().default(true),
  includeFoodSleep: z.boolean().default(true),
  includeAiMl: z.boolean().default(true),
});
