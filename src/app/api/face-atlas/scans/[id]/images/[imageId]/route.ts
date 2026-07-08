import { NextRequest, NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { faceImages } from "@/db/schema";
import { requireAuth } from "@/lib/auth";
import { notFound, withErrorHandling } from "@/lib/http";
import { deletePrivateObject, getPrivateObject } from "@/lib/storage";
import { writeAuditLog } from "@/lib/audit";

export const dynamic = "force-dynamic";

async function loadOwnedImage(userId: string, scanSessionId: string, imageId: string) {
  const [image] = await db
    .select()
    .from(faceImages)
    .where(
      and(
        eq(faceImages.id, imageId),
        eq(faceImages.scanSessionId, scanSessionId),
        eq(faceImages.userId, userId),
        eq(faceImages.isDeleted, false),
      ),
    )
    .limit(1);
  return image;
}

/** Streams the private raw image bytes after verifying ownership. Never a public URL. */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; imageId: string }> },
) {
  return withErrorHandling(async () => {
    const auth = await requireAuth(req);
    if ("error" in auth) return auth.error;
    const { id, imageId } = await params;

    const image = await loadOwnedImage(auth.ctx.user.id, id, imageId);
    if (!image) return notFound("Face image");

    const bytes = await getPrivateObject(image.storageKey);
    return new NextResponse(new Uint8Array(bytes), {
      status: 200,
      headers: {
        "Content-Type": image.mimeType ?? "application/octet-stream",
        "Cache-Control": "private, no-store",
      },
    });
  });
}

/** Permanently deletes a single raw face image. */
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; imageId: string }> },
) {
  return withErrorHandling(async () => {
    const auth = await requireAuth(req);
    if ("error" in auth) return auth.error;
    const userId = auth.ctx.user.id;
    const { id, imageId } = await params;

    const image = await loadOwnedImage(userId, id, imageId);
    if (!image) return notFound("Face image");

    await deletePrivateObject(image.storageKey).catch((err) => {
      console.error("[face_image_delete_failed]", imageId, err);
    });

    await db
      .update(faceImages)
      .set({ isDeleted: true, deletedAt: new Date() })
      .where(eq(faceImages.id, imageId));

    await writeAuditLog({
      userId,
      action: "face_atlas.image_deleted",
      resourceType: "face_image",
      resourceId: imageId,
    });

    return NextResponse.json({ ok: true });
  });
}
