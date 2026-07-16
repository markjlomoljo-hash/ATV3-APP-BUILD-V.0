/**
 * SleepDerm Service — sleep logging and deterministic analytics
 * Zero-fabrication: all calculations from real records with documented rules
 * Version: sleep-analytics-v2
 */
import { apiFetch, apiMutation, createMutationOperation } from './api';
import {
  computeSleepAnalytics as computeCircadianAnalytics,
  type SleepAnalytics,
  type SleepRecord,
} from './sleep-analytics';

export type { SleepAnalytics, SleepRecord } from './sleep-analytics';

export type SleepTargetSource = 'age_default' | 'user_selected' | 'wearable_estimated' | 'clinician_entered';

export type SleepConfiguration = {
  ageRange: string | null;
  typicalSchedule: string | null;
  targetRange: [number, number] | null;
  workingTarget: number | null;
  targetSource: SleepTargetSource | null;
  ruleVersion: string | null;
};

export type SleepLog = {
  id: string;
  user_id: string;
  log_date: string; // YYYY-MM-DD (the date you woke up)
  sleep_time: string | null; // ISO timestamp when you fell asleep
  wake_time: string | null; // ISO timestamp when you woke up
  quality: number | null; // 1-5
  disturbances: SleepDisturbance[] | null;
  naps: SleepNap[] | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  // Extended fields stored in notes JSONB or separate columns
  sleep_latency_minutes?: number | null;
  schedule_context?: string | null;
  manual_duration_override?: number | null;
  manual_duration_reason?: string | null;
  working_sleep_target?: number | null;
  target_sleep_range?: [number, number] | null;
  target_source?: SleepTargetSource | null;
  timezone?: string | null;
  analytics_snapshot?: SleepAnalytics | null;
  analytics_rule_version?: string | null;
  analytics_source?: 'client_deterministic' | 'server_deterministic' | null;
  analytics_computed_at?: string | null;
};

export type SleepDisturbance = {
  time?: string;
  reason?: string;
  duration_minutes?: number;
};

export type SleepNap = {
  start_time?: string;
  end_time?: string;
  duration_minutes?: number;
  quality?: number;
};

export type SleepAnalyticsV1 = {
  // Computed fields — all from real records, rule version documented
  rule_version: 'sleep-analytics-v1';
  log_date: string;
  // Duration
  duration_minutes: number | null;
  duration_hours: number | null;
  duration_source: 'calculated' | 'manual_override' | 'insufficient_data';
  // Midpoint
  sleep_midpoint: string | null; // ISO timestamp
  // Debt (requires target)
  target_hours: number | null;
  daily_debt_hours: number | null;
  cumulative_debt_7d: number | null;
  debt_source: 'calculated' | 'no_target_configured' | 'insufficient_data';
  // Coverage
  days_logged: number;
  coverage_pct: number; // 0-100
  // Readiness
  readiness: 'sufficient_data' | 'insufficient_data';
  min_records_required: number;
  // Uncertainty
  confidence: 'high' | 'medium' | 'low' | 'insufficient_data';
};

export type SleepGoal = {
  target_hours: number;
  target_bedtime?: string; // HH:MM
  target_wake_time?: string; // HH:MM
  reminder_enabled: boolean;
  reminder_minutes_before?: number;
};

/**
 * Fetch sleep log for a specific date
 */
export async function fetchSleepForDate(date: string): Promise<SleepLog | null> {
  const response = await apiFetch<{ ok: true; log: SleepLog | null }>(
    `/api/logs/sleep?date=${encodeURIComponent(date)}`,
  );
  return response.log;
}

/**
 * Upsert a sleep log (same-day merge semantics)
 */
export async function upsertSleepLog(
  date: string,
  input: Partial<Omit<SleepLog, 'id' | 'user_id' | 'created_at' | 'updated_at'>>
): Promise<SleepLog> {
  const payload = {
    log_date: date,
    ...input,
  };
  const response = await apiMutation<{ ok: true; log: SleepLog }, typeof payload>(
    'PATCH',
    '/api/logs/sleep',
    createMutationOperation(payload),
  );
  return response.log;
}

/**
 * Fetch sleep history (paginated)
 */
export async function fetchSleepHistory(limit = 30, offset = 0): Promise<SleepLog[]> {
  const response = await apiFetch<{ ok: true; logs: SleepLog[] }>(
    `/api/logs/sleep?limit=${limit}&offset=${offset}`,
  );
  return response.logs;
}

type ProfessionalProfileResponse = {
  ok: true;
  profile: {
    sections: Array<{ sectionKey: string; value: Record<string, unknown> }>;
  };
};

function finiteTarget(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) && value >= 4 && value <= 14
    ? value
    : null;
}

function targetRange(value: unknown): [number, number] | null {
  if (!Array.isArray(value) || value.length !== 2) return null;
  const lower = finiteTarget(value[0]);
  const upper = finiteTarget(value[1]);
  return lower !== null && upper !== null && lower <= upper ? [lower, upper] : null;
}

function targetSource(value: unknown): SleepTargetSource | null {
  return value === 'age_default' || value === 'user_selected' ||
    value === 'wearable_estimated' || value === 'clinician_entered'
    ? value
    : null;
}

async function lifestyleSection(): Promise<Record<string, unknown>> {
  const response = await apiFetch<ProfessionalProfileResponse>('/api/profile/professional');
  return response.profile.sections.find((section) => section.sectionKey === 'lifestyle_baseline')?.value ?? {};
}

export async function fetchSleepConfiguration(): Promise<SleepConfiguration> {
  const value = await lifestyleSection();
  return {
    ageRange: typeof value.sleep_age_range === 'string' ? value.sleep_age_range : null,
    typicalSchedule: typeof value.typical_schedule === 'string' ? value.typical_schedule : null,
    targetRange: targetRange(value.target_sleep_range),
    workingTarget: finiteTarget(value.working_sleep_target),
    targetSource: targetSource(value.target_source),
    ruleVersion: typeof value.sleep_target_rule_version === 'string'
      ? value.sleep_target_rule_version
      : null,
  };
}

export async function saveSleepConfiguration(
  configuration: SleepConfiguration,
): Promise<void> {
  const current = await lifestyleSection();
  await apiMutation(
    'PATCH',
    '/api/profile/sections/lifestyle_baseline',
    createMutationOperation({
      value: {
        ...current,
        sleep_age_range: configuration.ageRange,
        typical_schedule: configuration.typicalSchedule,
        target_sleep_range: configuration.targetRange,
        working_sleep_target: configuration.workingTarget,
        target_source: configuration.targetSource,
        sleep_target_rule_version: configuration.ruleVersion,
      },
      reason: 'sleep_target_updated',
      includeInReports: true,
    }),
  );
}

/**
 * Compute deterministic sleep analytics from real records.
 * Rule version: sleep-analytics-v1
 * Missing data is never interpreted as low risk.
 * Minimum 7 records required for debt/regularity calculations.
 */
export function computeSleepAnalyticsV1(
  logs: SleepLog[],
  targetHours: number | null,
  forDate: string
): SleepAnalyticsV1 {
  const MIN_RECORDS = 7;
  const log = logs.find(l => l.log_date === forDate);

  // Duration calculation (handles midnight crossing)
  let durationMinutes: number | null = null;
  let durationSource: SleepAnalyticsV1['duration_source'] = 'insufficient_data';

  if (log?.manual_duration_override != null) {
    durationMinutes = log.manual_duration_override;
    durationSource = 'manual_override';
  } else if (log?.sleep_time && log?.wake_time) {
    const sleepMs = new Date(log.sleep_time).getTime();
    const wakeMs = new Date(log.wake_time).getTime();
    if (wakeMs > sleepMs) {
      durationMinutes = Math.round((wakeMs - sleepMs) / 60000);
      durationSource = 'calculated';
    }
  }

  // Sleep midpoint
  let sleepMidpoint: string | null = null;
  if (log?.sleep_time && log?.wake_time) {
    const sleepMs = new Date(log.sleep_time).getTime();
    const wakeMs = new Date(log.wake_time).getTime();
    if (wakeMs > sleepMs) {
      sleepMidpoint = new Date((sleepMs + wakeMs) / 2).toISOString();
    }
  }

  // Coverage
  const daysLogged = logs.length;
  // Approximate coverage over last 30 days
  const coveragePct = Math.min(100, Math.round((daysLogged / 30) * 100));

  // Debt calculation (requires target and sufficient records)
  let dailyDebtHours: number | null = null;
  let cumulativeDebt7d: number | null = null;
  let debtSource: SleepAnalyticsV1['debt_source'] = 'insufficient_data';

  if (!targetHours) {
    debtSource = 'no_target_configured';
  } else if (durationMinutes != null) {
    dailyDebtHours = Math.max(0, targetHours - durationMinutes / 60);
    debtSource = 'calculated';

    // 7-day cumulative debt
    if (logs.length >= MIN_RECORDS) {
      const recent7 = logs.slice(0, 7);
      let totalDebt = 0;
      for (const l of recent7) {
        let dur: number | null = null;
        if (l.manual_duration_override != null) {
          dur = l.manual_duration_override;
        } else if (l.sleep_time && l.wake_time) {
          const s = new Date(l.sleep_time).getTime();
          const w = new Date(l.wake_time).getTime();
          if (w > s) dur = (w - s) / 60000;
        }
        if (dur != null) {
          totalDebt += Math.max(0, targetHours - dur / 60);
        }
      }
      cumulativeDebt7d = Math.round(totalDebt * 10) / 10;
    }
  }

  // Confidence
  let confidence: SleepAnalyticsV1['confidence'] = 'insufficient_data';
  if (durationSource === 'calculated' && daysLogged >= MIN_RECORDS) {
    confidence = 'high';
  } else if (durationSource === 'manual_override') {
    confidence = 'medium';
  } else if (durationSource === 'calculated') {
    confidence = 'low';
  }

  return {
    rule_version: 'sleep-analytics-v1',
    log_date: forDate,
    duration_minutes: durationMinutes,
    duration_hours: durationMinutes != null ? Math.round((durationMinutes / 60) * 10) / 10 : null,
    duration_source: durationSource,
    sleep_midpoint: sleepMidpoint,
    target_hours: targetHours,
    daily_debt_hours: dailyDebtHours,
    cumulative_debt_7d: cumulativeDebt7d,
    debt_source: debtSource,
    days_logged: daysLogged,
    coverage_pct: coveragePct,
    readiness: daysLogged >= MIN_RECORDS ? 'sufficient_data' : 'insufficient_data',
    min_records_required: MIN_RECORDS,
    confidence,
  };
}

export function computeSleepAnalytics(
  logs: SleepRecord[],
  targetHours: number | null,
  forDate: string,
): SleepAnalytics {
  return computeCircadianAnalytics(logs, targetHours, forDate);
}

export const QUALITY_LABELS: Record<number, string> = {
  1: 'Very Poor',
  2: 'Poor',
  3: 'Fair',
  4: 'Good',
  5: 'Excellent',
};
