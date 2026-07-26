// AcneTrex V3 — Gamification state service.
//
// recomputeGamificationState derives the full canonical gamification state
// (streaks, points, rank, pet, badges) from real persisted adherence history
// and persists the transitions into the live canonical tables
// (public.gamification, public.user_badges). getGamificationState reads the
// persisted state back without computing or inventing anything.
//
// Honest fail-closed behavior: with zero qualifying adherence events nothing
// is written and callers receive status "insufficient_data".
import { eq, inArray } from "drizzle-orm";
import { getDb } from "@/db";
import { badges, gamification, treatmentCheckins, treatmentTasks, userBadges } from "@/db/schema";
import {
  clampPersistedStreak,
  computePetStage,
  computePetXp,
  computePoints,
  computeRank,
  computeStreaks,
  evaluateBadgeRules,
  isAdherentCheckinStatus,
  utcDayOf,
} from "./rules";

export interface GamificationComputedState {
  currentStreak: number;
  longestStreak: number;
  points: number;
  rank: string | null;
  petStage: string;
  petXp: number;
  lastActionAt: string | null;
  completedTaskCount: number;
  adherentCheckinCount: number;
}

export type GamificationRecomputeResult =
  | ({ status: "insufficient_data"; persisted: false } & GamificationComputedState & {
      earnedBadgeCodes: string[];
      newlyAwardedBadgeCodes: string[];
      uncatalogedBadgeCodes: string[];
    })
  | ({ status: "computed"; persisted: true } & GamificationComputedState & {
      earnedBadgeCodes: string[];
      newlyAwardedBadgeCodes: string[];
      uncatalogedBadgeCodes: string[];
    });

const EMPTY_STATE: GamificationComputedState = {
  currentStreak: 0,
  longestStreak: 0,
  points: 0,
  rank: null,
  petStage: "seed",
  petXp: 0,
  lastActionAt: null,
  completedTaskCount: 0,
  adherentCheckinCount: 0,
};

/**
 * Recomputes and persists gamification state from real history.
 *
 * Inputs (all persisted user records, never synthesized):
 * - treatment_tasks: rows with completed_at set and skipped=false. The
 *   activity day is the UTC day the completion was recorded.
 * - treatment_checkins: rows whose status is adherent (used | partial). The
 *   activity day is the reported checkin_date.
 *
 * The function is idempotent: re-running over the same history writes the
 * same state and awards no duplicate badges (user_badges is unique on
 * (user_id, badge_id) and already-earned badges are filtered out first).
 */
export async function recomputeGamificationState(
  userId: string,
  now: Date = new Date(),
): Promise<GamificationRecomputeResult> {
  const db = getDb();

  const taskRows = await db
    .select({ completedAt: treatmentTasks.completedAt, skipped: treatmentTasks.skipped })
    .from(treatmentTasks)
    .where(eq(treatmentTasks.userId, userId));
  const checkinRows = await db
    .select({
      checkinDate: treatmentCheckins.checkinDate,
      status: treatmentCheckins.status,
      createdAt: treatmentCheckins.createdAt,
    })
    .from(treatmentCheckins)
    .where(eq(treatmentCheckins.userId, userId));

  const completedTasks = taskRows.filter(
    (row): row is { completedAt: Date; skipped: boolean } =>
      row.completedAt instanceof Date && !row.skipped,
  );
  const adherentCheckins = checkinRows.filter((row) => isAdherentCheckinStatus(row.status));

  const completedTaskCount = completedTasks.length;
  const adherentCheckinCount = adherentCheckins.length;

  if (completedTaskCount === 0 && adherentCheckinCount === 0) {
    // No qualifying history: never seed a state row from nothing.
    return {
      status: "insufficient_data",
      persisted: false,
      ...EMPTY_STATE,
      earnedBadgeCodes: [],
      newlyAwardedBadgeCodes: [],
      uncatalogedBadgeCodes: [],
    };
  }

  const activityDays = [
    ...completedTasks.map((row) => utcDayOf(row.completedAt)),
    ...adherentCheckins.map((row) => row.checkinDate),
  ];
  const { currentStreak, longestStreak } = computeStreaks(activityDays, utcDayOf(now));
  const points = computePoints({ completedTaskCount, adherentCheckinCount });
  const rank = computeRank(points);
  const petXp = computePetXp(completedTaskCount);
  const petStage = computePetStage(petXp);
  const actionTimestamps = [
    ...completedTasks.map((row) => row.completedAt.getTime()),
    ...adherentCheckins.map((row) => row.createdAt.getTime()),
  ];
  const lastActionAt = new Date(Math.max(...actionTimestamps));

  const persistedState = {
    currentStreak,
    longestStreak,
    points,
    rank,
    petStage,
    petXp,
    lastActionAt,
    updatedAt: now,
  };
  await db
    .insert(gamification)
    .values({ userId, ...persistedState })
    .onConflictDoUpdate({ target: gamification.userId, set: persistedState });

  const earnedCodes = evaluateBadgeRules({
    completedTaskCount,
    adherentCheckinCount,
    currentStreak,
    longestStreak,
  });
  let earnedBadgeCodes: string[] = [];
  let newlyAwardedBadgeCodes: string[] = [];
  let uncatalogedBadgeCodes: string[] = [];
  if (earnedCodes.length > 0) {
    // Only badges with a real catalog row can be awarded; eligibility without
    // a catalog row is reported honestly instead of inventing a badge.
    const catalogRows = await db
      .select({ id: badges.id, code: badges.code })
      .from(badges)
      .where(inArray(badges.code, earnedCodes));
    earnedBadgeCodes = catalogRows.map((row) => row.code);
    uncatalogedBadgeCodes = earnedCodes.filter(
      (code) => !catalogRows.some((row) => row.code === code),
    );

    const existingRows = await db
      .select({ badgeId: userBadges.badgeId })
      .from(userBadges)
      .where(eq(userBadges.userId, userId));
    const existingBadgeIds = new Set(existingRows.map((row) => row.badgeId));
    const missing = catalogRows.filter((row) => !existingBadgeIds.has(row.id));
    if (missing.length > 0) {
      await db
        .insert(userBadges)
        .values(missing.map((row) => ({ userId, badgeId: row.id })))
        .onConflictDoNothing();
      newlyAwardedBadgeCodes = missing.map((row) => row.code);
    }
  }

  return {
    status: "computed",
    persisted: true,
    currentStreak,
    longestStreak,
    points,
    rank,
    petStage,
    petXp,
    lastActionAt: lastActionAt.toISOString(),
    completedTaskCount,
    adherentCheckinCount,
    earnedBadgeCodes,
    newlyAwardedBadgeCodes,
    uncatalogedBadgeCodes,
  };
}

export interface GamificationStateView {
  status: "ok" | "insufficient_data";
  currentStreak: number;
  longestStreak: number;
  points: number;
  rank: string | null;
  petStage: string;
  petXp: number;
  lastActionAt: string | null;
  badges: Array<{ code: string; earnedAt: string }>;
}

/**
 * Read-only view of the persisted canonical gamification state. Returns
 * status "insufficient_data" (with honest zeros) when no state row and no
 * badges exist — it never fabricates progress on read.
 *
 * currentStreak is the one persisted field that can OVER-report when stale
 * (recompute only runs on demand; every other field is a monotone lifetime
 * value that at worst under-reports). The reader therefore derives it on
 * read: the stored streak is served only while the row's lastActionAt day is
 * today or yesterday (UTC) — the same break rule computeStreaks applies —
 * and is otherwise served as 0 without writing anything.
 */
export async function getGamificationState(
  userId: string,
  now: Date = new Date(),
): Promise<GamificationStateView> {
  const db = getDb();
  const stateRows = await db
    .select()
    .from(gamification)
    .where(eq(gamification.userId, userId))
    .limit(1);
  const badgeRows = await db
    .select({ code: badges.code, earnedAt: userBadges.earnedAt })
    .from(userBadges)
    .innerJoin(badges, eq(userBadges.badgeId, badges.id))
    .where(eq(userBadges.userId, userId));

  const state = stateRows[0];
  return {
    status: !state && badgeRows.length === 0 ? "insufficient_data" : "ok",
    currentStreak: clampPersistedStreak(
      state?.currentStreak ?? 0,
      state?.lastActionAt ?? null,
      utcDayOf(now),
    ),
    longestStreak: state?.longestStreak ?? 0,
    points: state?.points ?? 0,
    rank: state?.rank ?? null,
    petStage: state?.petStage ?? "seed",
    petXp: state?.petXp ?? 0,
    lastActionAt: state?.lastActionAt?.toISOString() ?? null,
    badges: badgeRows.map((row) => ({ code: row.code, earnedAt: row.earnedAt.toISOString() })),
  };
}
