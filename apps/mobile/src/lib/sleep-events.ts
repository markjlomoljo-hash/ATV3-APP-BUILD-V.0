import type { SleepDisturbance, SleepNap } from "./sleep-service";

function boundedMinutes(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) && value >= 0 && value <= 1440
    ? Math.round(value)
    : undefined;
}

function boundedQuality(value: unknown): number | undefined {
  return typeof value === "number" && Number.isInteger(value) && value >= 1 && value <= 5
    ? value
    : undefined;
}

export function normalizeSleepDisturbances(
  value: SleepDisturbance[] | null | undefined,
): SleepDisturbance[] {
  return (value ?? []).map((event) => ({
    ...(event.time ? { time: event.time } : {}),
    ...(event.reason?.trim() ? { reason: event.reason.trim() } : {}),
    ...(boundedMinutes(event.duration_minutes) !== undefined
      ? { duration_minutes: boundedMinutes(event.duration_minutes) }
      : {}),
  }));
}

export function normalizeSleepNaps(value: SleepNap[] | null | undefined): SleepNap[] {
  return (value ?? []).map((event) => ({
    ...(event.start_time ? { start_time: event.start_time } : {}),
    ...(event.end_time ? { end_time: event.end_time } : {}),
    ...(boundedMinutes(event.duration_minutes) !== undefined
      ? { duration_minutes: boundedMinutes(event.duration_minutes) }
      : {}),
    ...(boundedQuality(event.quality) !== undefined
      ? { quality: boundedQuality(event.quality) }
      : {}),
  }));
}

export function updateSleepEvent<T>(events: T[], index: number, update: Partial<T>): T[] {
  return events.map((event, eventIndex) => eventIndex === index ? { ...event, ...update } : event);
}

export function removeSleepEvent<T>(events: T[], index: number): T[] {
  return events.filter((_, eventIndex) => eventIndex !== index);
}
