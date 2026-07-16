export type SleepRecord = {
  id?: string;
  user_id?: string;
  log_date: string;
  sleep_time: string | null;
  wake_time: string | null;
  quality: number | null;
  disturbances: Array<{ duration_minutes?: number }> | null;
  naps: Array<{ duration_minutes?: number }> | null;
  notes?: string | null;
  created_at?: string;
  updated_at?: string;
  manual_duration_override?: number | null;
};

export type SleepAnalytics = {
  rule_version: "sleep-analytics-v2";
  log_date: string;
  duration_minutes: number | null;
  duration_hours: number | null;
  duration_source: "calculated" | "manual_override" | "insufficient_data";
  sleep_midpoint: string | null;
  target_hours: number | null;
  daily_debt_hours: number | null;
  cumulative_debt_7d: number | null;
  sleep_debt_hours: { "3d": number | null; "7d": number | null; "14d": number | null; "30d": number | null };
  debt_trend: "improving" | "stable" | "worsening" | "insufficient_data";
  debt_category: "none/minimal" | "mild" | "moderate" | "high" | "severe" | "insufficient_data";
  debt_source: "calculated" | "no_target_configured" | "insufficient_data";
  average_duration_hours: { "3d": number | null; "7d": number | null; "14d": number | null; "30d": number | null };
  onset_regularity_minutes: number | null;
  wake_regularity_minutes: number | null;
  midpoint_regularity_minutes: number | null;
  bedtime_drift_minutes: number | null;
  wake_drift_minutes: number | null;
  circadian_alignment_score: number | null;
  circadian_disruption_flag: boolean | null;
  nocturnal_recovery_opportunity: "Optimal" | "Adequate" | "Compromised" | "Severely compromised" | "Insufficient data";
  sleep_pattern: "stable" | "shifting" | "irregular" | "unknown";
  score_factors: string[];
  missing_data_notes: string[];
  days_logged: number;
  coverage_pct: number;
  readiness: "sufficient_data" | "insufficient_data";
  min_records_required: 7;
  confidence: "high" | "medium" | "low" | "insufficient_data";
};

type ValidRecord = {
  record: SleepRecord;
  durationMinutes: number;
  adjustedMinutes: number;
  source: "calculated" | "manual_override";
  sleepMs: number | null;
  wakeMs: number | null;
  onsetClock: number | null;
  wakeClock: number | null;
  midpointClock: number | null;
};

const MIN_RECORDS = 7;
const NAP_CREDIT_CAP_MINUTES = 90;
const RECOVERY_CREDIT_CAP_HOURS = 1.5;

function round(value: number, digits = 1): number {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

function clockMinutes(date: Date): number {
  return date.getHours() * 60 + date.getMinutes() + date.getSeconds() / 60;
}

function circularDifference(left: number, right: number): number {
  return ((left - right + 720) % 1440) - 720;
}

function circularMean(values: number[]): number {
  const points = values.map((value) => (value / 1440) * Math.PI * 2);
  const sin = points.reduce((total, value) => total + Math.sin(value), 0) / points.length;
  const cos = points.reduce((total, value) => total + Math.cos(value), 0) / points.length;
  const angle = Math.atan2(sin, cos);
  return ((angle < 0 ? angle + Math.PI * 2 : angle) / (Math.PI * 2)) * 1440;
}

function circularStandardDeviation(values: number[]): number | null {
  if (values.length < 2) return null;
  const mean = circularMean(values);
  const variance = values.reduce((total, value) => total + circularDifference(value, mean) ** 2, 0) / values.length;
  return Math.sqrt(variance);
}

function toValidRecord(record: SleepRecord): ValidRecord | null {
  const sleepMs = record.sleep_time ? new Date(record.sleep_time).getTime() : Number.NaN;
  const wakeMs = record.wake_time ? new Date(record.wake_time).getTime() : Number.NaN;
  const hasClockRange = Number.isFinite(sleepMs) && Number.isFinite(wakeMs) && wakeMs > sleepMs && wakeMs - sleepMs <= 24 * 60 * 60 * 1000;
  const awakeMinutes = (record.disturbances ?? []).reduce(
    (total, disturbance) => total + Math.max(0, disturbance.duration_minutes ?? 0),
    0,
  );
  const napMinutes = Math.min(
    NAP_CREDIT_CAP_MINUTES,
    (record.naps ?? []).reduce((total, nap) => total + Math.max(0, nap.duration_minutes ?? 0), 0),
  );

  let durationMinutes: number | null = null;
  let source: ValidRecord["source"] = "calculated";
  if (record.manual_duration_override != null && record.manual_duration_override > 0) {
    durationMinutes = record.manual_duration_override;
    source = "manual_override";
  } else if (hasClockRange) {
    durationMinutes = Math.max(0, (wakeMs - sleepMs) / 60000 - awakeMinutes);
  }
  if (durationMinutes == null || durationMinutes <= 0 || durationMinutes > 24 * 60) return null;

  const sleepDate = hasClockRange ? new Date(sleepMs) : null;
  const wakeDate = hasClockRange ? new Date(wakeMs) : null;
  const midpointDate = hasClockRange ? new Date((sleepMs + wakeMs) / 2) : null;
  return {
    record,
    durationMinutes,
    adjustedMinutes: durationMinutes + napMinutes,
    source,
    sleepMs: hasClockRange ? sleepMs : null,
    wakeMs: hasClockRange ? wakeMs : null,
    onsetClock: sleepDate ? clockMinutes(sleepDate) : null,
    wakeClock: wakeDate ? clockMinutes(wakeDate) : null,
    midpointClock: midpointDate ? clockMinutes(midpointDate) : null,
  };
}

function rollingAverage(records: ValidRecord[], days: number): number | null {
  const values = records.slice(0, days);
  if (values.length === 0) return null;
  return round(values.reduce((total, record) => total + record.durationMinutes / 60, 0) / values.length, 2);
}

function rollingDebt(records: ValidRecord[], days: number, targetHours: number | null): number | null {
  if (!targetHours) return null;
  const values = [...records.slice(0, days)].reverse();
  if (values.length === 0) return null;
  let debt = 0;
  for (const record of values) {
    const adjustedHours = record.adjustedMinutes / 60;
    const deficit = Math.max(0, targetHours - adjustedHours);
    const recoveryCredit = Math.min(Math.max(0, adjustedHours - targetHours), RECOVERY_CREDIT_CAP_HOURS);
    debt = Math.max(0, debt + deficit - recoveryCredit);
  }
  return round(debt);
}

function debtCategory(debt: number | null): SleepAnalytics["debt_category"] {
  if (debt == null) return "insufficient_data";
  if (debt < 1) return "none/minimal";
  if (debt < 3) return "mild";
  if (debt < 6) return "moderate";
  if (debt < 10) return "high";
  return "severe";
}

export function computeSleepAnalytics(
  logs: SleepRecord[],
  targetHours: number | null,
  forDate: string,
): SleepAnalytics {
  const valid = logs.map(toValidRecord).filter((record): record is ValidRecord => record !== null);
  const current = valid.find((record) => record.record.log_date === forDate) ?? null;
  const readiness = valid.length >= MIN_RECORDS ? "sufficient_data" : "insufficient_data";
  const recent7 = valid.slice(0, 7);
  const clockReady = readiness === "sufficient_data" && recent7.every(
    (record) => record.onsetClock != null && record.wakeClock != null && record.midpointClock != null,
  );

  const onsetValues = clockReady ? recent7.map((record) => record.onsetClock as number) : [];
  const wakeValues = clockReady ? recent7.map((record) => record.wakeClock as number) : [];
  const midpointValues = clockReady ? recent7.map((record) => record.midpointClock as number) : [];
  const onsetSd = clockReady ? circularStandardDeviation(onsetValues) : null;
  const wakeSd = clockReady ? circularStandardDeviation(wakeValues) : null;
  const midpointSd = clockReady ? circularStandardDeviation(midpointValues) : null;
  const bedtimeDrift = clockReady && current?.onsetClock != null
    ? Math.abs(circularDifference(current.onsetClock, circularMean(onsetValues)))
    : null;
  const wakeDrift = clockReady && current?.wakeClock != null
    ? Math.abs(circularDifference(current.wakeClock, circularMean(wakeValues)))
    : null;

  const dailyDebt = current && targetHours
    ? round(Math.max(0, targetHours - current.adjustedMinutes / 60))
    : null;
  const debt3 = rollingDebt(valid, 3, targetHours);
  const debt7 = rollingDebt(valid, 7, targetHours);
  const debt14 = rollingDebt(valid, 14, targetHours);
  const debt30 = rollingDebt(valid, 30, targetHours);
  const prior3 = targetHours ? rollingDebt(valid.slice(3), 3, targetHours) : null;
  const debtTrend: SleepAnalytics["debt_trend"] = debt3 == null || prior3 == null || valid.length < 6
    ? "insufficient_data"
    : debt3 < prior3 - 0.5
      ? "improving"
      : debt3 > prior3 + 0.5
        ? "worsening"
        : "stable";

  const scoreFactors: string[] = [];
  let alignment: number | null = null;
  if (clockReady && current) {
    const durationPenalty = targetHours ? Math.min(24, Math.max(0, targetHours - current.adjustedMinutes / 60) * 8) : 0;
    const onsetPenalty = Math.min(20, (onsetSd ?? 0) / 6);
    const wakePenalty = Math.min(20, (wakeSd ?? 0) / 6);
    const midpointPenalty = Math.min(15, (midpointSd ?? 0) / 8);
    const disturbancePenalty = Math.min(9, (current.record.disturbances?.length ?? 0) * 3);
    const qualityPenalty = current.record.quality == null ? 0 : Math.max(0, 5 - current.record.quality) * 3;
    if (durationPenalty > 0) scoreFactors.push("duration deficit");
    if (onsetPenalty > 0) scoreFactors.push("sleep-onset irregularity");
    if (wakePenalty > 0) scoreFactors.push("wake-time irregularity");
    if (midpointPenalty > 0) scoreFactors.push("sleep-midpoint irregularity");
    if (disturbancePenalty > 0) scoreFactors.push("reported disturbances");
    if (qualityPenalty > 0) scoreFactors.push("low reported sleep quality");
    alignment = Math.max(0, Math.min(100, Math.round(
      100 - durationPenalty - onsetPenalty - wakePenalty - midpointPenalty - disturbancePenalty - qualityPenalty,
    )));
  }

  let recovery: SleepAnalytics["nocturnal_recovery_opportunity"] = "Insufficient data";
  if (alignment != null && current) {
    const debtPenalty = Math.min(20, (debt7 ?? 0) * 2);
    const recoveryScore = Math.max(0, alignment - debtPenalty);
    recovery = recoveryScore >= 85 ? "Optimal" : recoveryScore >= 70 ? "Adequate" : recoveryScore >= 45 ? "Compromised" : "Severely compromised";
  }

  const sleepPattern: SleepAnalytics["sleep_pattern"] = !clockReady
    ? "unknown"
    : Math.max(onsetSd ?? 0, wakeSd ?? 0) <= 30
      ? "stable"
      : Math.max(bedtimeDrift ?? 0, wakeDrift ?? 0) > 90
        ? "shifting"
        : "irregular";

  const missingDataNotes: string[] = [];
  if (valid.length < MIN_RECORDS) missingDataNotes.push(`${MIN_RECORDS - valid.length} more valid sleep records required for circadian estimates`);
  if (!targetHours) missingDataNotes.push("Working sleep target is not configured");
  if (!current) missingDataNotes.push("Selected day has no valid duration record");

  return {
    rule_version: "sleep-analytics-v2",
    log_date: forDate,
    duration_minutes: current ? Math.round(current.durationMinutes) : null,
    duration_hours: current ? round(current.durationMinutes / 60) : null,
    duration_source: current?.source ?? "insufficient_data",
    sleep_midpoint: current?.sleepMs != null && current.wakeMs != null
      ? new Date((current.sleepMs + current.wakeMs) / 2).toISOString()
      : null,
    target_hours: targetHours,
    daily_debt_hours: dailyDebt,
    cumulative_debt_7d: debt7,
    sleep_debt_hours: { "3d": debt3, "7d": debt7, "14d": debt14, "30d": debt30 },
    debt_trend: debtTrend,
    debt_category: debtCategory(debt7),
    debt_source: !targetHours ? "no_target_configured" : current ? "calculated" : "insufficient_data",
    average_duration_hours: {
      "3d": rollingAverage(valid, 3),
      "7d": rollingAverage(valid, 7),
      "14d": rollingAverage(valid, 14),
      "30d": rollingAverage(valid, 30),
    },
    onset_regularity_minutes: onsetSd == null ? null : Math.round(onsetSd),
    wake_regularity_minutes: wakeSd == null ? null : Math.round(wakeSd),
    midpoint_regularity_minutes: midpointSd == null ? null : Math.round(midpointSd),
    bedtime_drift_minutes: bedtimeDrift == null ? null : Math.round(bedtimeDrift),
    wake_drift_minutes: wakeDrift == null ? null : Math.round(wakeDrift),
    circadian_alignment_score: alignment,
    circadian_disruption_flag: alignment == null ? null : alignment < 60,
    nocturnal_recovery_opportunity: recovery,
    sleep_pattern: sleepPattern,
    score_factors: scoreFactors,
    missing_data_notes: missingDataNotes,
    days_logged: valid.length,
    coverage_pct: Math.min(100, Math.round((valid.length / 30) * 100)),
    readiness,
    min_records_required: 7,
    confidence: readiness === "sufficient_data" && current?.source === "calculated"
      ? "high"
      : current?.source === "manual_override"
        ? "medium"
        : current
          ? "low"
          : "insufficient_data",
  };
}
