import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import { badges, gamification, treatmentTasks, userBadges } from "@/db/schema";
import { GamificationSummary } from "@/types/profile";

/** Reads only — Phase 7 surfaces gamification state, it does not compute it. */
export async function computeGamificationSummary(userId: string): Promise<GamificationSummary> {
  const db = getDb();
  const gamificationRows = await db
    .select()
    .from(gamification)
    .where(eq(gamification.userId, userId))
    .limit(1);
  const badgeRows = await db
    .select({ code: badges.code })
    .from(userBadges)
    .innerJoin(badges, eq(userBadges.badgeId, badges.id))
    .where(eq(userBadges.userId, userId));
  const taskRows = await db
    .select({ completedAt: treatmentTasks.completedAt })
    .from(treatmentTasks)
    .where(eq(treatmentTasks.userId, userId));

  const state = gamificationRows[0];

  return {
    currentStreak: state?.currentStreak ?? 0,
    longestStreak: state?.longestStreak ?? 0,
    // Points are authoritative in gamification. treatment_tasks intentionally
    // has no points column, so this reader must not derive or invent them.
    totalPoints: state?.points ?? 0,
    badgeCount: badgeRows.length,
    badges: badgeRows.map((b) => b.code),
    insufficientData: !state && taskRows.length === 0 && badgeRows.length === 0,
  };
}
