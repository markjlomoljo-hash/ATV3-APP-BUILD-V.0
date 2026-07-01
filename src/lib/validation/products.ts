import { z } from "zod";

export const createProductSchema = z.object({
  name: z.string().trim().min(1).max(200),
  brand: z.string().max(120).optional(),
  category: z.enum(["cleanser", "moisturizer", "sunscreen", "treatment", "makeup", "other"]).optional(),
  barcode: z.string().max(64).optional(),
  source: z.enum(["barcode", "search", "manual", "ocr_import"]).default("manual"),
  ingredientListRaw: z.string().max(8000).optional(),
  ingredientList: z.array(z.string().max(160)).max(200).optional(),
  ocrMetadata: z.record(z.string(), z.unknown()).optional(),
});

export const updateProductSchema = createProductSchema.partial().extend({
  isActive: z.boolean().optional(),
});

export const productUsageSchema = z.object({
  usedAt: z.string().datetime().optional(),
  timeOfDay: z.enum(["morning", "evening", "asneeded"]).optional(),
  amountApplied: z.string().max(40).optional(),
  notes: z.string().max(500).optional(),
});

export const productReactionSchema = z.object({
  reactionType: z.enum(["breakout", "irritation", "dryness", "none", "improvement"]),
  severity: z.enum(["mild", "moderate", "severe"]).optional(),
  onsetHours: z.string().max(20).optional(),
  notes: z.string().max(1000).optional(),
});

export const createRoutineSchema = z.object({
  name: z.string().trim().min(1).max(120),
  timeOfDay: z.enum(["morning", "evening"]).default("morning"),
  steps: z
    .array(
      z.object({
        productId: z.string().uuid().optional(),
        stepOrder: z.number().int().min(1).max(50).default(1),
        instructions: z.string().max(500).optional(),
      }),
    )
    .max(30)
    .optional(),
});
