import { requireSessionUser } from "@/lib/auth";
import { jsonOk, withApiHandler } from "@/lib/api-helpers";
import { syncProgress } from "@/lib/gamification/progress";
import { getRestoresRemaining } from "@/lib/gamification/streak-restore";
import { db } from "@/db";
import { userBadges, badges } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function GET() {
  return withApiHandler(async () => {
    const user = await requireSessionUser();
    const progress = await syncProgress(user.id);
    const restoresRemaining = await getRestoresRemaining(user);

    const earned = await db
      .select({ id: badges.id, name: badges.name, description: badges.description, category: badges.category, icon: badges.icon, unlockedAt: userBadges.unlockedAt })
      .from(userBadges)
      .innerJoin(badges, eq(userBadges.badgeId, badges.id))
      .where(eq(userBadges.userId, user.id));

    return jsonOk({ progress, badges: earned, restoresRemainingThisMonth: restoresRemaining });
  });
}
