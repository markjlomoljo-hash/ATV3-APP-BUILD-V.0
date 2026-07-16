import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { computeSleepAnalytics } from "../../../apps/mobile/src/lib/sleep-analytics";
import {
  normalizeSleepDisturbances,
  normalizeSleepNaps,
  removeSleepEvent,
  updateSleepEvent,
} from "../../../apps/mobile/src/lib/sleep-events";

describe("SleepDerm disturbance and nap events", () => {
  it("uses awakening minutes in nighttime duration and nap minutes only as capped debt credit", () => {
    const base = {
      log_date: "2026-07-16",
      sleep_time: "2026-07-15T23:00:00.000Z",
      wake_time: "2026-07-16T07:00:00.000Z",
      quality: 3,
      disturbances: [{ reason: "awake", duration_minutes: 30 }],
      naps: [{ duration_minutes: 60 }],
    };

    const analytics = computeSleepAnalytics([base], 8, base.log_date);
    expect(analytics.duration_hours).toBe(7.5);
    expect(analytics.daily_debt_hours).toBe(0);

    const capped = computeSleepAnalytics(
      [{ ...base, naps: [{ duration_minutes: 180 }] }],
      10,
      base.log_date,
    );
    expect(capped.daily_debt_hours).toBe(1);
  });

  it("round-trips, edits, and removes persisted event arrays without inferred entries", () => {
    const disturbances = normalizeSleepDisturbances([
      { reason: "  noise  ", duration_minutes: 30 },
    ]);
    const naps = normalizeSleepNaps([{ duration_minutes: 60, quality: 4 }]);

    expect(disturbances).toEqual([{ reason: "noise", duration_minutes: 30 }]);
    expect(naps).toEqual([{ duration_minutes: 60, quality: 4 }]);
    expect(updateSleepEvent(disturbances, 0, { duration_minutes: 20 })).toEqual([
      { reason: "noise", duration_minutes: 20 },
    ]);
    expect(removeSleepEvent(naps, 0)).toEqual([]);
    expect(normalizeSleepDisturbances(null)).toEqual([]);
    expect(normalizeSleepNaps(undefined)).toEqual([]);
  });

  it("binds the editable arrays to the PATCH payload instead of stale log values", () => {
    const screen = readFileSync(
      join(process.cwd(), "apps", "mobile", "app", "modules", "sleep", "index.tsx"),
      "utf8",
    );

    expect(screen).toContain("setDisturbances(normalizeSleepDisturbances(data.disturbances))");
    expect(screen).toContain("setNaps(normalizeSleepNaps(data.naps))");
    expect(screen).toContain("disturbances: normalizeSleepDisturbances(disturbances)");
    expect(screen).toContain("naps: normalizeSleepNaps(naps)");
    expect(screen).not.toContain("disturbances: log?.disturbances ?? []");
    expect(screen).not.toContain("naps: log?.naps ?? []");
  });
});
