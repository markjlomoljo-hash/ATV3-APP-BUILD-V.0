import { NextRequest, NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { scanSessions, faceImages } from "@/db/schema";
import { requireAuth } from "@/lib/auth";
import { errorResponse, notFound, parseJsonBody, withErrorHandling } from "@/lib/http";
import { uploadFaceImageSchema } from "@/lib/validation/faceAtlas";
import { generateStorageKey, putPrivateObject } from "@/lib/storage";
import { writeAuditLog } from "@/lib/audit";
import { enqueueJob } from "@/lib/jobs";
import { REQUIRED_FACE_ATLAS_ANGLES } from "@/db/schema/faceAtlas";

export const dynamic = "force-dynamic";

const MAX_IMAGE_BYTES = 12 * 1024 * 1024; // 12MB safety cap

const MIME_EXT: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return withErrorHandling(async () => {
    const auth = await requireAuth(req);
    if ("error" in auth) return auth.error;
    const userId = auth.ctx.user.id;
    const { id } = await params;

    const [session] = await db
      .select()
      .from(scanSessions)
      .where(and(eq(scanSessions.id, id), eq(scanSessions.userId, userId)))
      .limit(1);
    if (!session) return notFound("Scan session");

    const parsed = await parseJsonBody(req, uploadFaceImageSchema);
    if ("error" in parsed) return parsed.error;
    const { angle, mimeType, imageBase64, widthPx, heightPx } = parsed.data;

    let buffer: Buffer;
    try {
      buffer = Buffer.from(imageBase64, "base64");
    } catch {
      return errorResponse(400, "invalid_image", "imageBase64 could not be decoded.");
    }
    if (buffer.length === 0 || buffer.length > MAX_IMAGE_BYTES) {
      return errorResponse(422, "invalid_image_size", "Image must be between 1 byte and 12MB.");
    }

    const storageKey = generateStorageKey("face-atlas", userId, MIME_EXT[mimeType] ?? "bin");
    await putPrivateObject(storageKey, buffer);

    const [image] = await db
      .insert(faceImages)
      .values({
        scanSessionId: id,
        userId,
        angle,
        storageKey,
        mimeType,
        fileSizeBytes: buffer.length,
        widthPx,
        heightPx,
        qualityStatus: "pending",
        derivedFeatureStatus: "pending",
      })
      .returning({
        id: faceImages.id,
        angle: faceImages.angle,
        mimeType: faceImages.mimeType,
        fileSizeBytes: faceImages.fileSizeBytes,
        qualityStatus: faceImages.qualityStatus,
        createdAt: faceImages.createdAt,
      });

    await writeAuditLog({
      userId,
      action: "face_atlas.image_uploaded",
      resourceType: "face_image",
      resourceId: image.id,
      metadata: { angle, scanSessionId: id },
    });

    // Enqueue durable background processing (quality check + derived features).
    // No inline fabrication of results — the worker (or an unconfigured stub)
    // will set qualityStatus/derivedFeatureStatus based on real processing.
    await enqueueJob("face_atlas_process", { faceImageId: image.id, scanSessionId: id }, { userId });

    const capturedAngles = await db
      .select({ angle: faceImages.angle })
      .from(faceImages)
      .where(and(eq(faceImages.scanSessionId, id), eq(faceImages.isDeleted, false)));
    const angleSet = new Set(capturedAngles.map((a) => a.angle));
    const missingAngles = REQUIRED_FACE_ATLAS_ANGLES.filter((a) => !angleSet.has(a));

    if (missingAngles.length === 0) {
      await db
        .update(scanSessions)
        .set({ status: "awaiting_processing", updatedAt: new Date() })
        .where(eq(scanSessions.id, id));
    }

    return NextResponse.json({ image, missingAngles }, { status: 201 });
  });
}
