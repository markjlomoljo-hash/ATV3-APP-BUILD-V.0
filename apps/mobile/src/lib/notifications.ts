/**
 * Smart notifications — LOCAL reminders only.
 *
 * Remote-push boundary (documented, deliberate): AcneTrex mobile has no push
 * infrastructure — no push token registration, no server-side sender, no
 * Expo push service usage. Every notification in this module is a local
 * notification scheduled on this device with expo-notifications, and
 * everything is cancelable. Consents that describe server-generated
 * notifications (report_ready_notifications, marketing_notifications)
 * therefore have no local source and nothing is scheduled for them; they
 * become meaningful only if remote push infrastructure ever ships.
 *
 * What gets scheduled is decided entirely by the pure rules in
 * notification-rules.ts (consent-gated, permission-gated, derived from real
 * streak/plan state). This module:
 * - persists the user's reminder preferences in the encrypted private DB,
 * - reads the real gates (OS permission, consent_settings row, streak,
 *   active plan),
 * - reconciles the device's scheduled notifications to exactly the desired
 *   list (cancel ours that no longer apply, schedule the rest).
 *
 * Permission honesty: requestReminderPermission is only called from an
 * explicit user action in the notifications screen — never on app start,
 * and a denied state is surfaced as-is with a path to OS settings.
 */

import { Platform } from "react-native";
import * as Notifications from "expo-notifications";

import { openPrivateDatabase } from "./private-database";
import { fetchConsents } from "./profile-service";
import { fetchLoggingStreak } from "./daily-logs-service";
import { activePlanFrom, fetchTreatmentPlans } from "./treatment-service";
import {
  computeDesiredReminders,
  DEFAULT_REMINDER_PREFS,
  REMINDER_ID_PREFIX,
  type DesiredReminder,
  type ReminderPrefs,
} from "./notification-rules";

// ─── Preference persistence (device-local, encrypted store) ──────────────────
// Reminder preferences are device-scoped by nature (they control THIS
// device's local notifications), so they live in the encrypted private DB,
// not in a server table.

interface PrefsDatabase {
  execAsync(source: string): Promise<void>;
  runAsync(source: string, params: (string | number | null)[]): Promise<unknown>;
  getAllAsync<T>(source: string, params: (string | number | null)[]): Promise<T[]>;
}

let prefsDbPromise: Promise<PrefsDatabase> | null = null;

async function getPrefsDatabase(): Promise<PrefsDatabase> {
  if (!prefsDbPromise) {
    prefsDbPromise = (async () => {
      const database = await openPrivateDatabase();
      await database.execAsync(`
        CREATE TABLE IF NOT EXISTS reminder_prefs (
          user_id TEXT PRIMARY KEY NOT NULL,
          prefs_json TEXT NOT NULL,
          updated_at TEXT NOT NULL
        );
      `);
      return database as PrefsDatabase;
    })().catch((error: unknown) => {
      prefsDbPromise = null;
      throw error;
    });
  }
  return prefsDbPromise;
}

export async function loadReminderPrefs(userId: string): Promise<ReminderPrefs> {
  const database = await getPrefsDatabase();
  const rows = await database.getAllAsync<{ prefs_json: string }>(
    "SELECT prefs_json FROM reminder_prefs WHERE user_id = ? LIMIT 1",
    [userId]
  );
  if (rows.length === 0) return { ...DEFAULT_REMINDER_PREFS };
  try {
    const parsed = JSON.parse(rows[0].prefs_json) as Partial<ReminderPrefs>;
    return { ...DEFAULT_REMINDER_PREFS, ...parsed };
  } catch {
    return { ...DEFAULT_REMINDER_PREFS };
  }
}

export async function saveReminderPrefs(
  userId: string,
  prefs: ReminderPrefs
): Promise<void> {
  const database = await getPrefsDatabase();
  await database.runAsync(
    `INSERT INTO reminder_prefs (user_id, prefs_json, updated_at)
     VALUES (?, ?, ?)
     ON CONFLICT(user_id) DO UPDATE SET prefs_json = excluded.prefs_json,
                                        updated_at = excluded.updated_at`,
    [userId, JSON.stringify(prefs), new Date().toISOString()]
  );
}

// ─── Permission ──────────────────────────────────────────────────────────────

export interface ReminderPermissionState {
  granted: boolean;
  canAskAgain: boolean;
}

export async function getReminderPermissionState(): Promise<ReminderPermissionState> {
  const permissions = await Notifications.getPermissionsAsync();
  return { granted: permissions.granted, canAskAgain: permissions.canAskAgain };
}

/** Only call from an explicit user action. */
export async function requestReminderPermission(): Promise<ReminderPermissionState> {
  const permissions = await Notifications.requestPermissionsAsync();
  return { granted: permissions.granted, canAskAgain: permissions.canAskAgain };
}

// ─── Scheduling reconciliation ───────────────────────────────────────────────

const ANDROID_CHANNEL_ID = "acnetrex-reminders";

async function ensureAndroidChannel(): Promise<void> {
  if (Platform.OS !== "android") return;
  await Notifications.setNotificationChannelAsync(ANDROID_CHANNEL_ID, {
    name: "Reminders",
    importance: Notifications.AndroidImportance.DEFAULT,
  });
}

function toTriggerInput(
  reminder: DesiredReminder
): Notifications.NotificationTriggerInput {
  if (reminder.trigger.kind === "daily") {
    return {
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
      hour: reminder.trigger.hour,
      minute: reminder.trigger.minute,
      ...(Platform.OS === "android" ? { channelId: ANDROID_CHANNEL_ID } : {}),
    };
  }
  return {
    type: Notifications.SchedulableTriggerInputTypes.DATE,
    date: reminder.trigger.date,
    ...(Platform.OS === "android" ? { channelId: ANDROID_CHANNEL_ID } : {}),
  };
}

export interface ReminderSyncResult {
  /** Identifiers of reminders now scheduled on this device. */
  scheduled: string[];
  /** Identifiers of previously scheduled reminders that were canceled. */
  canceled: string[];
  /**
   * Gates that blocked one or more reminder kinds, reported honestly so the
   * UI can say WHY nothing (or less) is scheduled.
   */
  holds: string[];
}

/**
 * Reconciles this device's scheduled local notifications with the desired
 * list derived from real state. Safe to call repeatedly (idempotent); only
 * notifications carrying our identifier prefix are ever touched.
 */
export async function syncScheduledReminders(
  userId: string
): Promise<ReminderSyncResult> {
  const holds: string[] = [];

  const prefs = await loadReminderPrefs(userId);
  const anyEnabled =
    prefs.dailyLogEnabled || prefs.streakRiskEnabled || prefs.treatmentEnabled;
  if (!anyEnabled) {
    // Nothing opted in: just make sure nothing of ours stays scheduled.
    const canceledIds: string[] = [];
    const scheduledNow = await Notifications.getAllScheduledNotificationsAsync();
    for (const request of scheduledNow) {
      if (request.identifier.startsWith(REMINDER_ID_PREFIX)) {
        await Notifications.cancelScheduledNotificationAsync(request.identifier);
        canceledIds.push(request.identifier);
      }
    }
    return { scheduled: [], canceled: canceledIds, holds };
  }

  const permission = await getReminderPermissionState();
  if (!permission.granted) holds.push("notification_permission_not_granted");

  // Consent gates come from the server-confirmed consent_settings row. If it
  // cannot be read, fail closed: consent cannot be assumed, so consent-gated
  // reminders are not scheduled this pass (existing ones are canceled).
  let consents = { streakRisk: false, productAnalysis: false };
  try {
    const row = await fetchConsents(userId);
    consents = {
      streakRisk: row?.streak_risk_notifications === true,
      productAnalysis: row?.product_analysis_notifications === true,
    };
  } catch {
    holds.push("consents_unreadable");
  }

  // Real streak state; null (with a hold) when unreadable — the streak-risk
  // reminder is then skipped rather than invented.
  let streak: { currentStreakDays: number; todayLogged: boolean } | null = null;
  if (prefs.streakRiskEnabled) {
    try {
      streak = await fetchLoggingStreak(userId);
    } catch {
      holds.push("streak_unreadable");
    }
  }

  // Real active plan; null (with a hold) when unreadable.
  let activePlan: ReturnType<typeof activePlanFrom> = null;
  if (prefs.treatmentEnabled) {
    try {
      activePlan = activePlanFrom(await fetchTreatmentPlans(userId));
    } catch {
      holds.push("treatment_plan_unreadable");
    }
  }

  const desired = computeDesiredReminders({
    prefs,
    consents,
    permissionGranted: permission.granted,
    streak,
    activePlan,
    now: new Date(),
  });

  await ensureAndroidChannel();

  // Cancel every reminder of ours, then schedule the desired list. This keeps
  // content/time changes deterministic without diffing trigger internals.
  const existing = await Notifications.getAllScheduledNotificationsAsync();
  const canceled: string[] = [];
  for (const request of existing) {
    if (request.identifier.startsWith(REMINDER_ID_PREFIX)) {
      await Notifications.cancelScheduledNotificationAsync(request.identifier);
      canceled.push(request.identifier);
    }
  }

  const scheduled: string[] = [];
  for (const reminder of desired) {
    await Notifications.scheduleNotificationAsync({
      identifier: reminder.id,
      content: { title: reminder.title, body: reminder.body },
      trigger: toTriggerInput(reminder),
    });
    scheduled.push(reminder.id);
  }

  return { scheduled, canceled, holds };
}

/** Cancels every reminder this module ever scheduled. */
export async function cancelAllReminders(): Promise<number> {
  const existing = await Notifications.getAllScheduledNotificationsAsync();
  let count = 0;
  for (const request of existing) {
    if (request.identifier.startsWith(REMINDER_ID_PREFIX)) {
      await Notifications.cancelScheduledNotificationAsync(request.identifier);
      count += 1;
    }
  }
  return count;
}
