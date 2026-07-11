import { randomUUID } from "crypto";
import { and, desc, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import {
  consentReviews,
  faceScans,
  petState,
  pointsLedger,
  ranks,
  streaks,
  taskCompletions,
  tasks,
  treatmentCheckins,
  userBadges,
  userRankHistory,
} from "@/db/schema";
import { PET_STAGES } from "./seed-data";
import { ensureCatalogSeeded } from "./ensure-seed";

/** Recomputes badges, rank, and streak-pet growth from real persisted
 * counts only. Never invents progress — every input is a COUNT(*) or SUM()
 * over the user's own records. */
export async function syncProgress(userId: string) {
  await ensureCatalogSeeded();

  const [pointsRow] = await db
    .select({ total: sql<number>`coalesce(sum(${pointsLedger.points}), 0)::int` })
    .from(pointsLedger)
    .where(eq(pointsLedger.userId, userId));
  const totalPoints = pointsRow?.total ?? 0;

  const [streakRow] = await db.select().from(streaks).where(eq(streaks.userId, userId)).limit(1);
  const currentStreak = streakRow?.currentStreak ?? 0;
  const longestStreak = streakRow?.longestStreak ?? 0;

  const [scanCountRow] = await db.select({ count: sql<number>`count(*)::int` }).from(faceScans).where(eq(faceScans.userId, userId));
  const scanCount = scanCountRow?.count ?? 0;

  const [annotatedRow] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(faceScans)
    .where(and(eq(faceScans.userId, userId), eq(faceScans.annotationComplete, true)));
  const annotatedCount = annotatedRow?.count ?? 0;

  const [consentRow] = await db.select({ count: sql<number>`count(*)::int` }).from(consentReviews).where(eq(consentReviews.userId, userId));
  const consentCount = consentRow?.count ?? 0;

  const [checkinRow] = await db.select({ count: sql<number>`count(*)::int` }).from(treatmentCheckins).where(eq(treatmentCheckins.userId, userId));
  const checkinCount = checkinRow?.count ?? 0;

  const [backfillRow] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(tasks)
    .where(and(eq(tasks.userId, userId), eq(tasks.templateId, "backfill_log"), eq(tasks.status, "completed")));
  const backfillCount = backfillRow?.count ?? 0;

  const [completionRow] = await db.select({ count: sql<number>`count(*)::int` }).from(taskCompletions).where(eq(taskCompletions.userId, userId));
  const totalCompletions = completionRow?.count ?? 0;

  // --- Badges (unlock only when the real criteria are met) ---
  const badgeChecks: Array<{ id: string; unlocked: boolean }> = [
    { id: "first_scan", unlocked: scanCount >= 1 },
    { id: "seven_day_streak", unlocked: longestStreak >= 7 },
    { id: "thirty_day_streak", unlocked: longestStreak >= 30 },
    { id: "treatment_adherent", unlocked: checkinCount >= 14 },
    { id: "annotation_pro", unlocked: annotatedCount >= 5 },
    { id: "consent_aware", unlocked: consentCount >= 1 },
    { id: "comeback", unlocked: backfillCount >= 1 },
  ];
  for (const check of badgeChecks) {
    if (!check.unlocked) continue;
    await db.insert(userBadges).values({ id: randomUUID(), userId, badgeId: check.id }).onConflictDoNothing({
      target: [userBadges.userId, userBadges.badgeId],
    });
  }

  // --- Rank (based on lifetime points + longest streak ever achieved) ---
  const allRanks = await db.select().from(ranks).orderBy(desc(ranks.sortOrder));
  const earnedRank = allRanks.find((r) => totalPoints >= r.minPoints && longestStreak >= r.minStreak) ?? allRanks[allRanks.length - 1];
  if (earnedRank) {
    const [latestHistory] = await db
      .select()
      .from(userRankHistory)
      .where(eq(userRankHistory.userId, userId))
      .orderBy(desc(userRankHistory.achievedAt))
      .limit(1);
    if (!latestHistory || latestHistory.rankId !== earnedRank.id) {
      await db.insert(userRankHistory).values({ id: randomUUID(), userId, rankId: earnedRank.id });
    }
  }

  // --- Streak pet growth (weighted sum of real, documented metrics) ---
  const growthScore = Math.round(
    currentStreak * 4 +
      Math.min(longestStreak, 60) * 2 +
      totalCompletions * 1 +
      scanCount * 8 +
      annotatedCount * 5 +
      checkinCount * 3 +
      consentCount * 10,
  );
  let stage: (typeof PET_STAGES)[number] = PET_STAGES[0];
  let stageIndex = 0;
  PET_STAGES.forEach((s, idx) => {
    if (growthScore >= s.minGrowth) {
      stage = s;
      stageIndex = idx;
    }
  });

  await db
    .insert(petState)
    .values({ id: randomUUID(), userId, stageIndex, stageCode: stage.code, growthScore })
    .onConflictDoUpdate({ target: petState.userId, set: { stageIndex, stageCode: stage.code, growthScore, updatedAt: new Date() } });

  return {
    totalPoints,
    currentStreak,
    longestStreak,
    rank: earnedRank,
    pet: { stageIndex, stageCode: stage.code, growthScore },
    metrics: { scanCount, annotatedCount, consentCount, checkinCount, backfillCount, totalCompletions },
  };
}
