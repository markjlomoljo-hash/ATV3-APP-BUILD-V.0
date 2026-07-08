import { NextRequest, NextResponse } from "next/server";
import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { scanSessions } from "@/db/schema";
import { requireAuth } from "@/lib/auth";
import { parseJsonBody, withErrorHandling } from "@/lib/http";
import { createScanSessionSchema } from "@/lib/validation/faceAtlas";
import { writeAuditLog } from "@/lib/audit";
import { REQUIRED_FACE_ATLAS_ANGLES } from "@/db/schema/faceAtlas";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  return withErrorHandling(async () => {
    const auth = await requireAuth(req);
    if ("error" in auth) return auth.error;

    const sessions_ = await db
      .select()
      .from(scanSessions)
      .where(eq(scanSessions.userId, auth.ctx.user.id))
      .orderBy(desc(scanSessions.capturedAt))
      .limit(50);

    return NextResponse.json({ scanSessions: sessions_, requiredAngles: REQUIRED_FACE_ATLAS_ANGLES });
  });
}

export async function POST(req: NextRequest) {
  return withErrorHandling(async () => {
    const auth = await requireAuth(req);
    if ("error" in auth) return auth.error;
    const userId = auth.ctx.user.id;

    const parsed = await parseJsonBody(req, createScanSessionSchema);
    if ("error" in parsed) return parsed.error;

    const [session] = await db
      .insert(scanSessions)
      .values({
        userId,
        rawRetentionPolicy: parsed.data.rawRetentionPolicy ?? "temporary",
        notes: parsed.data.notes,
      })
      .returning();

    await writeAuditLog({ userId, action: "face_atlas.scan_session_created", resourceType: "scan_session", resourceId: session.id });

    return NextResponse.json({ scanSession: session, requiredAngles: REQUIRED_FACE_ATLAS_ANGLES }, { status: 201 });
  });
}


