import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import {
  ADHERENT_CHECKIN_STATUSES,
  BADGE_RULES,
  PET_STAGE_RULES,
  RANK_RULES,
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

describe("streak computation", () => {
  it("returns honest zeros for empty history (no seeding)", () => {
    expect(computeStreaks([], "2026-07-26")).toEqual({ currentStreak: 0, longestStreak: 0 });
  });

  it("counts a run ending today as the current streak", () => {
    expect(computeStreaks(["2026-07-24", "2026-07-25", "2026-07-26"], "2026-07-26")).toEqual({
      currentStreak: 3,
      longestStreak: 3,
    });
  });

  it("keeps the streak alive when the last activity was yesterday", () => {
    expect(computeStreaks(["2026-07-24", "2026-07-25"], "2026-07-26")).toEqual({
      currentStreak: 2,
      longestStreak: 2,
    });
  });

  it("resets the current streak after a full missed UTC day but keeps the longest", () => {
    expect(computeStreaks(["2026-07-20", "2026-07-21", "2026-07-22"], "2026-07-26")).toEqual({
      currentStreak: 0,
      longestStreak: 3,
    });
  });

  it("pins the break boundary exactly: yesterday survives, two days ago is broken", () => {
    // The rule is "alive while the run ends today or yesterday" — a gap of
    // exactly one full missed UTC day (last activity two days ago) MUST be 0.
    // This is the minimal mutation-killing pair for the <= 1 comparison.
    expect(computeStreaks(["2026-07-24", "2026-07-25"], "2026-07-26")).toEqual({
      currentStreak: 2,
      longestStreak: 2,
    });
    expect(computeStreaks(["2026-07-23", "2026-07-24"], "2026-07-26")).toEqual({
      currentStreak: 0,
      longestStreak: 2,
    });
    // Single-day histories at the same boundary.
    expect(computeStreaks(["2026-07-25"], "2026-07-26")).toEqual({
      currentStreak: 1,
      longestStreak: 1,
    });
    expect(computeStreaks(["2026-07-24"], "2026-07-26")).toEqual({
      currentStreak: 0,
      longestStreak: 1,
    });
  });

  it("breaks runs across gaps and tracks the longest run anywhere in history", () => {
    const days = ["2026-07-01", "2026-07-02", "2026-07-03", "2026-07-04", "2026-07-10", "2026-07-11"];
    expect(computeStreaks(days, "2026-07-11")).toEqual({ currentStreak: 2, longestStreak: 4 });
  });

  it("de-duplicates same-day activity and tolerates unsorted input", () => {
    expect(
      computeStreaks(["2026-07-26", "2026-07-25", "2026-07-26", "2026-07-25"], "2026-07-26"),
    ).toEqual({ currentStreak: 2, longestStreak: 2 });
  });

  it("ignores future-dated and malformed days instead of counting them", () => {
    expect(
      computeStreaks(["2026-07-25", "2026-07-30", "not-a-date", "2026-13-40"], "2026-07-26"),
    ).toEqual({ currentStreak: 1, longestStreak: 1 });
  });

  it("treats month and year boundaries as consecutive days", () => {
    expect(computeStreaks(["2025-12-31", "2026-01-01"], "2026-01-01")).toEqual({
      currentStreak: 2,
      longestStreak: 2,
    });
    expect(computeStreaks(["2026-06-30", "2026-07-01"], "2026-07-01")).toEqual({
      currentStreak: 2,
      longestStreak: 2,
    });
  });

  it("clamps a persisted streak by the same break rule at read time", () => {
    // Alive: last action today or yesterday (UTC) serves the stored value.
    expect(clampPersistedStreak(5, new Date("2026-07-26T01:00:00.000Z"), "2026-07-26")).toBe(5);
    expect(clampPersistedStreak(5, new Date("2026-07-25T23:59:59.999Z"), "2026-07-26")).toBe(5);
    // Broken: exactly one full missed UTC day (two days ago) serves 0 — the
    // same mutation-killing boundary as computeStreaks.
    expect(clampPersistedStreak(5, new Date("2026-07-24T23:59:59.999Z"), "2026-07-26")).toBe(0);
    // Long lapse stays 0 no matter how large the stored streak was.
    expect(clampPersistedStreak(31, new Date("2026-06-01T12:00:00.000Z"), "2026-07-26")).toBe(0);
    // Fail-closed: a positive streak without a usable lastActionAt is never trusted.
    expect(clampPersistedStreak(5, null, "2026-07-26")).toBe(0);
    expect(clampPersistedStreak(5, new Date("not-a-date"), "2026-07-26")).toBe(0);
    expect(clampPersistedStreak(0, new Date("2026-07-26T01:00:00.000Z"), "2026-07-26")).toBe(0);
    expect(clampPersistedStreak(-3, new Date("2026-07-26T01:00:00.000Z"), "2026-07-26")).toBe(0);
  });

  it("derives activity days in UTC so near-midnight events land on distinct days", () => {
    const beforeMidnight = utcDayOf(new Date("2026-07-25T23:59:59.999Z"));
    const afterMidnight = utcDayOf(new Date("2026-07-26T00:00:00.001Z"));
    expect(beforeMidnight).toBe("2026-07-25");
    expect(afterMidnight).toBe("2026-07-26");
    expect(computeStreaks([beforeMidnight, afterMidnight], "2026-07-26")).toEqual({
      currentStreak: 2,
      longestStreak: 2,
    });
  });
});

describe("points, rank, and pet rules", () => {
  it("derives points only from documented per-event values", () => {
    expect(computePoints({ completedTaskCount: 0, adherentCheckinCount: 0 })).toBe(0);
    expect(computePoints({ completedTaskCount: 3, adherentCheckinCount: 2 })).toBe(40);
  });

  it("stays unranked below the first threshold and promotes exactly at each threshold", () => {
    expect(computeRank(0)).toBeNull();
    expect(computeRank(99)).toBeNull();
    expect(computeRank(100)).toBe("bronze");
    expect(computeRank(249)).toBe("bronze");
    expect(computeRank(250)).toBe("silver");
    expect(computeRank(500)).toBe("gold");
    expect(computeRank(1000)).toBe("platinum");
  });

  it("keeps rank thresholds strictly descending so the first match wins", () => {
    const minimums = RANK_RULES.map((rule) => rule.minPoints);
    expect([...minimums].sort((a, b) => b - a)).toEqual(minimums);
  });

  it("evolves the pet only at documented XP thresholds", () => {
    expect(computePetXp(0)).toBe(0);
    expect(computePetStage(0)).toBe("seed");
    expect(computePetStage(49)).toBe("seed");
    expect(computePetStage(50)).toBe("sprout");
    expect(computePetStage(150)).toBe("sapling");
    expect(computePetStage(400)).toBe("bloom");
    expect(computePetStage(800)).toBe("flourish");
    expect(computePetStage(-5)).toBe("seed");
    const minimums = PET_STAGE_RULES.map((rule) => rule.minXp);
    expect([...minimums].sort((a, b) => b - a)).toEqual(minimums);
  });
});

describe("badge rules", () => {
  const empty = { completedTaskCount: 0, adherentCheckinCount: 0, currentStreak: 0, longestStreak: 0 };

  it("earns nothing from empty history", () => {
    expect(evaluateBadgeRules(empty)).toEqual([]);
  });

  it("earns badges exactly at their documented thresholds", () => {
    expect(evaluateBadgeRules({ ...empty, completedTaskCount: 1 })).toEqual(["first_task_complete"]);
    expect(evaluateBadgeRules({ ...empty, completedTaskCount: 25 })).toEqual([
      "first_task_complete",
      "task_builder_25",
    ]);
    expect(evaluateBadgeRules({ ...empty, adherentCheckinCount: 7 })).toEqual(["checkin_consistent_7"]);
    expect(evaluateBadgeRules({ ...empty, longestStreak: 7 })).toEqual(["streak_7"]);
    expect(evaluateBadgeRules({ ...empty, longestStreak: 6 })).toEqual([]);
  });

  it("keys streak badges on the longest streak so recomputation never revokes them", () => {
    expect(evaluateBadgeRules({ ...empty, currentStreak: 0, longestStreak: 30 })).toEqual([
      "streak_7",
      "streak_30",
    ]);
  });

  it("classifies only used and partial check-ins as adherent", () => {
    expect([...ADHERENT_CHECKIN_STATUSES]).toEqual(["used", "partial"]);
    expect(isAdherentCheckinStatus("used")).toBe(true);
    expect(isAdherentCheckinStatus("partial")).toBe(true);
    for (const status of ["skipped", "delayed", "stopped", ""]) {
      expect(isAdherentCheckinStatus(status)).toBe(false);
    }
  });

  it("has a catalog migration row for every badge rule code", () => {
    const sql = readFileSync(
      join(process.cwd(), "supabase", "migrations", "20260726090000_gamification_badge_catalog.sql"),
      "utf8",
    );
    for (const rule of BADGE_RULES) {
      expect(sql).toContain(`'${rule.code}'`);
    }
    expect(sql.toLowerCase()).toContain("on conflict (code) do nothing");
  });
});
