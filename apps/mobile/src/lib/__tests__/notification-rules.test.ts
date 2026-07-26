import { describe, expect, it } from "vitest";

import {
  computeDesiredReminders,
  DEFAULT_REMINDER_PREFS,
  formatClockTime,
  parseClockTime,
  type DesiredReminderInput,
} from "../notification-rules";

const NOON = new Date("2026-07-26T12:00:00");

function baseInput(overrides: Partial<DesiredReminderInput> = {}): DesiredReminderInput {
  return {
    prefs: { ...DEFAULT_REMINDER_PREFS },
    consents: { streakRisk: true, productAnalysis: true },
    permissionGranted: true,
    streak: null,
    activePlan: null,
    now: NOON,
    ...overrides,
  };
}

describe("computeDesiredReminders", () => {
  it("schedules nothing without OS permission, regardless of prefs", () => {
    const input = baseInput({
      prefs: { ...DEFAULT_REMINDER_PREFS, dailyLogEnabled: true },
      permissionGranted: false,
    });
    expect(computeDesiredReminders(input)).toEqual([]);
  });

  it("schedules nothing when the user enabled nothing", () => {
    expect(computeDesiredReminders(baseInput())).toEqual([]);
  });

  it("gates the daily log reminder on streak_risk consent", () => {
    const prefs = { ...DEFAULT_REMINDER_PREFS, dailyLogEnabled: true };
    expect(
      computeDesiredReminders(
        baseInput({ prefs, consents: { streakRisk: false, productAnalysis: true } })
      )
    ).toEqual([]);

    const desired = computeDesiredReminders(baseInput({ prefs }));
    expect(desired).toHaveLength(1);
    expect(desired[0]).toMatchObject({
      id: "acnetrex.reminder.daily_log",
      trigger: { kind: "daily", hour: 20, minute: 0 },
    });
  });

  it("only schedules the streak-risk reminder for a real at-risk streak", () => {
    const prefs = { ...DEFAULT_REMINDER_PREFS, streakRiskEnabled: true };

    // Unknown streak (fetch failed) → nothing invented.
    expect(computeDesiredReminders(baseInput({ prefs, streak: null }))).toEqual([]);

    // No streak → nothing to protect.
    expect(
      computeDesiredReminders(
        baseInput({ prefs, streak: { currentStreakDays: 0, todayLogged: false } })
      )
    ).toEqual([]);

    // Already logged today → streak is safe.
    expect(
      computeDesiredReminders(
        baseInput({ prefs, streak: { currentStreakDays: 4, todayLogged: true } })
      )
    ).toEqual([]);

    // Real streak, today unlogged, reminder time still ahead → one-shot today.
    const desired = computeDesiredReminders(
      baseInput({ prefs, streak: { currentStreakDays: 4, todayLogged: false } })
    );
    expect(desired).toHaveLength(1);
    expect(desired[0].id).toBe("acnetrex.reminder.streak_risk");
    expect(desired[0].body).toContain("4-day");
    if (desired[0].trigger.kind !== "once") throw new Error("expected one-shot");
    expect(desired[0].trigger.date.getHours()).toBe(21);
  });

  it("skips the streak-risk reminder when its time already passed today", () => {
    const prefs = {
      ...DEFAULT_REMINDER_PREFS,
      streakRiskEnabled: true,
      streakRiskTime: { hour: 9, minute: 0 },
    };
    expect(
      computeDesiredReminders(
        baseInput({ prefs, streak: { currentStreakDays: 2, todayLogged: false } })
      )
    ).toEqual([]);
  });

  it("derives treatment reminders from the real active plan's steps", () => {
    const prefs = { ...DEFAULT_REMINDER_PREFS, treatmentEnabled: true };
    const plan = {
      title: "Adapalene plan",
      status: "active",
      steps: [
        { name: "Cleanser", timeOfDay: "both" as const },
        { name: "Adapalene", timeOfDay: "pm" as const },
      ],
    };

    const desired = computeDesiredReminders(baseInput({ prefs, activePlan: plan }));
    expect(desired.map((reminder) => reminder.id)).toEqual([
      "acnetrex.reminder.treatment_am",
      "acnetrex.reminder.treatment_pm",
    ]);
    expect(desired[0].body).toContain("Cleanser");
    expect(desired[1].body).toContain("Adapalene");

    // AM-only plans get no PM reminder — nothing invented for empty halves.
    const amOnly = computeDesiredReminders(
      baseInput({
        prefs,
        activePlan: {
          title: "AM only",
          status: "active",
          steps: [{ name: "Sunscreen", timeOfDay: "am" as const }],
        },
      })
    );
    expect(amOnly.map((reminder) => reminder.id)).toEqual([
      "acnetrex.reminder.treatment_am",
    ]);
  });

  it("gates treatment reminders on product_analysis consent and active status", () => {
    const prefs = { ...DEFAULT_REMINDER_PREFS, treatmentEnabled: true };
    const plan = {
      title: "Plan",
      status: "active",
      steps: [{ name: "Step", timeOfDay: "both" as const }],
    };
    expect(
      computeDesiredReminders(
        baseInput({
          prefs,
          activePlan: plan,
          consents: { streakRisk: true, productAnalysis: false },
        })
      )
    ).toEqual([]);
    expect(
      computeDesiredReminders(
        baseInput({ prefs, activePlan: { ...plan, status: "paused" } })
      )
    ).toEqual([]);
  });
});

describe("clock time helpers", () => {
  it("round-trips HH:MM", () => {
    expect(parseClockTime("08:05")).toEqual({ hour: 8, minute: 5 });
    expect(parseClockTime("23:59")).toEqual({ hour: 23, minute: 59 });
    expect(parseClockTime("24:00")).toBeNull();
    expect(parseClockTime("nope")).toBeNull();
    expect(formatClockTime({ hour: 8, minute: 5 })).toBe("08:05");
  });
});
