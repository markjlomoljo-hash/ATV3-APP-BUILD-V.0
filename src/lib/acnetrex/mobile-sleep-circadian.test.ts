import { describe, expect, it } from "vitest";
import {
  computeSleepAnalytics,
  type SleepRecord,
} from "../../../apps/mobile/src/lib/sleep-analytics";

function log(day: number, sleepHour: number, wakeHour: number, quality = 4): SleepRecord {
  const wakeDate = new Date(Date.UTC(2026, 6, day, wakeHour));
  const sleepDate = new Date(Date.UTC(2026, 6, day - 1, sleepHour));
  return {
    id: `00000000-0000-4000-8000-${String(day).padStart(12, "0")}`,
    user_id: "11111111-1111-4111-8111-111111111111",
    log_date: wakeDate.toISOString().slice(0, 10),
    sleep_time: sleepDate.toISOString(),
    wake_time: wakeDate.toISOString(),
    quality,
    disturbances: [],
    naps: [],
    notes: null,
    created_at: wakeDate.toISOString(),
    updated_at: wakeDate.toISOString(),
  };
}

describe("SleepDerm circadian analytics", () => {
  it("calculates midnight-crossing duration but gates circadian estimates below seven records", () => {
    const analytics = computeSleepAnalytics([log(8, 23, 7)], 8, "2026-07-08");
    expect(analytics.duration_hours).toBe(8);
    expect(analytics.circadian_alignment_score).toBeNull();
    expect(analytics.nocturnal_recovery_opportunity).toBe("Insufficient data");
    expect(analytics.readiness).toBe("insufficient_data");
  });

  it("computes regularity, alignment, recovery opportunity, and rolling debt from seven valid records", () => {
    const logs = Array.from({ length: 7 }, (_, index) => log(8 - index, 23, 7, 5));
    const analytics = computeSleepAnalytics(logs, 8, "2026-07-08");

    expect(analytics.readiness).toBe("sufficient_data");
    expect(analytics.onset_regularity_minutes).toBe(0);
    expect(analytics.wake_regularity_minutes).toBe(0);
    expect(analytics.circadian_alignment_score).toBe(100);
    expect(analytics.nocturnal_recovery_opportunity).toBe("Optimal");
    expect(analytics.sleep_debt_hours["7d"]).toBe(0);
  });

  it("lowers alignment for irregular timing without making a causal skin claim", () => {
    const consistent = Array.from({ length: 7 }, (_, index) => log(8 - index, 23, 7));
    const irregular = consistent.map((entry, index) => {
      const shift = index % 2 === 0 ? 0 : 3;
      return log(8 - index, 23 - shift, 7 + shift, 2);
    });
    const baseline = computeSleepAnalytics(consistent, 8, "2026-07-08");
    const shifted = computeSleepAnalytics(irregular, 8, "2026-07-08");

    expect(shifted.circadian_alignment_score).toBeLessThan(
      baseline.circadian_alignment_score ?? 0,
    );
    expect(shifted.score_factors.length).toBeGreaterThan(0);
  });
});
