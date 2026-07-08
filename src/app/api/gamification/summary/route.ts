import { NextRequest, NextResponse } from "next/server";
import { eq, sum } from "drizzle-orm";
import { db } from "@/db";
import { pointsLedger, streaks, userBadges, badges, petState } from "@/db/schema";
import { requireAuth } from "@/lib/auth";
import { withErrorHandling } from "@/lib/http";

export const dynamic = "force-dynamic";

/** Aggregates points, streaks, badges, and pet state — all derived from real ledger rows. */
export async function GET(req: NextRequest) {
  return withErrorHandling(async () => {
    const auth = await requireAuth(req);
    if ("error" in auth) return auth.error;
    const userId = auth.ctx.user.id;

    const [pointsRow] = await db
      .select({ total: sum(pointsLedger.delta) })
      .from(pointsLedger)
      .where(eq(pointsLedger.userId, userId));

    const [streak] = await db.select().from(streaks).where(eq(streaks.userId, userId)).limit(1);

    const earnedBadges = await db
      .select({ badge: badges, earnedAt: userBadges.earnedAt })
      .from(userBadges)
      .innerJoin(badges, eq(badges.id, userBadges.badgeId))
      .where(eq(userBadges.userId, userId));

    const [pet] = await db.select().from(petState).where(eq(petState.userId, userId)).limit(1);

    return NextResponse.json({
      totalPoints: Number(pointsRow?.total ?? 0),
      streak: streak ?? { currentStreakDays: 0, longestStreakDays: 0 },
      badges: earnedBadges,
      pet: pet ?? null,
    });
  });
}
