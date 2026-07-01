import { eq } from "drizzle-orm";
import { db } from "@/db";
import { badges, userBadges } from "@/db/schema";
import { requireSessionUser } from "@/lib/auth";
import { jsonOk, withApiHandler } from "@/lib/api-helpers";

export async function GET() {
  return withApiHandler(async () => {
    const user = await requireSessionUser();
    const all = await db.select().from(badges);
    const earned = await db.select({ badgeId: userBadges.badgeId, unlockedAt: userBadges.unlockedAt }).from(userBadges).where(eq(userBadges.userId, user.id));
    const earnedMap = new Map(earned.map((e) => [e.badgeId, e.unlockedAt]));

    return jsonOk({
      badges: all.map((b) => ({ ...b, unlocked: earnedMap.has(b.id), unlockedAt: earnedMap.get(b.id) ?? null })),
    });
  });
}
