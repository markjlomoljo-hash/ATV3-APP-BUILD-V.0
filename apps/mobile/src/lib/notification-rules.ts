/**
 * Local reminder rules (pure, unit-tested).
 *
 * Decides which LOCAL notifications should exist given the user's device
 * preferences, their server-side consent toggles, the OS permission state,
 * the real streak state, and the real active treatment plan. The impure
 * scheduling wrapper (notifications.ts) reconciles the device schedule to
 * exactly this list — nothing else is ever scheduled.
 *
 * Consent gating (documented mapping onto the existing consent_settings
 * notification toggles — no new consent columns are invented):
 * - daily_log and streak_risk reminders → streak_risk_notifications. Both
 *   exist to protect the logging streak; the streak toggle is their consent.
 * - treatment_am / treatment_pm reminders → product_analysis_notifications,
 *   the existing product/treatment notification category. consent_settings
 *   has no treatment-reminder column; this mapping is documented here rather
 *   than inventing one.
 * - marketing_notifications and report_ready_notifications have no local
 *   data source on the device, so no local notification is ever scheduled
 *   for them (see the remote-push boundary in notifications.ts).
 *
 * Honesty rules:
 * - Nothing is scheduled without OS permission.
 * - The streak-risk reminder only exists when a real streak (> 0 days,
 *   computed from server history) is actually at risk (today not logged) and
 *   the reminder time is still ahead of now.
 * - Treatment reminders only exist for a real active plan, and only for the
 *   halves of the day that have real steps; their text lists those steps.
 */

import { stepsForTime, type TreatmentPlan } from "./treatment-protocol";

export interface ClockTime {
  hour: number; // 0-23
  minute: number; // 0-59
}

export interface ReminderPrefs {
  dailyLogEnabled: boolean;
  dailyLogTime: ClockTime;
  streakRiskEnabled: boolean;
  streakRiskTime: ClockTime;
  treatmentEnabled: boolean;
  treatmentAmTime: ClockTime;
  treatmentPmTime: ClockTime;
}

export const DEFAULT_REMINDER_PREFS: ReminderPrefs = {
  dailyLogEnabled: false,
  dailyLogTime: { hour: 20, minute: 0 },
  streakRiskEnabled: false,
  streakRiskTime: { hour: 21, minute: 0 },
  treatmentEnabled: false,
  treatmentAmTime: { hour: 8, minute: 0 },
  treatmentPmTime: { hour: 20, minute: 30 },
};

/** Stable identifiers so reconciliation can cancel exactly our reminders. */
export const REMINDER_ID_PREFIX = "acnetrex.reminder.";

export type ReminderId =
  | "acnetrex.reminder.daily_log"
  | "acnetrex.reminder.streak_risk"
  | "acnetrex.reminder.treatment_am"
  | "acnetrex.reminder.treatment_pm";

export type DesiredReminder =
  | {
      id: ReminderId;
      title: string;
      body: string;
      trigger: { kind: "daily"; hour: number; minute: number };
    }
  | {
      id: ReminderId;
      title: string;
      body: string;
      trigger: { kind: "once"; date: Date };
    };

export interface ReminderConsentGates {
  /** consent_settings.streak_risk_notifications */
  streakRisk: boolean;
  /** consent_settings.product_analysis_notifications */
  productAnalysis: boolean;
}

export interface DesiredReminderInput {
  prefs: ReminderPrefs;
  consents: ReminderConsentGates;
  permissionGranted: boolean;
  /** Real streak state from server history; null when it could not be read. */
  streak: { currentStreakDays: number; todayLogged: boolean } | null;
  /** Real active plan; null when none exists or plans could not be read. */
  activePlan: Pick<TreatmentPlan, "title" | "status" | "steps"> | null;
  now: Date;
}

function stepNames(steps: { name: string }[]): string {
  const names = steps.map((step) => step.name);
  if (names.length <= 3) return names.join(", ");
  return `${names.slice(0, 3).join(", ")} and ${names.length - 3} more`;
}

function todayAt(now: Date, time: ClockTime): Date {
  const at = new Date(now);
  at.setHours(time.hour, time.minute, 0, 0);
  return at;
}

export function computeDesiredReminders(
  input: DesiredReminderInput
): DesiredReminder[] {
  if (!input.permissionGranted) return [];
  const desired: DesiredReminder[] = [];

  if (input.prefs.dailyLogEnabled && input.consents.streakRisk) {
    desired.push({
      id: "acnetrex.reminder.daily_log",
      title: "Daily log reminder",
      body: "Log sleep, food, stress, or skin state today — insights only ever come from what you actually log.",
      trigger: {
        kind: "daily",
        hour: input.prefs.dailyLogTime.hour,
        minute: input.prefs.dailyLogTime.minute,
      },
    });
  }

  if (
    input.prefs.streakRiskEnabled &&
    input.consents.streakRisk &&
    input.streak !== null &&
    input.streak.currentStreakDays > 0 &&
    !input.streak.todayLogged
  ) {
    const fireAt = todayAt(input.now, input.prefs.streakRiskTime);
    if (fireAt.getTime() > input.now.getTime()) {
      desired.push({
        id: "acnetrex.reminder.streak_risk",
        title: "Your logging streak is at risk",
        body: `Your real ${input.streak.currentStreakDays}-day logging streak ends today unless you log something.`,
        trigger: { kind: "once", date: fireAt },
      });
    }
  }

  if (
    input.prefs.treatmentEnabled &&
    input.consents.productAnalysis &&
    input.activePlan !== null &&
    input.activePlan.status === "active"
  ) {
    const amSteps = stepsForTime(input.activePlan.steps, "am");
    const pmSteps = stepsForTime(input.activePlan.steps, "pm");
    if (amSteps.length > 0) {
      desired.push({
        id: "acnetrex.reminder.treatment_am",
        title: `AM routine — ${input.activePlan.title}`,
        body: `Morning steps from your plan: ${stepNames(amSteps)}.`,
        trigger: {
          kind: "daily",
          hour: input.prefs.treatmentAmTime.hour,
          minute: input.prefs.treatmentAmTime.minute,
        },
      });
    }
    if (pmSteps.length > 0) {
      desired.push({
        id: "acnetrex.reminder.treatment_pm",
        title: `PM routine — ${input.activePlan.title}`,
        body: `Evening steps from your plan: ${stepNames(pmSteps)}.`,
        trigger: {
          kind: "daily",
          hour: input.prefs.treatmentPmTime.hour,
          minute: input.prefs.treatmentPmTime.minute,
        },
      });
    }
  }

  return desired;
}

/** Parse "HH:MM" (24h) into a ClockTime; null when not parseable. */
export function parseClockTime(value: string): ClockTime | null {
  const match = /^([01]?\d|2[0-3]):([0-5]\d)$/.exec(value.trim());
  if (!match) return null;
  return { hour: Number(match[1]), minute: Number(match[2]) };
}

export function formatClockTime(time: ClockTime): string {
  return `${String(time.hour).padStart(2, "0")}:${String(time.minute).padStart(2, "0")}`;
}
