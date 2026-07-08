import { z } from "zod";

export const profileUpdateSchema = z.object({
  dateOfBirth: z.string().datetime().or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)).optional(),
  biologicalSex: z.string().max(32).optional(),
  skinType: z.enum(["oily", "dry", "combination", "normal", "unknown"]).optional(),
  sensitivity: z.enum(["low", "moderate", "high", "unknown"]).optional(),
  acneHistorySummary: z.string().max(4000).optional(),
  acneOnsetAge: z.number().int().min(0).max(120).optional(),
  acneSeverityBaseline: z.string().max(32).optional(),
  medicationHistory: z
    .array(
      z.object({
        name: z.string().max(160),
        startedAt: z.string().optional(),
        endedAt: z.string().optional(),
        notes: z.string().max(500).optional(),
      }),
    )
    .max(50)
    .optional(),
  allergies: z
    .array(
      z.object({
        substance: z.string().max(160),
        reaction: z.string().max(200).optional(),
        severity: z.enum(["mild", "moderate", "severe"]).optional(),
      }),
    )
    .max(50)
    .optional(),
  currentRoutineSummary: z.string().max(4000).optional(),
  lifestyleBaseline: z.record(z.string(), z.unknown()).optional(),
  goals: z.array(z.string().max(120)).max(20).optional(),
  constraints: z.array(z.string().max(120)).max(20).optional(),
  notificationPreferences: z.record(z.string(), z.unknown()).optional(),
  privacyPreferences: z.record(z.string(), z.unknown()).optional(),
});

export const CLINICAL_FIELDS = [
  "skinType",
  "sensitivity",
  "acneHistorySummary",
  "acneOnsetAge",
  "acneSeverityBaseline",
  "medicationHistory",
  "allergies",
] as const;

export const onboardingProgressSchema = z.object({
  currentStep: z.string().min(1).max(80),
  completedSteps: z.array(z.string().max(80)).max(50).optional(),
  isComplete: z.boolean().optional(),
});
