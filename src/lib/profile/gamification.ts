import { eq } from "drizzle-orm";
import { db } from "@/db";
import { badges, streakState, tasks } from "@/db/schema";
import { GamificationSummary } from "@/types/profile";

/** Reads only — Phase 7 surfaces gamification state, it does not compute it. */
export async function computeGamificationSummary(userId: string): Promise<GamificationSummary> {
  const streakRows = await db
    .select()
    .from(streakState)
    .where(eq(streakState.userId, userId))
    .limit(1);
  const badgeRows = await db.select().from(badges).where(eq(badges.userId, userId));
  const taskRows = await db.select().from(tasks).where(eq(tasks.userId, userId));

  const completedTasks = taskRows.filter((t) => t.completed);
  const totalPoints = completedTasks.reduce((sum, t) => sum + t.points, 0);

  const streak = streakRows[0];

  return {
    currentStreak: streak?.currentStreak ?? 0,
    longestStreak: streak?.longestStreak ?? 0,
    totalPoints,
    badgeCount: badgeRows.length,
    badges: badgeRows.map((b) => b.badgeKey),
    insufficientData: taskRows.length === 0 && badgeRows.length === 0,
  };
}
