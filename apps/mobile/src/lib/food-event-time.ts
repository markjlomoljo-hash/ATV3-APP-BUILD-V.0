export function combineFoodLogDateAndTime(logDate: string, clock: Date): string {
  const [year, month, day] = logDate.split("-").map(Number);
  const combined = new Date(
    year,
    month - 1,
    day,
    clock.getHours(),
    clock.getMinutes(),
    0,
    0,
  );
  if (Number.isNaN(combined.getTime())) throw new Error("invalid_food_event_time");
  return combined.toISOString();
}

export function defaultFoodEventClock(logDate: string, now = new Date()): Date {
  return new Date(combineFoodLogDateAndTime(logDate, now));
}
