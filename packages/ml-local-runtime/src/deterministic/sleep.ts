export interface SleepNight {
  logDate: string;
  bedTime: string;
  wakeTime: string;
  targetMinutes?: number;
  manualDurationMinutes?: number;
  manualOverrideReason?: string;
}

export interface SleepAnalysis {
  nights: number;
  durationsMinutes: number[];
  midpointsMinutes: number[];
  averageDurationMinutes: number | null;
  bedtimeDriftMinutes: number | null;
  wakeTimeDriftMinutes: number | null;
  regularityMinutes: number | null;
  debtMinutes: {
    days3: number | null;
    days7: number | null;
    days14: number | null;
    days30: number | null;
  };
  readiness: "ready" | "partial" | "insufficient_data";
  limitations: string[];
}

function clockMinutes(value: string): number {
  const match = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(value);
  if (!match) throw new Error(`invalid_local_clock_time:${value}`);
  return Number(match[1]) * 60 + Number(match[2]);
}

function computedDuration(bed: number, wake: number): number {
  const minutes = wake > bed ? wake - bed : wake + 1440 - bed;
  if (minutes < 60 || minutes > 16 * 60) throw new Error("sleep_duration_out_of_range");
  return minutes;
}

function durationFor(night: SleepNight, bed: number, wake: number): number {
  if (night.manualDurationMinutes === undefined) return computedDuration(bed, wake);
  if (!night.manualOverrideReason?.trim()) throw new Error("manual_override_reason_required");
  if (night.manualDurationMinutes < 60 || night.manualDurationMinutes > 16 * 60) {
    throw new Error("manual_sleep_duration_out_of_range");
  }
  return night.manualDurationMinutes;
}

function circularDistance(first: number, second: number): number {
  const raw = Math.abs(first - second);
  return Math.min(raw, 1440 - raw);
}

function mean(values: number[]): number | null {
  return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : null;
}

function meanAdjacentDrift(values: number[]): number | null {
  if (values.length < 2) return null;
  return mean(values.slice(1).map((value, index) => circularDistance(value, values[index] as number)));
}

function debtFor(nights: SleepNight[], durations: number[], window: number): number | null {
  if (durations.length < window) return null;
  const start = durations.length - window;
  return durations.slice(start).reduce((total, actual, index) => {
    const target = nights[start + index]?.targetMinutes ?? 480;
    return total + Math.max(0, target - actual);
  }, 0);
}

export function analyzeSleep(records: SleepNight[]): SleepAnalysis {
  const byDate = new Map<string, SleepNight>();
  for (const record of records) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(record.logDate)) throw new Error("invalid_sleep_log_date");
    byDate.set(record.logDate, record);
  }
  const nights = [...byDate.values()].sort((first, second) => first.logDate.localeCompare(second.logDate));
  const beds = nights.map((night) => clockMinutes(night.bedTime));
  const wakes = nights.map((night) => clockMinutes(night.wakeTime));
  const durations = nights.map((night, index) => durationFor(night, beds[index] as number, wakes[index] as number));
  const midpoints = beds.map((bed, index) => (bed + Math.round((durations[index] as number) / 2)) % 1440);
  const bedtimeDrift = meanAdjacentDrift(beds);
  const wakeTimeDrift = meanAdjacentDrift(wakes);

  return {
    nights: nights.length,
    durationsMinutes: durations,
    midpointsMinutes: midpoints,
    averageDurationMinutes: mean(durations),
    bedtimeDriftMinutes: bedtimeDrift,
    wakeTimeDriftMinutes: wakeTimeDrift,
    regularityMinutes:
      bedtimeDrift === null || wakeTimeDrift === null ? null : (bedtimeDrift + wakeTimeDrift) / 2,
    debtMinutes: {
      days3: debtFor(nights, durations, 3),
      days7: debtFor(nights, durations, 7),
      days14: debtFor(nights, durations, 14),
      days30: debtFor(nights, durations, 30),
    },
    readiness: nights.length >= 7 ? "ready" : nights.length >= 2 ? "partial" : "insufficient_data",
    limitations: [
      "Sleep summaries describe logged patterns and do not establish acne causation.",
      "No sleep-stage inference is made without compatible wearable data.",
    ],
  };
}
