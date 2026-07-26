import { describe, expect, it } from "vitest";
import {
  DAILY_LOG_KINDS,
  DAILY_LOG_KIND_SLUGS,
  buildDailyLogSubmission,
  getDailyLogKind,
  summarizeDailyLogEntry,
  type DailyLogEntry,
} from "./kinds";

describe("daily-log kind definitions", () => {
  it("defines fields, schema, and honest empty states for all nine kinds", () => {
    expect(DAILY_LOG_KIND_SLUGS).toHaveLength(9);
    for (const slug of DAILY_LOG_KIND_SLUGS) {
      const definition = DAILY_LOG_KINDS[slug];
      expect(definition.slug).toBe(slug);
      expect(definition.fields.length).toBeGreaterThan(0);
      expect(definition.emptyHistory.length).toBeGreaterThan(10);
      expect(["sleep_logs", "food_logs", "daily_logs", "acne_history"]).toContain(definition.table);
    }
  });

  it("maps kinds to the same live tables mobile writes", () => {
    expect(DAILY_LOG_KINDS.sleep.table).toBe("sleep_logs");
    expect(DAILY_LOG_KINDS.food.table).toBe("food_logs");
    expect(DAILY_LOG_KINDS.stress.table).toBe("daily_logs");
    expect(DAILY_LOG_KINDS.activity.table).toBe("daily_logs");
    expect(DAILY_LOG_KINDS.hydration.table).toBe("daily_logs");
    expect(DAILY_LOG_KINDS.cycle.table).toBe("daily_logs");
    expect(DAILY_LOG_KINDS.contact.table).toBe("daily_logs");
    expect(DAILY_LOG_KINDS.routine.table).toBe("daily_logs");
    expect(DAILY_LOG_KINDS["skin-state"].table).toBe("acne_history");
    expect(DAILY_LOG_KINDS["skin-state"].singleton).toBe(true);
  });

  it("rejects unknown kind slugs", () => {
    expect(getDailyLogKind("sleep")?.slug).toBe("sleep");
    expect(getDailyLogKind("weather")).toBeNull();
    expect(getDailyLogKind("")).toBeNull();
  });
});

describe("daily-log form submission building", () => {
  it("coerces raw sleep form values into the typed payload", () => {
    const submission = buildDailyLogSubmission("sleep", {
      logDate: "2026-07-25",
      bedtime: "23:30",
      wakeTime: "07:10",
      quality: "4",
      notes: "",
    });
    expect(submission).toEqual({
      ok: true,
      payload: { logDate: "2026-07-25", bedtime: "23:30", wakeTime: "07:10", quality: 4 },
    });
  });

  it("rejects a sleep log with a bedtime but no wake time", () => {
    const submission = buildDailyLogSubmission("sleep", {
      logDate: "2026-07-25",
      bedtime: "23:30",
      quality: "4",
    });
    expect(submission.ok).toBe(false);
    if (!submission.ok) {
      expect(submission.issues.join(" ")).toContain("Wake time");
    }
  });

  it("rejects non-numeric numeric fields with a labeled issue", () => {
    const submission = buildDailyLogSubmission("stress", {
      logDate: "2026-07-25",
      stressLevel: "high",
    });
    expect(submission).toEqual({ ok: false, issues: ["Stress level (1-10): enter a number"] });
  });

  it("rejects out-of-range stress levels", () => {
    const submission = buildDailyLogSubmission("stress", { logDate: "2026-07-25", stressLevel: "11" });
    expect(submission.ok).toBe(false);
  });

  it("builds a food snack payload with categories", () => {
    const submission = buildDailyLogSubmission("food", {
      logDate: "2026-07-25",
      entryType: "snack",
      description: "chocolate bar",
      categories: ["sugary_snack", "processed"],
      expectedMealCount: "3",
    });
    expect(submission).toEqual({
      ok: true,
      payload: {
        logDate: "2026-07-25",
        entryType: "snack",
        description: "chocolate bar",
        categories: ["sugary_snack", "processed"],
        expectedMealCount: 3,
      },
    });
  });

  it("rejects a food log without a description", () => {
    const submission = buildDailyLogSubmission("food", { logDate: "2026-07-25", entryType: "lunch" });
    expect(submission.ok).toBe(false);
  });

  it("refuses cycle context without the explicit consent acknowledgment", () => {
    const withoutConsent = buildDailyLogSubmission("cycle", {
      logDate: "2026-07-25",
      phase: "luteal",
    });
    expect(withoutConsent.ok).toBe(false);

    const withConsent = buildDailyLogSubmission("cycle", {
      logDate: "2026-07-25",
      consentAcknowledged: true,
      phase: "luteal",
      cycleDay: "14",
    });
    expect(withConsent).toEqual({
      ok: true,
      payload: { logDate: "2026-07-25", consentAcknowledged: true, phase: "luteal", cycleDay: 14 },
    });
  });

  it("requires at least one contact exposure", () => {
    expect(buildDailyLogSubmission("contact", { logDate: "2026-07-25", exposures: [] }).ok).toBe(false);
    expect(
      buildDailyLogSubmission("contact", { logDate: "2026-07-25", exposures: ["mask", "picking"] }),
    ).toEqual({
      ok: true,
      payload: { logDate: "2026-07-25", exposures: ["mask", "picking"] },
    });
  });

  it("applies schema defaults for routine and activity booleans", () => {
    const routine = buildDailyLogSubmission("routine", {
      logDate: "2026-07-25",
      stepsCompleted: ["cleanser_am", "sunscreen_am"],
    });
    expect(routine).toEqual({
      ok: true,
      payload: {
        logDate: "2026-07-25",
        stepsCompleted: ["cleanser_am", "sunscreen_am"],
        productChangeIntroduced: false,
      },
    });

    const activity = buildDailyLogSubmission("activity", {
      logDate: "2026-07-25",
      activityType: "exercise",
      sweatLevel: "moderate",
      cleansedAfterSweat: true,
      durationMinutes: "45",
    });
    expect(activity).toEqual({
      ok: true,
      payload: {
        logDate: "2026-07-25",
        activityType: "exercise",
        sweatLevel: "moderate",
        cleansedAfterSweat: true,
        occlusiveGearWorn: false,
        durationMinutes: 45,
      },
    });
  });

  it("bounds hydration volume to the schema range", () => {
    expect(buildDailyLogSubmission("hydration", { logDate: "2026-07-25", volumeMl: "20" }).ok).toBe(false);
    expect(buildDailyLogSubmission("hydration", { logDate: "2026-07-25", volumeMl: "2000" })).toEqual({
      ok: true,
      payload: { logDate: "2026-07-25", volumeMl: 2000 },
    });
  });

  it("accepts skin-state without a log date (singleton contract)", () => {
    expect(buildDailyLogSubmission("skin-state", { severity: "clear" })).toEqual({
      ok: true,
      payload: { severity: "clear" },
    });
    expect(buildDailyLogSubmission("skin-state", {}).ok).toBe(false);
  });

  it("rejects invalid calendar dates", () => {
    expect(buildDailyLogSubmission("stress", { logDate: "2026-02-30", stressLevel: "5" }).ok).toBe(false);
  });
});

describe("daily-log history presentation", () => {
  function entry(kind: DailyLogEntry["kind"], values: Record<string, unknown>): DailyLogEntry {
    return { id: "row-1", kind, logDate: "2026-07-25", recordedAt: "2026-07-25T08:00:00.000Z", values, notes: null };
  }

  it("summarizes a sleep entry from persisted timestamps only", () => {
    const summary = summarizeDailyLogEntry(
      entry("sleep", {
        quality: 4,
        sleepTime: "2026-07-24T23:30:00.000Z",
        wakeTime: "2026-07-25T07:10:00.000Z",
      }),
    );
    expect(summary).toBe("quality 4/5 · window 23:30 to 07:10");
  });

  it("says times are not recorded instead of inventing them", () => {
    expect(summarizeDailyLogEntry(entry("sleep", { quality: 3, sleepTime: null, wakeTime: null }))).toBe(
      "quality 3/5 · times not recorded",
    );
  });

  it("summarizes food entries by real event counts", () => {
    expect(
      summarizeDailyLogEntry(entry("food", { mealEvents: [{}, {}], snackEvents: [{}] })),
    ).toBe("2 meal events · 1 snack event");
    expect(summarizeDailyLogEntry(entry("food", {}))).toBe("0 meal events · 0 snack events");
  });

  it("summarizes stress, hydration, cycle, contact, and routine entries", () => {
    expect(summarizeDailyLogEntry(entry("stress", { stressLevel: 7 }))).toBe("stress 7/10");
    expect(summarizeDailyLogEntry(entry("hydration", { volumeMl: 1500, consistency: "below_usual" }))).toBe(
      "1500 ml · below usual",
    );
    expect(summarizeDailyLogEntry(entry("cycle", { phase: "luteal", cycleDay: 14 }))).toBe("phase luteal · day 14");
    expect(summarizeDailyLogEntry(entry("contact", { exposures: ["mask", "phone_screen"] }))).toBe(
      "exposures: mask, phone screen",
    );
    expect(
      summarizeDailyLogEntry(entry("routine", { stepsCompleted: ["cleanser_am"], productChangeIntroduced: true })),
    ).toBe("steps: cleanser am · new product introduced");
  });

  it("summarizes the skin-state singleton from the stored self assessment", () => {
    expect(summarizeDailyLogEntry(entry("skin-state", { severity: null, selfAssessment: "clear" }))).toBe(
      "observed state: clear",
    );
    expect(summarizeDailyLogEntry(entry("skin-state", {}))).toBe("observed state: not recorded");
  });
});
