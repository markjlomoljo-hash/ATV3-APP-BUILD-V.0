import { NextRequest, NextResponse } from "next/server";
import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { profileHistory } from "@/db/schema";
import { requireAuth } from "@/lib/auth";
import { withErrorHandling } from "@/lib/http";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  return withErrorHandling(async () => {
    const auth = await requireAuth(req);
    if ("error" in auth) return auth.error;

    const rows = await db
      .select()
      .from(profileHistory)
      .where(eq(profileHistory.userId, auth.ctx.user.id))
      .orderBy(desc(profileHistory.changedAt))
      .limit(200);

    return NextResponse.json({ history: rows });
  });
}
