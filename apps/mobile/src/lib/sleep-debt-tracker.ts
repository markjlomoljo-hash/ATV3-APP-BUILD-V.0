import type { SleepRecord } from "./sleep-analytics";

const NAP_CREDIT_CAP_MINUTES = 90;
const RECOVERY_CREDIT_CAP_HOURS = 1.5;
const MIN_RECORDS = 7;

type DebtBalance =
  | { kind: "deficit"; hours: number }
  | { kind: "recovery_credit"; hours: number }
  | { kind: "balanced"; hours: 0 }
  | { kind: "insufficient_data"; hours: null };

export type SleepDebtPoint = {
  logDate: string;
  debtHours: number;
};

export type SleepDebtTracker = {
  readiness: "sufficient_data" | "insufficient_data";
  currentDebtHours: number | null;
  lastNightBalance: DebtBalance;
  sevenDaySeries: SleepDebtPoint[];
  realisticallyRecoverableHours: number | null;
  topContributors: string[];
  tonightAction: string | null;
  missingDataWarning: string | null;
  recoveryCreditCapHours: 1.5;
};

type ValidDebtRecord = {
  logDate: string;
  adjustedHours: number;
  disturbanceMinutes: number;
};

function round(value: number): number {
  return Math.round(value * 10) / 10;
}

function validDebtRecord(record: SleepRecord): ValidDebtRecord | null {
  const sleepMs = record.sleep_time ? new Date(record.sleep_time).getTime() : Number.NaN;
  const wakeMs = record.wake_time ? new Date(record.wake_time).getTime() : Number.NaN;
  const disturbanceMinutes = (record.disturbances ?? []).reduce(
    (total, event) => total + Math.max(0, event.duration_minutes ?? 0),
    0,
  );
  const napMinutes = Math.min(
    NAP_CREDIT_CAP_MINUTES,
    (record.naps ?? []).reduce((total, event) => total + Math.max(0, event.duration_minutes ?? 0), 0),
  );
  const clockDuration = Number.isFinite(sleepMs) && Number.isFinite(wakeMs) && wakeMs > sleepMs
    ? (wakeMs - sleepMs) / 3_600_000 - disturbanceMinutes / 60
    : null;
  const durationHours = record.manual_duration_override != null
    ? record.manual_duration_override / 60
    : clockDuration;
  if (durationHours == null || durationHours <= 0 || durationHours > 24) return null;
  return {
    logDate: record.log_date,
    adjustedHours: durationHours + napMinutes / 60,
    disturbanceMinutes,
  };
}

function calendarCoverage(records: ValidDebtRecord[], forDate: string): number {
  const end = new Date(`${forDate}T12:00:00`);
  if (Number.isNaN(end.getTime())) return 0;
  const dates = new Set(records.map((record) => record.logDate));
  let present = 0;
  for (let offset = 0; offset < 7; offset += 1) {
    const date = new Date(end);
    date.setDate(date.getDate() - offset);
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
    if (dates.has(key)) present += 1;
  }
  return present;
}

export function buildSleepDebtTracker(
  logs: SleepRecord[],
  targetHours: number | null,
  forDate: string,
  scheduleContext: string | null = null,
): SleepDebtTracker {
  const valid = logs
    .map(validDebtRecord)
    .filter((record): record is ValidDebtRecord => record !== null)
    .sort((left, right) => left.logDate.localeCompare(right.logDate));
  const current = valid.find((record) => record.logDate === forDate) ?? null;
  const coverage = calendarCoverage(valid, forDate);
  const missing = 7 - coverage;
  const base: Omit<SleepDebtTracker, "readiness" | "currentDebtHours" | "lastNightBalance" | "sevenDaySeries" | "realisticallyRecoverableHours" | "tonightAction"> = {
    topContributors: [],
    missingDataWarning: missing > 0
      ? `${missing} of the last 7 calendar days have no valid sleep record; missing days were not counted as zero sleep.`
      : null,
    recoveryCreditCapHours: RECOVERY_CREDIT_CAP_HOURS,
  };

  if (targetHours == null || targetHours <= 0 || valid.length < MIN_RECORDS || !current) {
    return {
      ...base,
      readiness: "insufficient_data",
      currentDebtHours: null,
      lastNightBalance: { kind: "insufficient_data", hours: null },
      sevenDaySeries: [],
      realisticallyRecoverableHours: null,
      tonightAction: null,
      topContributors: ["At least 7 valid records, a working target, and a record for this date are required."],
    };
  }

  let debt = 0;
  let lastNightBalance: DebtBalance = { kind: "balanced", hours: 0 };
  const points: SleepDebtPoint[] = [];
  for (const record of valid) {
    const deficit = Math.max(0, targetHours - record.adjustedHours);
    const recoveryCredit = Math.min(
      Math.max(0, record.adjustedHours - targetHours),
      RECOVERY_CREDIT_CAP_HOURS,
    );
    debt = Math.max(0, debt + deficit - recoveryCredit);
    points.push({ logDate: record.logDate, debtHours: round(debt) });
    if (record.logDate === forDate) {
      lastNightBalance = deficit > 0
        ? { kind: "deficit", hours: round(deficit) }
        : recoveryCredit > 0
          ? { kind: "recovery_credit", hours: round(recoveryCredit) }
          : { kind: "balanced", hours: 0 };
    }
  }

  const recent = valid.slice(-7);
  const shortNights = recent.filter((record) => record.adjustedHours < targetHours).length;
  const disturbanceMinutes = recent.reduce((total, record) => total + record.disturbanceMinutes, 0);
  const contributors = [
    ...(shortNights > 0 ? [`${shortNights} of the last 7 valid records were below the working target.`] : []),
    ...(disturbanceMinutes > 0 ? [`${round(disturbanceMinutes)} disturbance minutes were recorded across the last 7 valid records.`] : []),
    ...(missing > 0 ? [`${missing} recent calendar days are missing.`] : []),
  ];
  const variableSchedule = scheduleContext?.toLowerCase().includes("variable") ||
    scheduleContext?.toLowerCase().includes("shift");
  const tonightAction = variableSchedule
    ? "Use the most consistent sleep window available around the current shift or variable schedule; the estimate is limited by schedule variability."
    : debt >= 6
      ? "Aim for a 30-minute earlier bedtime and keep the usual wake time; recovery credit is capped and gradual."
      : debt > 0
        ? "Aim for a 15–30 minute earlier bedtime while keeping a consistent wake time."
        : "Maintain the current sleep window and consistent wake time; no debt recovery is being claimed for missing days.";

  return {
    ...base,
    readiness: "sufficient_data",
    currentDebtHours: round(debt),
    lastNightBalance,
    sevenDaySeries: points.slice(-7),
    realisticallyRecoverableHours: round(Math.min(debt, RECOVERY_CREDIT_CAP_HOURS)),
    topContributors: contributors.length > 0 ? contributors : ["No dominant debt contributor was present in the last 7 valid records."],
    tonightAction,
  };
}
