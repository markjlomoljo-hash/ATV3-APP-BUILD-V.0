import { z } from "zod";
import { PROFILE_SECTION_KEYS } from "@/types/profile";

export const profileSectionKeySchema = z.enum([...PROFILE_SECTION_KEYS]);

export const sectionUpdateSchema = z.object({
  value: z.record(z.string(), z.unknown()),
  reason: z.string().max(500).optional(),
  includeInReports: z.boolean().optional().default(true),
});

export const reportInclusionOptionsSchema = z.object({
  includeFaceAtlasPhotos: z.boolean().default(false),
  includeTreatmentDetails: z.boolean().default(true),
  includeSections: z
    .union([z.literal("all"), z.array(profileSectionKeySchema)])
    .default("all"),
});

export const reportRequestSchema = z.object({
  inclusionOptions: reportInclusionOptionsSchema.default({
    includeFaceAtlasPhotos: false,
    includeTreatmentDetails: true,
    includeSections: "all",
  }),
  idempotencyKey: z.string().max(120).optional(),
});

export const exportRequestSchema = z.object({
  format: z.enum(["json", "csv"]),
  scope: z.enum([
    "profile",
    "logs",
    "scans",
    "treatment_plans",
    "tasks",
    "weather",
    "reports",
    "consents",
    "all",
  ]),
});

export const deletionRequestSchema = z.object({
  type: z.enum(["account", "data", "faceatlas_only", "logs_only", "reports_only"]),
  exportRequestedFirst: z.boolean().optional().default(false),
});

export const consentUpdateSchema = z.object({
  anonymousLearning: z.boolean().optional(),
  rawImageLearning: z.boolean().optional(),
  includeFaceAtlasPhotosInReports: z.boolean().optional(),
  includeTreatmentDetailsInReports: z.boolean().optional(),
  marketingNotifications: z.boolean().optional(),
  productAnalysisNotifications: z.boolean().optional(),
  reportReadyNotifications: z.boolean().optional(),
  streakRiskNotifications: z.boolean().optional(),
  weatherAlertNotifications: z.boolean().optional(),
});
