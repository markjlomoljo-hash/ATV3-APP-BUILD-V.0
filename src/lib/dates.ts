// Timezone-aware "local date" helpers. AcneTrex must evaluate streaks and
// daily task windows using the user's local calendar day, never UTC alone.

/** Returns YYYY-MM-DD for "now" in the given IANA timezone. */
export function localDateInTimezone(timezone: string, date = new Date()): string {
  try {
    const formatter = new Intl.DateTimeFormat("en-CA", {
      timeZone: timezone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
    return formatter.format(date); // en-CA gives YYYY-MM-DD
  } catch {
    return date.toISOString().slice(0, 10);
  }
}

export function addDaysToLocalDate(localDate: string, days: number): string {
  const [y, m, d] = localDate.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCDate(dt.getUTCDate() + days);
  return dt.toISOString().slice(0, 10);
}

export function monthKeyFromLocalDate(localDate: string): string {
  return localDate.slice(0, 7); // YYYY-MM
}

export function daysBetween(a: string, b: string): number {
  const [ay, am, ad] = a.split("-").map(Number);
  const [by, bm, bd] = b.split("-").map(Number);
  const da = Date.UTC(ay, am - 1, ad);
  const db_ = Date.UTC(by, bm - 1, bd);
  return Math.round((db_ - da) / (1000 * 60 * 60 * 24));
}

export function isToday(localDate: string, timezone: string): boolean {
  return localDate === localDateInTimezone(timezone);
}
