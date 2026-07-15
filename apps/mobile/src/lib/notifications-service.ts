/**
 * Notifications Service — durable event system, in-app inbox, and reminder scheduling
 * Uses Supabase for durable storage + expo-notifications for local scheduling
 * Schema: notifications (uuid user_id), notification_preferences (uuid user_id)
 */
import { supabase } from './supabase';
import * as ExpoNotifications from 'expo-notifications';
import { Platform } from 'react-native';

// ============================================================
// TYPES
// ============================================================
export type Notification = {
  id: string;
  user_id: string;
  category: NotificationCategory;
  title: string;
  body: string;
  scheduled_at: string | null;
  sent_at: string | null;
  read_at: string | null;
  payload: Record<string, unknown>;
  created_at: string;
};

export type NotificationCategory =
  | 'daily_reminder'
  | 'treatment_reminder'
  | 'streak_warning'
  | 'streak_milestone'
  | 'badge_earned'
  | 'insight_ready'
  | 'system';

export type NotificationPreferences = {
  id: string;
  user_id: string;
  push_enabled: boolean;
  email_enabled: boolean;
  quiet_hours: QuietHours | null;
  categories: CategoryPreferences;
  created_at: string;
  updated_at: string;
};

export type QuietHours = {
  enabled: boolean;
  start: string; // HH:MM
  end: string; // HH:MM
};

export type CategoryPreferences = {
  daily_reminder?: boolean;
  treatment_reminder?: boolean;
  streak_warning?: boolean;
  streak_milestone?: boolean;
  badge_earned?: boolean;
  insight_ready?: boolean;
  system?: boolean;
};

export type ReminderSchedule = {
  id: string;
  label: string;
  category: NotificationCategory;
  time: string; // HH:MM
  enabled: boolean;
};

// ============================================================
// PUSH NOTIFICATION SETUP
// ============================================================
export async function requestPushPermissions(): Promise<boolean> {
  if (Platform.OS === 'web') return false;

  const { status: existingStatus } = await ExpoNotifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    const { status } = await ExpoNotifications.requestPermissionsAsync();
    finalStatus = status;
  }

  return finalStatus === 'granted';
}

export function configurePushHandler() {
  ExpoNotifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: false,
      shouldSetBadge: false,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });
}

// ============================================================
// NOTIFICATION PREFERENCES
// ============================================================
export async function fetchNotificationPreferences(): Promise<NotificationPreferences | null> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { data, error } = await supabase
    .from('notification_preferences')
    .select('*')
    .eq('user_id', user.id)
    .maybeSingle();

  if (error) throw error;
  return data as NotificationPreferences | null;
}

export async function upsertNotificationPreferences(
  prefs: Partial<Omit<NotificationPreferences, 'id' | 'user_id' | 'created_at' | 'updated_at'>>
): Promise<NotificationPreferences> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { data, error } = await supabase
    .from('notification_preferences')
    .upsert({
      user_id: user.id,
      ...prefs,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id' })
    .select()
    .single();

  if (error) throw error;
  return data as NotificationPreferences;
}

// ============================================================
// IN-APP NOTIFICATION INBOX
// ============================================================
export async function fetchNotifications(limit = 30): Promise<Notification[]> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { data, error } = await supabase
    .from('notifications')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) throw error;
  return (data ?? []) as Notification[];
}

export async function fetchUnreadCount(): Promise<number> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return 0;

  const { count, error } = await supabase
    .from('notifications')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', user.id)
    .is('read_at', null);

  if (error) return 0;
  return count ?? 0;
}

export async function markNotificationRead(id: string): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { error } = await supabase
    .from('notifications')
    .update({ read_at: new Date().toISOString() })
    .eq('id', id)
    .eq('user_id', user.id);

  if (error) throw error;
}

export async function markAllNotificationsRead(): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { error } = await supabase
    .from('notifications')
    .update({ read_at: new Date().toISOString() })
    .eq('user_id', user.id)
    .is('read_at', null);

  if (error) throw error;
}

export async function createNotification(input: {
  category: NotificationCategory;
  title: string;
  body: string;
  scheduled_at?: string;
  payload?: Record<string, unknown>;
}): Promise<Notification> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { data, error } = await supabase
    .from('notifications')
    .insert({
      user_id: user.id,
      category: input.category,
      title: input.title,
      body: input.body,
      scheduled_at: input.scheduled_at ?? null,
      payload: input.payload ?? {},
    })
    .select()
    .single();

  if (error) throw error;
  return data as Notification;
}

// ============================================================
// LOCAL PUSH SCHEDULING (expo-notifications)
// ============================================================
export async function scheduleLocalReminder(
  id: string,
  title: string,
  body: string,
  hour: number,
  minute: number
): Promise<string | null> {
  if (Platform.OS === 'web') return null;

  const hasPermission = await requestPushPermissions();
  if (!hasPermission) return null;

  // Cancel existing with same identifier
  await ExpoNotifications.cancelScheduledNotificationAsync(id).catch(() => {});

  const identifier = await ExpoNotifications.scheduleNotificationAsync({
    identifier: id,
    content: { title, body, sound: false },
    trigger: {
      type: ExpoNotifications.SchedulableTriggerInputTypes.DAILY,
      hour,
      minute,
    },
  });

  return identifier;
}

export async function cancelLocalReminder(id: string): Promise<void> {
  if (Platform.OS === 'web') return;
  await ExpoNotifications.cancelScheduledNotificationAsync(id).catch(() => {});
}

export async function cancelAllLocalReminders(): Promise<void> {
  if (Platform.OS === 'web') return;
  await ExpoNotifications.cancelAllScheduledNotificationsAsync();
}

export async function getScheduledReminders(): Promise<ExpoNotifications.NotificationRequest[]> {
  if (Platform.OS === 'web') return [];
  return await ExpoNotifications.getAllScheduledNotificationsAsync();
}

// ============================================================
// DEFAULT REMINDERS
// ============================================================
export const DEFAULT_REMINDERS: ReminderSchedule[] = [
  { id: 'reminder_morning_routine', label: 'Morning Routine', category: 'treatment_reminder', time: '07:30', enabled: false },
  { id: 'reminder_skin_log', label: 'Daily Skin Log', category: 'daily_reminder', time: '09:00', enabled: false },
  { id: 'reminder_evening_routine', label: 'Evening Routine', category: 'treatment_reminder', time: '21:00', enabled: false },
  { id: 'reminder_sleep_log', label: 'Sleep Log', category: 'daily_reminder', time: '08:00', enabled: false },
];

export async function applyReminderSchedule(reminders: ReminderSchedule[]): Promise<void> {
  for (const reminder of reminders) {
    if (reminder.enabled) {
      const [hourStr, minuteStr] = reminder.time.split(':');
      const hour = parseInt(hourStr, 10);
      const minute = parseInt(minuteStr, 10);
      await scheduleLocalReminder(
        reminder.id,
        'AcneTrex',
        `Time for your ${reminder.label}`,
        hour,
        minute
      );
    } else {
      await cancelLocalReminder(reminder.id);
    }
  }
}

// ============================================================
// CATEGORY LABELS
// ============================================================
export const CATEGORY_LABELS: Record<NotificationCategory, string> = {
  daily_reminder: 'Daily Reminder',
  treatment_reminder: 'Treatment Reminder',
  streak_warning: 'Streak Warning',
  streak_milestone: 'Streak Milestone',
  badge_earned: 'Badge Earned',
  insight_ready: 'Insight Ready',
  system: 'System',
};
