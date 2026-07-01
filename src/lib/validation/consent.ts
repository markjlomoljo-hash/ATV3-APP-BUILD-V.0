import { z } from "zod";

export const CONSENT_TYPES = [
  "terms",
  "privacy_policy",
  "health_data_processing",
  "ai_non_diagnostic",
  "camera_media_education",
  "notification_education",
  "anonymous_network_learning",
  "derived_feature_learning",
  "raw_image_model_improvement",
  "marketing_communications",
] as const;

export const grantConsentSchema = z.object({
  consentType: z.enum(CONSENT_TYPES),
  version: z.string().min(1).max(20),
  sourceScreen: z.string().max(120).optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export const revokeConsentSchema = z.object({
  consentType: z.enum(CONSENT_TYPES),
});
