// AcneTrex V3 — Gamification transition rules (server-side, deterministic).
//
// Zero-fabrication constitution: every value in this module is derived from
// real persisted user records (treatment task completions and treatment
// check-ins) through the documented rules below. There is no seeding, no
// randomness, and no "starter" progress — empty history always computes to
// zero streaks, zero points, a null rank, and the base pet stage.
//
// Rule summary
// ------------
// Activity day  A UTC calendar day (YYYY-MM-DD) with at least one qualifying
//               adherence event:
//                 - a treatment task completed (completed_at set, skipped
//                   false) — the day is completed_at rendered in UTC;
//                 - a treatment check-in whose status is in
//                   ADHERENT_CHECKIN_STATUSES — the day is its checkin_date.
// Streaks       currentStreak = length of the consecutive-day run ending
//               today or yesterday (UTC). A streak breaks only after a full
//               missed UTC day; future-dated records are never counted.
//               longestStreak = longest consecutive-day run in history.
//               Read paths must apply the same break rule to persisted rows
//               (clampPersistedStreak): a stored streak whose lastActionAt
//               day is older than yesterday is served as 0, so a lapsed user
//               is never shown a streak the rules say is already broken.
// Points        POINTS_PER_COMPLETED_TASK per completed task plus
//               POINTS_PER_ADHERENT_CHECKIN per adherent check-in.
// Rank          Highest RANK_RULES threshold reached by points; below the
//               first threshold the rank is null (honest "unranked").
// Pet           petXp = PET_XP_PER_COMPLETED_TASK per completed task; the
//               stage is the highest PET_STAGE_RULES threshold reached.
// Badges        BADGE_RULES thresholds over the same real totals. Rules key
//               on lifetime counts and longest streak, so recomputation is
//               monotone and never revokes an earned badge.

export const ADHERENT_CHECKIN_STATUSES = ["used", "partial"] as const;

export const POINTS_PER_COMPLETED_TASK = 10;
export const POINTS_PER_ADHERENT_CHECKIN = 5;
export const PET_XP_PER_COMPLETED_TASK = 10;

/** Ordered descending; the first threshold reached wins. */
export const RANK_RULES = [
  { rank: "platinum", minPoints: 1000 },
  { rank: "gold", minPoints: 500 },
  { rank: "silver", minPoints: 250 },
  { rank: "bronze", minPoints: 100 },
] as const;

/** Ordered descending; "seed" is the honest base stage for zero XP. */
export const PET_STAGE_RULES = [
  { stage: "flourish", minXp: 800 },
  { stage: "bloom", minXp: 400 },
  { stage: "sapling", minXp: 150 },
  { stage: "sprout", minXp: 50 },
  { stage: "seed", minXp: 0 },
] as const;

export interface GamificationTotals {
  completedTaskCount: number;
  adherentCheckinCount: number;
  currentStreak: number;
  longestStreak: number;
}

/**
 * Badge threshold rules. A badge is only awarded when a catalog row with the
 * same code exists in public.badges (seeded by the badge catalog migration);
 * eligibility without a catalog row is surfaced, never silently invented.
 */
export const BADGE_RULES: ReadonlyArray<{
  code: string;
  description: string;
  earned: (totals: GamificationTotals) => boolean;
}> = [
  { code: "first_task_complete", description: "Complete 1 treatment task", earned: (t) => t.completedTaskCount >= 1 },
  { code: "task_builder_25", description: "Complete 25 treatment tasks", earned: (t) => t.completedTaskCount >= 25 },
  { code: "task_master_100", description: "Complete 100 treatment tasks", earned: (t) => t.completedTaskCount >= 100 },
  { code: "checkin_consistent_7", description: "Record 7 adherent treatment check-ins", earned: (t) => t.adherentCheckinCount >= 7 },
  { code: "checkin_consistent_30", description: "Record 30 adherent treatment check-ins", earned: (t) => t.adherentCheckinCount >= 30 },
  { code: "streak_7", description: "Reach a 7-day adherence streak", earned: (t) => t.longestStreak >= 7 },
  { code: "streak_30", description: "Reach a 30-day adherence streak", earned: (t) => t.longestStreak >= 30 },
];

const CALENDAR_DAY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const MS_PER_UTC_DAY = 86_400_000;

/** Renders a timestamp as its UTC calendar day (YYYY-MM-DD). */
export function utcDayOf(value: Date): string {
  return value.toISOString().slice(0, 10);
}

function dayNumber(day: string): number {
  return Date.parse(`${day}T00:00:00.000Z`) / MS_PER_UTC_DAY;
}

export function isAdherentCheckinStatus(status: string): boolean {
  return (ADHERENT_CHECKIN_STATUSES as readonly string[]).includes(status);
}

/**
 * Computes streaks from real activity days only.
 *
 * - Days are de-duplicated; malformed and future-dated days are ignored.
 * - currentStreak counts the trailing consecutive run only while the run ends
 *   today or yesterday (UTC) — a streak survives until a full UTC day has
 *   been missed, then honestly resets to 0.
 * - Empty history returns 0/0 (no seeding).
 */
export function computeStreaks(
  activityDays: Iterable<string>,
  todayUtc: string,
): { currentStreak: number; longestStreak: number } {
  const today = dayNumber(todayUtc);
  const days = [...new Set(activityDays)]
    .filter((day) => CALENDAR_DAY_PATTERN.test(day))
    .map(dayNumber)
    .filter((day) => Number.isFinite(day) && day <= today)
    .sort((a, b) => a - b);

  if (days.length === 0) return { currentStreak: 0, longestStreak: 0 };

  let longestStreak = 1;
  let trailingRun = 1;
  for (let index = 1; index < days.length; index += 1) {
    trailingRun = days[index] - days[index - 1] === 1 ? trailingRun + 1 : 1;
    if (trailingRun > longestStreak) longestStreak = trailingRun;
  }

  const lastDay = days[days.length - 1];
  const currentStreak = today - lastDay <= 1 ? trailingRun : 0;
  return { currentStreak, longestStreak };
}

/**
 * Applies the streak-break rule to a PERSISTED streak at read time.
 *
 * Recompute only runs on demand, so a stored currentStreak goes stale the
 * moment a user lapses. The row's own lastActionAt is enough to clamp it:
 * a streak is only alive while its last qualifying action's UTC day is today
 * or yesterday (the exact rule computeStreaks uses); after a full missed UTC
 * day the honest served value is 0. Fail-closed: a positive streak with no
 * usable lastActionAt is served as 0 rather than trusted. The longest streak
 * and all lifetime counters are monotone and never clamped.
 */
export function clampPersistedStreak(
  persistedStreak: number,
  lastActionAt: Date | null,
  todayUtc: string,
): number {
  if (persistedStreak <= 0) return 0;
  if (!(lastActionAt instanceof Date) || Number.isNaN(lastActionAt.getTime())) return 0;
  return dayNumber(todayUtc) - dayNumber(utcDayOf(lastActionAt)) <= 1 ? persistedStreak : 0;
}

export function computePoints(counts: {
  completedTaskCount: number;
  adherentCheckinCount: number;
}): number {
  return (
    counts.completedTaskCount * POINTS_PER_COMPLETED_TASK +
    counts.adherentCheckinCount * POINTS_PER_ADHERENT_CHECKIN
  );
}

export function computeRank(points: number): string | null {
  const rule = RANK_RULES.find((candidate) => points >= candidate.minPoints);
  return rule?.rank ?? null;
}

export function computePetXp(completedTaskCount: number): number {
  return Math.max(0, completedTaskCount) * PET_XP_PER_COMPLETED_TASK;
}

export function computePetStage(petXp: number): string {
  const rule = PET_STAGE_RULES.find((candidate) => petXp >= candidate.minXp);
  return rule?.stage ?? "seed";
}

/** Badge codes earned by the documented thresholds over real totals. */
export function evaluateBadgeRules(totals: GamificationTotals): string[] {
  return BADGE_RULES.filter((rule) => rule.earned(totals)).map((rule) => rule.code);
}
