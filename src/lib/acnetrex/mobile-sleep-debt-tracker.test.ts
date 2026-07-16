import { describe, expect, it } from "vitest";
import { buildSleepDebtTracker } from "../../../apps/mobile/src/lib/sleep-debt-tracker";

function record(logDate: string, hours: number) {
  const wake = new Date(`${logDate}T07:00:00.000Z`);
  const sleep = new Date(wake.getTime() - hours * 3_600_000);
  return {
    log_date: logDate,
    sleep_time: sleep.toISOString(),
    wake_time: wake.toISOString(),
    quality: 3,
    disturbances: [],
    naps: [],
  };
}

describe("Sleep Debt Tracker view model", () => {
  it("builds a seven-point nonnegative series from real deficit nights", () => {
    const logs = [10, 11, 12, 13, 14, 15, 16].map((day) => record(`2026-07-${String(day).padStart(2, "0")}`, 6));
    const tracker = buildSleepDebtTracker(logs, 8, "2026-07-16");

    expect(tracker.readiness).toBe("sufficient_data");
    expect(tracker.currentDebtHours).toBe(14);
    expect(tracker.lastNightBalance).toEqual({ kind: "deficit", hours: 2 });
    expect(tracker.sevenDaySeries).toHaveLength(7);
    expect(tracker.sevenDaySeries.every((point) => point.debtHours >= 0)).toBe(true);
    expect(tracker.realisticallyRecoverableHours).toBe(1.5);
    expect(tracker.tonightAction).toContain("30-minute earlier bedtime");
  });

  it("caps a recovery night and never invents a graph point for a missing day", () => {
    const logs = [9, 10, 11, 12, 13, 15, 16].map((day) =>
      record(`2026-07-${String(day).padStart(2, "0")}`, day === 16 ? 11 : 6),
    );
    const tracker = buildSleepDebtTracker(logs, 8, "2026-07-16");

    expect(tracker.lastNightBalance).toEqual({ kind: "recovery_credit", hours: 1.5 });
    expect(tracker.currentDebtHours).toBe(10.5);
    expect(tracker.sevenDaySeries.map((point) => point.logDate)).not.toContain("2026-07-14");
    expect(tracker.missingDataWarning).toContain("1 of the last 7 calendar days");
  });

  it("recomputes from an edited wake time and withholds actions when data is insufficient", () => {
    const logs = [10, 11, 12, 13, 14, 15, 16].map((day) => record(`2026-07-${String(day).padStart(2, "0")}`, 6));
    const before = buildSleepDebtTracker(logs, 8, "2026-07-16");
    const edited = logs.map((item) => item.log_date === "2026-07-16" ? record(item.log_date, 8) : item);
    const after = buildSleepDebtTracker(edited, 8, "2026-07-16");

    expect(after.currentDebtHours).toBeLessThan(before.currentDebtHours as number);
    expect(after.lastNightBalance).toEqual({ kind: "balanced", hours: 0 });
    expect(buildSleepDebtTracker(logs.slice(0, 6), 8, "2026-07-15")).toMatchObject({
      readiness: "insufficient_data",
      tonightAction: null,
      sevenDaySeries: [],
    });
  });
});
