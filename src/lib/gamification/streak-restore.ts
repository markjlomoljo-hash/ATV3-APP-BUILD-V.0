import { randomUUID } from "crypto";
import { and, eq, gte, sql } from "drizzle-orm";
import { db } from "@/db";
import { dailyTaskSummaries, streakRestores } from "@/db/schema";
import { addDaysToLocalDate, localDateInTimezone, monthKeyFromLocalDate } from "@/lib/dates";
import { ApiError } from "@/lib/api-helpers";
import { recomputeStreak } from "./streaks";
import type { SessionUser } from "@/lib/auth";

const MAX_RESTORES_PER_MONTH = 3;
const MAX_LOOKBACK_DAYS = 14;

/** Restores the *motivational streak state* for a specific missed day.
 * This never fabricates missing health data — it only marks the day as
 * "restored" for streak-counting purposes, and it is capped at 3 uses per
 * calendar month (based on the month in which the restore is used). */
export async function restoreStreakDay(user: SessionUser, targetDate: string) {
  const today = localDateInTimezone(user.timezone);
  if (targetDate >= today) {
    throw new ApiError(422, "You can only restore a past day.");
  }
  if (addDaysToLocalDate(targetDate, MAX_LOOKBACK_DAYS) < today) {
    throw new ApiError(422, `Restores are only available within the last ${MAX_LOOKBACK_DAYS} days.`);
  }

  const summaryRows = await db
    .select()
    .from(dailyTaskSummaries)
    .where(and(eq(dailyTaskSummaries.userId, user.id), eq(dailyTaskSummaries.localDate, targetDate)))
    .limit(1);
  const summary = summaryRows[0];
  if (!summary) {
    throw new ApiError(404, "No task record exists for that day.");
  }
  if (summary.isFullStreakDay || summary.restoredFullStreak) {
    throw new ApiError(409, "That day is already a full streak day.");
  }

  const monthKey = monthKeyFromLocalDate(today);
  const usedThisMonth = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(streakRestores)
    .where(and(eq(streakRestores.userId, user.id), eq(streakRestores.monthKey, monthKey)));
  if ((usedThisMonth[0]?.count ?? 0) >= MAX_RESTORES_PER_MONTH) {
    throw new ApiError(429, `You've used all ${MAX_RESTORES_PER_MONTH} streak restores available this month.`);
  }

  await db.insert(streakRestores).values({ id: randomUUID(), userId: user.id, restoredForDate: targetDate, monthKey }).onConflictDoNothing({
    target: [streakRestores.userId, streakRestores.restoredForDate],
  });

  await db
    .update(dailyTaskSummaries)
    .set({ restoredFullStreak: true, updatedAt: new Date() })
    .where(and(eq(dailyTaskSummaries.userId, user.id), eq(dailyTaskSummaries.localDate, targetDate)));

  const streak = await recomputeStreak(user.id, user.timezone);
  const remaining = MAX_RESTORES_PER_MONTH - ((usedThisMonth[0]?.count ?? 0) + 1);
  return { streak, restoresRemainingThisMonth: Math.max(0, remaining) };
}

export async function getRestoresRemaining(user: SessionUser) {
  const today = localDateInTimezone(user.timezone);
  const monthKey = monthKeyFromLocalDate(today);
  const usedThisMonth = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(streakRestores)
    .where(and(eq(streakRestores.userId, user.id), eq(streakRestores.monthKey, monthKey)));
  return Math.max(0, MAX_RESTORES_PER_MONTH - (usedThisMonth[0]?.count ?? 0));
}
