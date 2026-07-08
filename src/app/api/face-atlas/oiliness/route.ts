import { NextRequest, NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { scanSessions, oilinessSelfRatings } from "@/db/schema";
import { requireAuth } from "@/lib/auth";
import { notFound, parseJsonBody, withErrorHandling } from "@/lib/http";
import { oilinessRatingSchema } from "@/lib/validation/faceAtlas";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  return withErrorHandling(async () => {
    const auth = await requireAuth(req);
    if ("error" in auth) return auth.error;
    const userId = auth.ctx.user.id;

    const parsed = await parseJsonBody(req, oilinessRatingSchema);
    if ("error" in parsed) return parsed.error;
    const { scanSessionId, zone, rating } = parsed.data;

    const [session] = await db
      .select({ id: scanSessions.id })
      .from(scanSessions)
      .where(and(eq(scanSessions.id, scanSessionId), eq(scanSessions.userId, userId)))
      .limit(1);
    if (!session) return notFound("Scan session");

    const [row] = await db
      .insert(oilinessSelfRatings)
      .values({ scanSessionId, userId, zone, rating })
      .returning();

    return NextResponse.json({ oilinessRating: row }, { status: 201 });
  });
}
