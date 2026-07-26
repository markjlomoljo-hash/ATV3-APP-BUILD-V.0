import { describe, expect, it } from "vitest";

import {
  activePlanFrom,
  analyzeTreatmentAdherence,
  deriveAdherenceInputs,
  isCompletedCheckinStatus,
  parsePlanSchedule,
  stepsForTime,
  type TreatmentPlan,
} from "../treatment-protocol";

describe("parsePlanSchedule", () => {
  it("parses the backend schedule contract", () => {
    expect(
      parsePlanSchedule({
        activeIngredient: "adapalene 0.1%",
        reviewDate: "2026-09-01",
        providerDirected: true,
        steps: [
          { name: "Cleanser", timeOfDay: "both" },
          { name: "Adapalene", timeOfDay: "pm" },
        ],
      })
    ).toEqual({
      activeIngredient: "adapalene 0.1%",
      reviewDate: "2026-09-01",
      providerDirected: true,
      steps: [
        { name: "Cleanser", timeOfDay: "both" },
        { name: "Adapalene", timeOfDay: "pm" },
      ],
    });
  });

  it("drops malformed steps instead of guessing a cadence", () => {
    const parsed = parsePlanSchedule({
      steps: [
        { name: "Valid", timeOfDay: "am" },
        { name: "", timeOfDay: "am" },
        { name: "No cadence" },
        { name: "Bad cadence", timeOfDay: "noon" },
        "not-an-object",
      ],
    });
    expect(parsed.steps).toEqual([{ name: "Valid", timeOfDay: "am" }]);
  });

  it("returns an empty schedule for null/invalid jsonb", () => {
    for (const value of [null, undefined, "text", 42, []]) {
      expect(parsePlanSchedule(value)).toEqual({
        steps: [],
        activeIngredient: null,
        reviewDate: null,
        providerDirected: false,
      });
    }
  });
});

describe("stepsForTime", () => {
  it('includes "both" steps in each half of the day', () => {
    const steps = [
      { name: "Cleanser", timeOfDay: "both" as const },
      { name: "Sunscreen", timeOfDay: "am" as const },
      { name: "Adapalene", timeOfDay: "pm" as const },
    ];
    expect(stepsForTime(steps, "am").map((step) => step.name)).toEqual([
      "Cleanser",
      "Sunscreen",
    ]);
    expect(stepsForTime(steps, "pm").map((step) => step.name)).toEqual([
      "Cleanser",
      "Adapalene",
    ]);
  });
});

describe("activePlanFrom", () => {
  it("returns the first active plan and null when none is active", () => {
    const base = {
      id: "p1",
      user_id: "u",
      title: "t",
      description: null,
      started_at: null,
      ended_at: null,
      created_at: "",
      updated_at: "",
      steps: [],
      activeIngredient: null,
      reviewDate: null,
      providerDirected: false,
    };
    const plans: TreatmentPlan[] = [
      { ...base, id: "draft", status: "draft" },
      { ...base, id: "active", status: "active" },
    ];
    expect(activePlanFrom(plans)?.id).toBe("active");
    expect(activePlanFrom([{ ...base, status: "completed" }])).toBeNull();
  });
});

describe("analyzeTreatmentAdherence (mirror of treatment_adherence.py)", () => {
  it("fails closed when scheduled/completed counts are missing or zero", () => {
    for (const input of [
      { scheduledCount: null, completedCount: 3 },
      { scheduledCount: 5, completedCount: null },
      { scheduledCount: 0, completedCount: 0 },
    ]) {
      expect(analyzeTreatmentAdherence(input)).toEqual({
        state: "insufficient_data",
        featuresMissing: ["scheduled_count", "completed_count"],
      });
    }
  });

  it("computes the clamped ratio and support state like the reference", () => {
    const result = analyzeTreatmentAdherence({
      scheduledCount: 10,
      completedCount: 6,
    });
    expect(result).toEqual({
      state: "ready",
      adherenceRatio: 0.6,
      supportState: "review_schedule_support",
      limitations: ["This is a behavioral consistency summary, not medical advice."],
    });

    const maintain = analyzeTreatmentAdherence({
      scheduledCount: 10,
      completedCount: 7,
    });
    if (maintain.state !== "ready") throw new Error("expected ready");
    expect(maintain.supportState).toBe("maintain");
  });

  it("clamps ratios above 1 (more completions than scheduled days)", () => {
    const result = analyzeTreatmentAdherence({
      scheduledCount: 5,
      completedCount: 9,
    });
    if (result.state !== "ready") throw new Error("expected ready");
    expect(result.adherenceRatio).toBe(1);
  });
});

describe("deriveAdherenceInputs (documented derivation rule)", () => {
  const TODAY = "2026-07-26";

  it("returns null counts when the plan has no start date", () => {
    const inputs = deriveAdherenceInputs({ started_at: null }, [], {
      windowDays: 14,
      today: TODAY,
    });
    expect(inputs.scheduledCount).toBeNull();
    expect(inputs.completedCount).toBeNull();
  });

  it("schedules one day per plan-active day inside the window", () => {
    // Plan started 5 days ago → 6 scheduled days (inclusive).
    const inputs = deriveAdherenceInputs(
      { started_at: "2026-07-21T00:00:00.000Z" },
      [
        { checkin_date: "2026-07-21", status: "used" },
        { checkin_date: "2026-07-22", status: "used" },
        { checkin_date: "2026-07-22", status: "used" }, // same-day duplicate
        { checkin_date: "2026-07-23", status: "skipped" }, // not completed
        { checkin_date: "2026-07-10", status: "used" }, // outside window
      ],
      { windowDays: 14, today: TODAY }
    );
    expect(inputs.scheduledCount).toBe(6);
    expect(inputs.completedCount).toBe(2);
    expect(inputs.windowStart).toBe("2026-07-21");
    expect(inputs.windowEnd).toBe(TODAY);
  });

  it("caps the scheduled window at windowDays for long-running plans", () => {
    const inputs = deriveAdherenceInputs(
      { started_at: "2026-01-01T00:00:00.000Z" },
      [],
      { windowDays: 14, today: TODAY }
    );
    expect(inputs.scheduledCount).toBe(14);
  });

  it("treats a future-dated plan as not yet scheduled", () => {
    const inputs = deriveAdherenceInputs(
      { started_at: "2026-08-01T00:00:00.000Z" },
      [],
      { windowDays: 14, today: TODAY }
    );
    expect(inputs.scheduledCount).toBeNull();
  });

  it('counts legacy "done" rows as completed via the shared rule', () => {
    const inputs = deriveAdherenceInputs(
      { started_at: "2026-07-21T00:00:00.000Z" },
      [
        { checkin_date: "2026-07-21", status: "done" }, // legacy vocabulary
        { checkin_date: "2026-07-22", status: "used" },
      ],
      { windowDays: 14, today: TODAY }
    );
    expect(inputs.completedCount).toBe(2);
  });
});

describe("isCompletedCheckinStatus (the ONE shared adherence rule)", () => {
  it('accepts "used" (server vocabulary) and legacy "done" only', () => {
    expect(isCompletedCheckinStatus("used")).toBe(true);
    expect(isCompletedCheckinStatus("done")).toBe(true);
  });

  it("rejects every non-completed status — real records, not completions", () => {
    for (const status of ["partial", "skipped", "delayed", "stopped", "", "USED"]) {
      expect(isCompletedCheckinStatus(status)).toBe(false);
    }
  });
});
