import { NextRequest, NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { scanSessions, faceImages, lesionAnnotations, oilinessSelfRatings } from "@/db/schema";
import { requireAuth } from "@/lib/auth";
import { notFound, withErrorHandling } from "@/lib/http";
import { deletePrivateObject } from "@/lib/storage";
import { writeAuditLog } from "@/lib/audit";

export const dynamic = "force-dynamic";

async function loadOwnedSession(userId: string, id: string) {
  const [session] = await db
    .select()
    .from(scanSessions)
    .where(and(eq(scanSessions.id, id), eq(scanSessions.userId, userId)))
    .limit(1);
  return session;
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return withErrorHandling(async () => {
    const auth = await requireAuth(req);
    if ("error" in auth) return auth.error;
    const { id } = await params;

    const session = await loadOwnedSession(auth.ctx.user.id, id);
    if (!session) return notFound("Scan session");

    const images = await db
      .select({
        id: faceImages.id,
        angle: faceImages.angle,
        mimeType: faceImages.mimeType,
        qualityStatus: faceImages.qualityStatus,
        derivedFeatureStatus: faceImages.derivedFeatureStatus,
        isDeleted: faceImages.isDeleted,
        createdAt: faceImages.createdAt,
      })
      .from(faceImages)
      .where(eq(faceImages.scanSessionId, id));

    const annotations = await db
      .select()
      .from(lesionAnnotations)
      .where(eq(lesionAnnotations.userId, auth.ctx.user.id));

    const oiliness = await db
      .select()
      .from(oilinessSelfRatings)
      .where(eq(oilinessSelfRatings.scanSessionId, id));

    const capturedAngles = new Set(images.filter((i) => !i.isDeleted).map((i) => i.angle));

    return NextResponse.json({
      scanSession: session,
      images,
      annotations,
      oilinessRatings: oiliness,
      capturedAngles: Array.from(capturedAngles),
    });
  });
}

/** Deletes all raw images for a scan session (per raw-image retention policy). */
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return withErrorHandling(async () => {
    const auth = await requireAuth(req);
    if ("error" in auth) return auth.error;
    const userId = auth.ctx.user.id;
    const { id } = await params;

    const session = await loadOwnedSession(userId, id);
    if (!session) return notFound("Scan session");

    const images = await db
      .select()
      .from(faceImages)
      .where(and(eq(faceImages.scanSessionId, id), eq(faceImages.isDeleted, false)));

    for (const image of images) {
      await deletePrivateObject(image.storageKey).catch((err) => {
        console.error("[face_image_delete_failed]", image.id, err);
      });
    }

    await db
      .update(faceImages)
      .set({ isDeleted: true, deletedAt: new Date() })
      .where(eq(faceImages.scanSessionId, id));

    await db
      .update(scanSessions)
      .set({ status: "deleted", rawImagesDeletedAt: new Date(), updatedAt: new Date() })
      .where(eq(scanSessions.id, id));

    await writeAuditLog({
      userId,
      action: "face_atlas.scan_deleted",
      resourceType: "scan_session",
      resourceId: id,
      metadata: { deletedImageCount: images.length },
    });

    return NextResponse.json({ ok: true, deletedImageCount: images.length });
  });
}
