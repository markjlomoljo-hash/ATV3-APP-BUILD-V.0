import { NextRequest, NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { faceImages, lesionAnnotations } from "@/db/schema";
import { requireAuth } from "@/lib/auth";
import { notFound, parseJsonBody, withErrorHandling } from "@/lib/http";
import { lesionAnnotationSchema } from "@/lib/validation/faceAtlas";
import { writeAuditLog } from "@/lib/audit";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  return withErrorHandling(async () => {
    const auth = await requireAuth(req);
    if ("error" in auth) return auth.error;
    const userId = auth.ctx.user.id;

    const parsed = await parseJsonBody(req, lesionAnnotationSchema);
    if ("error" in parsed) return parsed.error;
    const { faceImageId, xNorm, yNorm, lesionType, userCertainty } = parsed.data;

    const [image] = await db
      .select({ id: faceImages.id })
      .from(faceImages)
      .where(and(eq(faceImages.id, faceImageId), eq(faceImages.userId, userId)))
      .limit(1);
    if (!image) return notFound("Face image");

    const [annotation] = await db
      .insert(lesionAnnotations)
      .values({
        faceImageId,
        userId,
        xNorm: xNorm.toString(),
        yNorm: yNorm.toString(),
        lesionType,
        userCertainty,
      })
      .returning();

    await writeAuditLog({
      userId,
      action: "face_atlas.lesion_annotation_created",
      resourceType: "lesion_annotation",
      resourceId: annotation.id,
    });

    return NextResponse.json({ annotation }, { status: 201 });
  });
}
