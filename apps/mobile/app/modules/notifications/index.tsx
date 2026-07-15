/**
 * Notifications — In-app inbox and reminder scheduling
 */
import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, Switch,
  StyleSheet, Alert, ActivityIndicator, RefreshControl,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import {
  fetchNotifications, fetchNotificationPreferences, upsertNotificationPreferences,
  markNotificationRead, markAllNotificationsRead, fetchUnreadCount,
  requestPushPermissions, DEFAULT_REMINDERS, applyReminderSchedule,
  CATEGORY_LABELS,
  Notification, NotificationPreferences, ReminderSchedule,
} from '../../../src/lib/notifications-service';
import { Colors, Spacing } from '../../../src/components/ui/theme';

type Tab = 'inbox' | 'settings';

export default function NotificationsScreen() {
  const [activeTab, setActiveTab] = useState<Tab>('inbox');
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [prefs, setPrefs] = useState<NotificationPreferences | null>(null);
  const [reminders, setReminders] = useState<ReminderSchedule[]>(DEFAULT_REMINDERS);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [pushGranted, setPushGranted] = useState(false);

  const loadAll = useCallback(async () => {
    try {
      const [notifs, p, count] = await Promise.all([
        fetchNotifications(30),
        fetchNotificationPreferences(),
        fetchUnreadCount(),
      ]);
      setNotifications(notifs);
      setPrefs(p);
      setUnreadCount(count);

      // Sync reminder states from prefs
      if (p?.categories) {
        setReminders(prev => prev.map(r => ({
          ...r,
          enabled: (p.categories as Record<string, boolean>)[r.id] ?? r.enabled,
        })));
      }
    } catch (e) {
      console.error('Failed to load notifications:', e);
    }
  }, []);

  useEffect(() => {
    (async () => {
      setLoading(true);
      await loadAll();
      if (Platform.OS !== 'web') {
        const { status } = await import('expo-notifications').then(m => m.getPermissionsAsync());
        setPushGranted(status === 'granted');
      }
      setLoading(false);
    })();
  }, [loadAll]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadAll();
    setRefreshing(false);
  };

  const handleMarkRead = async (id: string) => {
    try {
      await markNotificationRead(id);
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, read_at: new Date().toISOString() } : n));
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (e) {
      console.error('Mark read failed:', e);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await markAllNotificationsRead();
      setNotifications(prev => prev.map(n => ({ ...n, read_at: n.read_at ?? new Date().toISOString() })));
      setUnreadCount(0);
    } catch (e) {
      console.error('Mark all read failed:', e);
    }
  };

  const handleRequestPermission = async () => {
    const granted = await requestPushPermissions();
    setPushGranted(granted);
    if (!granted) {
      Alert.alert('Permission Denied', 'Push notifications require permission. Enable them in your device settings.');
    }
  };

  const handleToggleReminder = (id: string, enabled: boolean) => {
    setReminders(prev => prev.map(r => r.id === id ? { ...r, enabled } : r));
  };

  const handleSaveSettings = async () => {
    setSaving(true);
    try {
      // Build categories map from reminders
      const categoriesMap: Record<string, boolean> = {};
      reminders.forEach(r => { categoriesMap[r.id] = r.enabled; });

      await upsertNotificationPreferences({
        push_enabled: pushGranted,
        email_enabled: prefs?.email_enabled ?? false,
        categories: categoriesMap,
        quiet_hours: prefs?.quiet_hours ?? null,
      });

      // Apply local schedules
      await applyReminderSchedule(reminders);

      Alert.alert('Saved', 'Notification settings updated.');
    } catch (e) {
      console.error('Save settings failed:', e);
      Alert.alert('Error', 'Failed to save notification settings.');
    } finally {
      setSaving(false);
    }
  };

  const getCategoryColor = (category: Notification['category']): string => {
    const colors: Record<string, string> = {
      daily_reminder: Colors.primary,
      treatment_reminder: '#4CAF50',
      streak_warning: '#FF9800',
      streak_milestone: '#FFB300',
      badge_earned: '#9C27B0',
      insight_ready: '#2196F3',
      system: Colors.textMuted,
    };
    return colors[category] ?? Colors.primary;
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <ActivityIndicator size="large" color={Colors.primary} style={{ marginTop: 80 }} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.backButton}>← Back</Text>
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Notifications</Text>
          {unreadCount > 0 && <View style={styles.badge}><Text style={styles.badgeText}>{unreadCount}</Text></View>}
        </View>
        {activeTab === 'inbox' && unreadCount > 0 && (
          <TouchableOpacity onPress={handleMarkAllRead}>
            <Text style={styles.markAllText}>Mark all read</Text>
          </TouchableOpacity>
        )}
        {activeTab !== 'inbox' && <View style={{ width: 80 }} />}
      </View>

      {/* Tab bar */}
      <View style={styles.tabBar}>
        {(['inbox', 'settings'] as Tab[]).map(tab => (
          <TouchableOpacity
            key={tab}
            style={[styles.tab, activeTab === tab && styles.tabActive]}
            onPress={() => setActiveTab(tab)}
          >
            <Text style={[styles.tabLabel, activeTab === tab && styles.tabLabelActive]}>
              {tab === 'inbox' ? `Inbox${unreadCount > 0 ? ` (${unreadCount})` : ''}` : 'Settings'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView style={styles.scroll} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}>
        {/* Inbox */}
        {activeTab === 'inbox' && (
          <View>
            {notifications.length === 0 && (
              <Text style={styles.emptyText}>No notifications yet.</Text>
            )}
            {notifications.map(notif => (
              <TouchableOpacity
                key={notif.id}
                style={[styles.notifCard, !notif.read_at && styles.notifCardUnread]}
                onPress={() => !notif.read_at && handleMarkRead(notif.id)}
              >
                <View style={[styles.notifCategoryDot, { backgroundColor: getCategoryColor(notif.category) }]} />
                <View style={{ flex: 1 }}>
                  <View style={styles.notifHeader}>
                    <Text style={styles.notifTitle}>{notif.title}</Text>
                    <Text style={styles.notifTime}>
                      {new Date(notif.created_at).toLocaleDateString()}
                    </Text>
                  </View>
                  <Text style={styles.notifBody}>{notif.body}</Text>
                  <Text style={styles.notifCategory}>{CATEGORY_LABELS[notif.category]}</Text>
                </View>
                {!notif.read_at && <View style={styles.unreadDot} />}
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Settings */}
        {activeTab === 'settings' && (
          <View>
            {/* Push permission */}
            {Platform.OS !== 'web' && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Push Notifications</Text>
                {pushGranted ? (
                  <Text style={styles.permissionGranted}>✓ Permission granted</Text>
                ) : (
                  <TouchableOpacity style={styles.permissionButton} onPress={handleRequestPermission}>
                    <Text style={styles.permissionButtonText}>Enable Push Notifications</Text>
                  </TouchableOpacity>
                )}
              </View>
            )}

            {/* Reminders */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Daily Reminders</Text>
              <Text style={styles.sectionSubtitle}>
                {Platform.OS === 'web' ? 'Reminders are available on iOS and Android only.' : 'Set daily reminders for your skincare routines.'}
              </Text>
              {reminders.map(reminder => (
                <View key={reminder.id} style={styles.reminderRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.reminderLabel}>{reminder.label}</Text>
                    <Text style={styles.reminderTime}>{reminder.time}</Text>
                  </View>
                  <Switch
                    value={reminder.enabled}
                    onValueChange={v => handleToggleReminder(reminder.id, v)}
                    trackColor={{ true: Colors.primary }}
                    disabled={Platform.OS === 'web' || !pushGranted}
                  />
                </View>
              ))}
            </View>

            {/* Quiet hours info */}
            <View style={styles.infoCard}>
              <Text style={styles.infoTitle}>Quiet Hours</Text>
              <Text style={styles.infoBody}>
                Quiet hours configuration is available in a future update. Reminders will respect your device's Do Not Disturb settings.
              </Text>
            </View>

            {/* Save */}
            <TouchableOpacity
              style={[styles.saveButton, saving && styles.saveButtonDisabled]}
              onPress={handleSaveSettings}
              disabled={saving}
            >
              {saving ? <ActivityIndicator color="#fff" /> : (
                <Text style={styles.saveButtonText}>Save Settings</Text>
              )}
            </TouchableOpacity>
          </View>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm,
    borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  backButton: { fontSize: 16, color: Colors.primary },
  headerCenter: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  headerTitle: { fontSize: 18, fontWeight: '700', color: Colors.text },
  badge: {
    backgroundColor: '#D32F2F', borderRadius: 10, minWidth: 20, height: 20,
    alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4,
  },
  badgeText: { color: '#fff', fontSize: 11, fontWeight: '700' },
  markAllText: { fontSize: 13, color: Colors.primary },
  tabBar: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: Colors.border },
  tab: { flex: 1, paddingVertical: 12, alignItems: 'center' },
  tabActive: { borderBottomWidth: 2, borderBottomColor: Colors.primary },
  tabLabel: { fontSize: 14, color: Colors.textMuted },
  tabLabelActive: { color: Colors.primary, fontWeight: '700' },
  scroll: { flex: 1 },
  notifCard: {
    flexDirection: 'row', alignItems: 'flex-start',
    marginHorizontal: Spacing.md, marginTop: Spacing.sm,
    backgroundColor: Colors.surface, borderRadius: 12, padding: Spacing.md, gap: 10,
  },
  notifCardUnread: { backgroundColor: Colors.primary + '08', borderLeftWidth: 3, borderLeftColor: Colors.primary },
  notifCategoryDot: { width: 8, height: 8, borderRadius: 4, marginTop: 5 },
  notifHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 2 },
  notifTitle: { fontSize: 14, fontWeight: '700', color: Colors.text, flex: 1 },
  notifTime: { fontSize: 11, color: Colors.textMuted, marginLeft: 8 },
  notifBody: { fontSize: 13, color: Colors.textSecondary, lineHeight: 18 },
  notifCategory: { fontSize: 11, color: Colors.textMuted, marginTop: 4 },
  unreadDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: Colors.primary, marginTop: 5 },
  section: {
    marginHorizontal: Spacing.md, marginTop: Spacing.md,
    backgroundColor: Colors.surface, borderRadius: 12, padding: Spacing.md,
  },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: Colors.text, marginBottom: 4 },
  sectionSubtitle: { fontSize: 12, color: Colors.textMuted, marginBottom: Spacing.sm },
  permissionGranted: { fontSize: 14, color: Colors.success, fontWeight: '600' },
  permissionButton: {
    backgroundColor: Colors.primary, borderRadius: 8,
    paddingVertical: 10, alignItems: 'center',
  },
  permissionButtonText: { color: '#fff', fontSize: 14, fontWeight: '700' },
  reminderRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  reminderLabel: { fontSize: 14, fontWeight: '600', color: Colors.text },
  reminderTime: { fontSize: 12, color: Colors.textMuted, marginTop: 2 },
  infoCard: {
    marginHorizontal: Spacing.md, marginTop: Spacing.md,
    backgroundColor: '#EEF2FF', borderRadius: 12, padding: Spacing.md,
    borderLeftWidth: 3, borderLeftColor: Colors.primary,
  },
  infoTitle: { fontSize: 14, fontWeight: '700', color: Colors.text, marginBottom: 4 },
  infoBody: { fontSize: 13, color: Colors.textSecondary, lineHeight: 18 },
  saveButton: {
    marginHorizontal: Spacing.md, marginTop: Spacing.md,
    backgroundColor: Colors.primary, borderRadius: 12,
    paddingVertical: 16, alignItems: 'center',
  },
  saveButtonDisabled: { opacity: 0.6 },
  saveButtonText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  emptyText: { textAlign: 'center', color: Colors.textMuted, marginTop: 60, fontSize: 15 },
});
