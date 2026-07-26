/**
 * Reminders — local notifications settings.
 *
 * Honest surface over notifications.ts: shows the real OS permission state
 * (requests only on tap), which consent toggle gates each reminder, and the
 * true result of every sync (what is scheduled on this device right now,
 * and which gates blocked the rest). Local-only boundary: there is no push
 * infrastructure — see the module comment in src/lib/notifications.ts.
 */
import { useCallback, useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Switch,
  TextInput,
  Pressable,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { openSettings } from "expo-linking";
import { useAuthStore } from "../src/stores/auth";
import { fetchConsents } from "../src/lib/profile-service";
import { Button, Card, Divider } from "../src/components/ui";
import {
  Colors,
  Spacing,
  Typography,
  BorderRadius,
} from "../src/components/ui/theme";
import {
  DEFAULT_REMINDER_PREFS,
  formatClockTime,
  parseClockTime,
  type ReminderPrefs,
} from "../src/lib/notification-rules";
import {
  getReminderPermissionState,
  loadReminderPrefs,
  requestReminderPermission,
  saveReminderPrefs,
  syncScheduledReminders,
  type ReminderPermissionState,
  type ReminderSyncResult,
} from "../src/lib/notifications";

const HOLD_COPY: Record<string, string> = {
  notification_permission_not_granted:
    "Notification permission is not granted, so nothing is scheduled.",
  consents_unreadable:
    "Your consent settings could not be read, so consent-gated reminders were not scheduled this pass (consent is never assumed).",
  streak_unreadable:
    "Your streak history could not be read, so no streak-risk reminder was scheduled (the streak is never guessed).",
  treatment_plan_unreadable:
    "Your treatment plans could not be read, so no treatment reminders were scheduled.",
};

function TimeField({
  value,
  onCommit,
  label,
}: {
  value: string;
  onCommit: (value: string) => void;
  label: string;
}) {
  const [draft, setDraft] = useState(value);
  useEffect(() => setDraft(value), [value]);
  return (
    <TextInput
      style={styles.timeInput}
      value={draft}
      onChangeText={setDraft}
      onEndEditing={() => onCommit(draft)}
      maxLength={5}
      autoCapitalize="none"
      autoCorrect={false}
      keyboardType="numbers-and-punctuation"
      placeholder="HH:MM"
      placeholderTextColor={Colors.textMuted}
      accessibilityLabel={label}
    />
  );
}

export default function NotificationsScreen() {
  const router = useRouter();
  const { user } = useAuthStore();

  const [prefs, setPrefs] = useState<ReminderPrefs>(DEFAULT_REMINDER_PREFS);
  const [prefsLoaded, setPrefsLoaded] = useState(false);
  const [permission, setPermission] = useState<ReminderPermissionState | null>(null);
  const [syncResult, setSyncResult] = useState<ReminderSyncResult | null>(null);
  const [syncing, setSyncing] = useState(false);

  const { data: consents } = useQuery({
    queryKey: ["consents", user?.id],
    queryFn: () => fetchConsents(user!.id),
    enabled: !!user,
  });

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    Promise.all([loadReminderPrefs(user.id), getReminderPermissionState()])
      .then(([storedPrefs, permissionState]) => {
        if (cancelled) return;
        setPrefs(storedPrefs);
        setPermission(permissionState);
        setPrefsLoaded(true);
      })
      .catch(() => {
        if (!cancelled) setPrefsLoaded(true);
      });
    return () => {
      cancelled = true;
    };
  }, [user]);

  const persistAndSync = useCallback(
    async (next: ReminderPrefs) => {
      if (!user) return;
      setPrefs(next);
      setSyncing(true);
      try {
        await saveReminderPrefs(user.id, next);
        const result = await syncScheduledReminders(user.id);
        setSyncResult(result);
        setPermission(await getReminderPermissionState());
      } catch (error) {
        Alert.alert(
          "Reminder Sync Failed",
          error instanceof Error ? error.message : "unknown_error"
        );
      } finally {
        setSyncing(false);
      }
    },
    [user]
  );

  const commitTime = (
    key: "dailyLogTime" | "streakRiskTime" | "treatmentAmTime" | "treatmentPmTime",
    raw: string
  ) => {
    const parsed = parseClockTime(raw);
    if (!parsed) {
      Alert.alert("Check the time", "Use 24-hour HH:MM, e.g. 20:30.");
      return;
    }
    void persistAndSync({ ...prefs, [key]: parsed });
  };

  const requestPermission = async () => {
    const state = await requestReminderPermission();
    setPermission(state);
    if (state.granted && user) {
      const result = await syncScheduledReminders(user.id);
      setSyncResult(result);
    }
  };

  const streakConsent = consents?.streak_risk_notifications === true;
  const productConsent = consents?.product_analysis_notifications === true;

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.headerRow}>
          <Text style={styles.title}>Reminders</Text>
          <Pressable onPress={() => router.back()} style={styles.closeButton}>
            <Text style={styles.closeText}>✕</Text>
          </Pressable>
        </View>
        <Text style={styles.subtitle}>
          Local reminders scheduled on this device. Each one honors your
          notification consents and can be turned off any time.
        </Text>

        {/* Permission state — honest, request only on tap */}
        {permission && !permission.granted && (
          <Card style={styles.permissionCard}>
            <Text style={styles.permissionTitle}>Notifications are off</Text>
            <Text style={styles.permissionText}>
              {permission.canAskAgain
                ? "AcneTrex has not been granted notification permission, so no reminders are scheduled. Nothing is requested until you tap Allow."
                : "Notification permission is denied for AcneTrex. To use reminders, enable notifications in your device settings."}
            </Text>
            {permission.canAskAgain ? (
              <Button title="Allow notifications" onPress={requestPermission} />
            ) : (
              <Button title="Open device settings" onPress={() => openSettings()} />
            )}
          </Card>
        )}

        {/* Daily log + streak risk — gated by streak_risk_notifications */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Logging</Text>
          <Text style={styles.gateNote}>
            Gated by the &quot;Streak Reminders&quot; consent in Profile →
            Notifications{streakConsent ? "" : " — currently off, so these reminders will not fire until you enable it"}.
          </Text>
          <Card style={{ gap: 0 }}>
            <View style={styles.row}>
              <View style={styles.rowContent}>
                <Text style={styles.rowTitle}>Daily log reminder</Text>
                <Text style={styles.rowDesc}>
                  A fixed daily nudge to log — at{" "}
                  {formatClockTime(prefs.dailyLogTime)}.
                </Text>
              </View>
              <TimeField
                value={formatClockTime(prefs.dailyLogTime)}
                onCommit={(raw) => commitTime("dailyLogTime", raw)}
                label="Daily log reminder time"
              />
              <Switch
                value={prefs.dailyLogEnabled}
                onValueChange={(value) =>
                  void persistAndSync({ ...prefs, dailyLogEnabled: value })
                }
                trackColor={{ false: Colors.border, true: Colors.primary }}
                thumbColor="#fff"
                disabled={!prefsLoaded || syncing}
                accessibilityLabel="Daily log reminder"
              />
            </View>
            <Divider style={{ marginVertical: 0 }} />
            <View style={styles.row}>
              <View style={styles.rowContent}>
                <Text style={styles.rowTitle}>Streak-risk reminder</Text>
                <Text style={styles.rowDesc}>
                  Fires only on days when your real streak (computed from your
                  server history) is at risk — at{" "}
                  {formatClockTime(prefs.streakRiskTime)}.
                </Text>
              </View>
              <TimeField
                value={formatClockTime(prefs.streakRiskTime)}
                onCommit={(raw) => commitTime("streakRiskTime", raw)}
                label="Streak-risk reminder time"
              />
              <Switch
                value={prefs.streakRiskEnabled}
                onValueChange={(value) =>
                  void persistAndSync({ ...prefs, streakRiskEnabled: value })
                }
                trackColor={{ false: Colors.border, true: Colors.primary }}
                thumbColor="#fff"
                disabled={!prefsLoaded || syncing}
                accessibilityLabel="Streak-risk reminder"
              />
            </View>
          </Card>
        </View>

        {/* Treatment AM/PM — gated by product_analysis_notifications */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Treatment</Text>
          <Text style={styles.gateNote}>
            Gated by the &quot;Product Analysis Alerts&quot; consent (the
            existing product/treatment notification category — there is no
            separate treatment-reminder consent)
            {productConsent ? "" : " — currently off, so these reminders will not fire until you enable it"}.
            Reminders exist only while an active plan has AM or PM steps, and
            their text lists your real steps.
          </Text>
          <Card style={{ gap: 0 }}>
            <View style={styles.row}>
              <View style={styles.rowContent}>
                <Text style={styles.rowTitle}>AM / PM routine reminders</Text>
                <Text style={styles.rowDesc}>
                  AM at {formatClockTime(prefs.treatmentAmTime)}, PM at{" "}
                  {formatClockTime(prefs.treatmentPmTime)}.
                </Text>
              </View>
              <Switch
                value={prefs.treatmentEnabled}
                onValueChange={(value) =>
                  void persistAndSync({ ...prefs, treatmentEnabled: value })
                }
                trackColor={{ false: Colors.border, true: Colors.primary }}
                thumbColor="#fff"
                disabled={!prefsLoaded || syncing}
                accessibilityLabel="Treatment routine reminders"
              />
            </View>
            <Divider style={{ marginVertical: 0 }} />
            <View style={styles.row}>
              <View style={styles.rowContent}>
                <Text style={styles.rowDesc}>AM time</Text>
              </View>
              <TimeField
                value={formatClockTime(prefs.treatmentAmTime)}
                onCommit={(raw) => commitTime("treatmentAmTime", raw)}
                label="Treatment AM reminder time"
              />
            </View>
            <Divider style={{ marginVertical: 0 }} />
            <View style={styles.row}>
              <View style={styles.rowContent}>
                <Text style={styles.rowDesc}>PM time</Text>
              </View>
              <TimeField
                value={formatClockTime(prefs.treatmentPmTime)}
                onCommit={(raw) => commitTime("treatmentPmTime", raw)}
                label="Treatment PM reminder time"
              />
            </View>
          </Card>
        </View>

        {/* Honest sync result */}
        {syncResult && (
          <Card style={styles.syncCard}>
            <Text style={styles.rowTitle}>
              {syncResult.scheduled.length === 0
                ? "Nothing is scheduled on this device"
                : `${syncResult.scheduled.length} reminder${syncResult.scheduled.length === 1 ? "" : "s"} scheduled on this device`}
            </Text>
            {syncResult.holds.map((hold) => (
              <Text key={hold} style={styles.holdText}>
                • {HOLD_COPY[hold] ?? hold}
              </Text>
            ))}
          </Card>
        )}

        {/* Boundary */}
        <View style={styles.boundary}>
          <Text style={styles.boundaryText}>
            All reminders are local notifications scheduled on this device —
            AcneTrex has no remote-push infrastructure, so nothing is sent
            from a server. &quot;Report Ready&quot; and &quot;Marketing&quot;
            consents describe server-generated notifications and have no local
            source, so no reminders exist for them in this build.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  content: { padding: Spacing.lg, paddingBottom: Spacing.xxl },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  title: { ...Typography.title2, color: Colors.textPrimary },
  closeButton: { padding: Spacing.sm },
  closeText: { fontSize: 18, color: Colors.textSecondary },
  subtitle: {
    ...Typography.body,
    color: Colors.textSecondary,
    marginTop: 4,
    marginBottom: Spacing.lg,
  },
  permissionCard: { marginBottom: Spacing.lg, gap: Spacing.sm },
  permissionTitle: { ...Typography.bodyMedium, color: Colors.textPrimary },
  permissionText: { ...Typography.caption, color: Colors.textSecondary, lineHeight: 18 },
  section: { marginBottom: Spacing.lg },
  sectionTitle: { ...Typography.title3, color: Colors.textPrimary, marginBottom: 4 },
  gateNote: {
    ...Typography.caption,
    color: Colors.textSecondary,
    lineHeight: 18,
    marginBottom: Spacing.sm,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: Spacing.md,
    gap: Spacing.sm,
  },
  rowContent: { flex: 1 },
  rowTitle: { ...Typography.bodyMedium, color: Colors.textPrimary },
  rowDesc: {
    ...Typography.caption,
    color: Colors.textSecondary,
    marginTop: 2,
    lineHeight: 16,
  },
  timeInput: {
    width: 72,
    backgroundColor: Colors.surface,
    borderWidth: 1.5,
    borderColor: Colors.border,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 8,
    fontSize: 14,
    color: Colors.textPrimary,
    textAlign: "center",
  },
  syncCard: { marginBottom: Spacing.lg, gap: 4 },
  holdText: { ...Typography.caption, color: Colors.warning, lineHeight: 18 },
  boundary: {
    backgroundColor: Colors.gray100,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
  },
  boundaryText: {
    ...Typography.caption,
    color: Colors.textMuted,
    textAlign: "center",
    lineHeight: 18,
  },
});
