import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import {
  analyzeDietDay,
  analyzeSleep,
  assessFaceCapture,
  evaluateReadiness,
} from "../src/index";

describe("deterministic local engines", () => {
  it("matches the shared cloud/local sleep parity fixture", () => {
    const fixture = JSON.parse(
      readFileSync(resolve("packages/ml-local-runtime/tests/fixtures/sleep-parity.json"), "utf8"),
    ) as {
      records: Array<{ date: string; bedtime: string; wake_time: string; target_minutes: number }>;
      expected: Record<string, unknown>;
    };
    const result = analyzeSleep(fixture.records.map((record) => ({
      logDate: record.date,
      bedTime: record.bedtime,
      wakeTime: record.wake_time,
      targetMinutes: record.target_minutes,
    })));

    expect({
      sample_count: result.nights,
      durations_minutes: result.durationsMinutes,
      midpoints_minutes: result.midpointsMinutes,
      average_duration_minutes: result.averageDurationMinutes,
      bedtime_drift_minutes: result.bedtimeDriftMinutes,
      wake_time_drift_minutes: result.wakeTimeDriftMinutes,
      regularity_minutes: result.regularityMinutes,
      sleep_debt_minutes: {
        "3d": result.debtMinutes.days3,
        "7d": result.debtMinutes.days7,
        "14d": result.debtMinutes.days14,
        "30d": result.debtMinutes.days30,
      },
      state: result.readiness,
    }).toEqual(fixture.expected);
  });

  it("deduplicates same-day sleep edits and handles cross-midnight debt windows", () => {
    const result = analyzeSleep([
      { logDate: "2026-07-10", bedTime: "23:00", wakeTime: "07:00", targetMinutes: 480 },
      { logDate: "2026-07-11", bedTime: "00:00", wakeTime: "06:00", targetMinutes: 480 },
      { logDate: "2026-07-12", bedTime: "22:00", wakeTime: "05:00", targetMinutes: 480 },
      { logDate: "2026-07-12", bedTime: "23:00", wakeTime: "07:00", targetMinutes: 480 },
    ]);

    expect(result.nights).toBe(3);
    expect(result.durationsMinutes).toEqual([480, 360, 480]);
    expect(result.midpointsMinutes).toEqual([180, 180, 180]);
    expect(result.debtMinutes.days3).toBe(120);
    expect(result.readiness).toBe("partial");
    expect(result.limitations[0]).toMatch(/do not establish acne causation/i);
  });

  it("requires a reason for a manual duration override", () => {
    expect(() => analyzeSleep([
      {
        logDate: "2026-07-12",
        bedTime: "23:00",
        wakeTime: "07:00",
        manualDurationMinutes: 420,
      },
    ])).toThrow(/manual_override_reason_required/);
  });

  it("deduplicates replayed food event IDs without inferring skipped meals", () => {
    const result = analyzeDietDay(3, [
      { eventId: "meal-1", kind: "meal", mealSlot: 1, occurredAt: "2026-07-12T08:00:00+08:00" },
      { eventId: "snack-1", kind: "snack", occurredAt: "2026-07-12T10:00:00+08:00" },
      { eventId: "snack-1", kind: "snack", occurredAt: "2026-07-12T10:00:00+08:00" },
    ]);

    expect(result.snackCount).toBe(1);
    expect(result.duplicateEventIds).toEqual(["snack-1"]);
    expect(result.state).toBe("partial");
    expect(result.limitations[0]).toMatch(/missing data/i);
  });

  it("reports explicit readiness coverage and sample gates", () => {
    expect(evaluateReadiness({
      required: { outcome: null, timezone: "Asia/Manila" },
      optional: { wearable: undefined },
      sampleCount: 2,
      minimumSamples: 7,
    })).toEqual({
      state: "insufficient_data",
      sampleCount: 2,
      minimumSamples: 7,
      coverage: 1 / 3,
      missingRequired: ["outcome"],
      missingOptional: ["wearable"],
    });
  });

  it("checks five-angle capture metadata without claiming lesion detection", () => {
    const result = assessFaceCapture([
      { angle: "front", width: 1280, height: 720, bytes: 500_000 },
    ]);

    expect(result.state).toBe("insufficient_data");
    expect(result.missingAngles).toHaveLength(4);
    expect(result.limitations[0]).toMatch(/do not detect or classify lesions/i);
  });
});
