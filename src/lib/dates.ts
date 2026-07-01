/** Returns the current UTC calendar date as YYYY-MM-DD, or normalizes a given date/string. */
export function toDateOnly(input?: string | Date): string {
  const d = input ? new Date(input) : new Date();
  if (Number.isNaN(d.getTime())) {
    throw new Error("Invalid date value");
  }
  return d.toISOString().slice(0, 10);
}

/** Calculates sleep duration in minutes, handling overnight (wake < start) spans. */
export function calculateSleepDurationMinutes(sleepStart: Date, wakeTime: Date): number {
  let diffMs = wakeTime.getTime() - sleepStart.getTime();
  if (diffMs < 0) {
    // Defensive: should not normally happen since wakeTime should be after sleepStart,
    // but guards against clock/timezone edge cases from client input.
    diffMs += 24 * 60 * 60 * 1000;
  }
  return Math.round(diffMs / 60000);
}
