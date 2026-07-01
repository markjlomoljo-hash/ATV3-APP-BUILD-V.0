import { randomUUID } from "crypto";
import { and, desc, eq, gte } from "drizzle-orm";
import { db } from "@/db";
import { dailyTaskSummaries, streaks } from "@/db/schema";
import { addDaysToLocalDate, localDateInTimezone } from "@/lib/dates";

/** Recomputes current/longest streak purely from `daily_task_summaries`
 * rows. A day counts as "full" only if every required task was completed
 * (or the day was restored via the limited monthly restore). */
export async function recomputeStreak(userId: string, timezone: string) {
  const today = localDateInTimezone(timezone);
  const sinceDate = addDaysToLocalDate(today, -400);

  const rows = await db
    .select()
    .from(dailyTaskSummaries)
    .where(and(eq(dailyTaskSummaries.userId, userId), gte(dailyTaskSummaries.localDate, sinceDate)))
    .orderBy(desc(dailyTaskSummaries.localDate));

  const byDate = new Map(rows.map((r) => [r.localDate as unknown as string, r]));
  const isFull = (d: string) => {
    const row = byDate.get(d);
    return !!row && (row.isFullStreakDay || row.restoredFullStreak);
  };

  let cursor = today;
  let count = 0;
  if (isFull(today)) {
    count = 1;
    cursor = addDaysToLocalDate(today, -1);
  } else {
    cursor = addDaysToLocalDate(today, -1);
  }

  while (isFull(cursor)) {
    count += 1;
    cursor = addDaysToLocalDate(cursor, -1);
  }

  const existing = await db.select().from(streaks).where(eq(streaks.userId, userId)).limit(1);
  const longest = Math.max(existing[0]?.longestStreak ?? 0, count);

  await db
    .insert(streaks)
    .values({ id: randomUUID(), userId, currentStreak: count, longestStreak: longest, lastEvaluatedDate: today })
    .onConflictDoUpdate({
      target: streaks.userId,
      set: { currentStreak: count, longestStreak: longest, lastEvaluatedDate: today, updatedAt: new Date() },
    });

  return { currentStreak: count, longestStreak: longest };
}

export async function getStreak(userId: string) {
  const rows = await db.select().from(streaks).where(eq(streaks.userId, userId)).limit(1);
  return rows[0] ?? { currentStreak: 0, longestStreak: 0, lastEvaluatedDate: null };
}
