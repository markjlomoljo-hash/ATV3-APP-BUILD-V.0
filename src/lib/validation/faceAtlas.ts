import { z } from "zod";
import { REQUIRED_FACE_ATLAS_ANGLES } from "@/db/schema/faceAtlas";

export const createScanSessionSchema = z.object({
  rawRetentionPolicy: z.enum(["temporary", "extended"]).optional(),
  notes: z.string().max(2000).optional(),
});

// Images are uploaded as base64 to keep this a pure JSON API; the raw bytes
// are decoded server-side and written straight to private object storage.
export const uploadFaceImageSchema = z.object({
  angle: z.enum(REQUIRED_FACE_ATLAS_ANGLES),
  mimeType: z.enum(["image/jpeg", "image/png", "image/webp"]),
  imageBase64: z.string().min(100),
  widthPx: z.number().int().positive().max(10000).optional(),
  heightPx: z.number().int().positive().max(10000).optional(),
});

export const lesionAnnotationSchema = z.object({
  faceImageId: z.string().uuid(),
  xNorm: z.number().min(0).max(1),
  yNorm: z.number().min(0).max(1),
  lesionType: z.enum(["papule", "pustule", "comedone", "cyst", "scar", "other"]).optional(),
  userCertainty: z.enum(["low", "medium", "high"]).optional(),
});

export const oilinessRatingSchema = z.object({
  scanSessionId: z.string().uuid(),
  zone: z.enum(["t_zone", "cheeks", "chin", "overall"]).optional(),
  rating: z.number().int().min(1).max(5),
});
