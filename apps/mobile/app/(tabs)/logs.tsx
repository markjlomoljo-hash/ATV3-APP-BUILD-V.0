import { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Modal,
  TextInput,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format, parseISO } from "date-fns";
import { useAuthStore } from "../../src/stores/auth";
import {
  fetchRecentSleepLogs,
  fetchRecentFoodLogs,
  fetchRecentTreatmentCheckins,
  logSleep,
  logFood,
  logStress,
  logTreatmentCheckin,
  logSkinState,
  SleepLog,
  FoodLog,
  TreatmentCheckin,
  WriteOutcome,
} from "../../src/lib/daily-logs-service";
import {
  getLocalOutboxSummary,
  replayPendingOutboxEvents,
  retryFailedLocalOutboxEvents,
} from "../../src/lib/local-outbox";
import type { SkinStateSeverity } from "../../src/lib/contracts";
import { Button, Card, EmptyState } from "../../src/components/ui";
import {
  Colors,
  Spacing,
  Typography,
  BorderRadius,
} from "../../src/components/ui/theme";

type LogType = "sleep" | "food" | "stress" | "treatment" | "skin";

const LOG_TYPES = [
  { type: "sleep" as LogType, icon: "😴", label: "Sleep" },
  { type: "food" as LogType, icon: "🥗", label: "Food / Meals" },
  { type: "stress" as LogType, icon: "😤", label: "Stress" },
  { type: "treatment" as LogType, icon: "💊", label: "Treatment" },
  { type: "skin" as LogType, icon: "🪞", label: "Skin State" },
];

const SKIN_STATE_OPTIONS: { value: SkinStateSeverity; label: string }[] = [
  { value: "clear", label: "Clear — no active breakouts" },
  { value: "mild", label: "Mild — a few small spots" },
  { value: "moderate", label: "Moderate — several active breakouts" },
  { value: "severe", label: "Severe — widespread or painful" },
];

const SLEEP_QUALITY_OPTIONS = [
  { value: 5, label: "Excellent" },
  { value: 4, label: "Good" },
  { value: 3, label: "Fair" },
  { value: 2, label: "Poor" },
  { value: 1, label: "Very poor" },
];

/** Normalize "H:MM" / "HH:MM" (24h) to "HH:MM"; null when not parseable. */
function normalizeClockTime(value: string): string | null {
  const match = /^([01]?\d|2[0-3]):([0-5]\d)$/.exec(value.trim());
  if (!match) return null;
  return `${match[1].padStart(2, "0")}:${match[2]}`;
}

const MEAL_TYPES = [
  { value: "breakfast", label: "Breakfast" },
  { value: "lunch", label: "Lunch" },
  { value: "dinner", label: "Dinner" },
  { value: "snack", label: "Snack" },
];

const STRESS_LEVELS = [
  { value: 2, label: "Low" },
  { value: 4, label: "Mild" },
  { value: 6, label: "Moderate" },
  { value: 8, label: "High" },
  { value: 10, label: "Very high" },
];

// ─── Quick Log Modal ──────────────────────────────────────────────────────────

interface QuickLogModalProps {
  visible: boolean;
  logType: LogType | "";
  onClose: () => void;
  onSaveSleep: (
    q: number,
    bedTime: string | undefined,
    wakeTime: string | undefined,
    notes: string
  ) => void;
  onSaveFood: (meal: string, desc: string, notes: string) => void;
  onSaveStress: (level: number, notes: string) => void;
  onSaveTreatment: (status: "done" | "skipped" | "partial", irritation: number | undefined, notes: string) => void;
  onSaveSkin: (severity: SkinStateSeverity, notes: string) => void;
  saving: boolean;
}

function QuickLogModal({
  visible,
  logType,
  onClose,
  onSaveSleep,
  onSaveFood,
  onSaveStress,
  onSaveTreatment,
  onSaveSkin,
  saving,
}: QuickLogModalProps) {
  const [sleepQuality, setSleepQuality] = useState(0);
  const [bedTime, setBedTime] = useState("");
  const [wakeTime, setWakeTime] = useState("");
  const [mealType, setMealType] = useState("");
  const [mealDesc, setMealDesc] = useState("");
  const [stressLevel, setStressLevel] = useState(0);
  const [treatmentStatus, setTreatmentStatus] = useState<"done" | "skipped" | "partial" | "">("");
  const [irritation, setIrritation] = useState("");
  const [skinSeverity, setSkinSeverity] = useState<SkinStateSeverity | "">("");
  const [notes, setNotes] = useState("");

  const typeInfo = LOG_TYPES.find((t) => t.type === logType);

  const handleSave = () => {
    if (logType === "sleep") {
      if (!sleepQuality) { Alert.alert("Please select sleep quality."); return; }
      const bed = bedTime.trim() ? normalizeClockTime(bedTime) : undefined;
      const wake = wakeTime.trim() ? normalizeClockTime(wakeTime) : undefined;
      if (bed === null || wake === null) {
        Alert.alert(
          "Check the times",
          "Enter bed and wake times as 24-hour HH:MM (e.g. 23:30), or leave them blank."
        );
        return;
      }
      onSaveSleep(sleepQuality, bed, wake, notes);
    } else if (logType === "food") {
      if (!mealType || !mealDesc.trim()) { Alert.alert("Please select meal type and describe what you ate."); return; }
      onSaveFood(mealType, mealDesc.trim(), notes);
    } else if (logType === "stress") {
      if (!stressLevel) { Alert.alert("Please select a stress level."); return; }
      onSaveStress(stressLevel, notes);
    } else if (logType === "treatment") {
      if (!treatmentStatus) { Alert.alert("Please select treatment status."); return; }
      const irritationNum = irritation ? parseInt(irritation, 10) : undefined;
      onSaveTreatment(treatmentStatus, irritationNum, notes);
    } else if (logType === "skin") {
      if (!skinSeverity) { Alert.alert("Please select how your skin looks today."); return; }
      onSaveSkin(skinSeverity, notes);
    }
  };

  const reset = () => {
    setSleepQuality(0);
    setBedTime("");
    setWakeTime("");
    setMealType("");
    setMealDesc("");
    setStressLevel(0);
    setTreatmentStatus("");
    setIrritation("");
    setSkinSeverity("");
    setNotes("");
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onDismiss={reset}
    >
      <SafeAreaView style={styles.modalSafe}>
        <ScrollView
          contentContainerStyle={styles.modalContent}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>
              {typeInfo?.icon} {typeInfo?.label}
            </Text>
            <Pressable
              onPress={() => { reset(); onClose(); }}
              style={styles.modalClose}
            >
              <Text style={styles.modalCloseText}>✕</Text>
            </Pressable>
          </View>

          {/* Sleep form */}
          {logType === "sleep" && (
            <View style={styles.modalSection}>
              <Text style={styles.modalLabel}>Sleep quality last night</Text>
              {SLEEP_QUALITY_OPTIONS.map((o) => (
                <Pressable
                  key={o.value}
                  onPress={() => setSleepQuality(o.value)}
                  style={[styles.option, sleepQuality === o.value && styles.optionSelected]}
                >
                  <Text style={[styles.optionText, sleepQuality === o.value && styles.optionTextSelected]}>
                    {o.label}
                  </Text>
                </Pressable>
              ))}
              <Text style={[styles.modalLabel, { marginTop: Spacing.md }]}>
                Bed & wake time (optional)
              </Text>
              <Text style={styles.modalHint}>
                24-hour HH:MM. Logging both times on 2+ nights unlocks the
                on-device SleepDerm analysis — it only ever uses times you
                actually logged.
              </Text>
              <View style={styles.timeRow}>
                <TextInput
                  style={[styles.textInput, styles.timeInput]}
                  placeholder="Bed, e.g. 23:30"
                  value={bedTime}
                  onChangeText={setBedTime}
                  placeholderTextColor={Colors.textMuted}
                  maxLength={5}
                  autoCapitalize="none"
                  autoCorrect={false}
                  accessibilityLabel="Bed time (24-hour HH:MM)"
                />
                <TextInput
                  style={[styles.textInput, styles.timeInput]}
                  placeholder="Wake, e.g. 07:00"
                  value={wakeTime}
                  onChangeText={setWakeTime}
                  placeholderTextColor={Colors.textMuted}
                  maxLength={5}
                  autoCapitalize="none"
                  autoCorrect={false}
                  accessibilityLabel="Wake time (24-hour HH:MM)"
                />
              </View>
            </View>
          )}

          {/* Food form */}
          {logType === "food" && (
            <View style={styles.modalSection}>
              <Text style={styles.modalLabel}>Meal type</Text>
              <View style={styles.optionRow}>
                {MEAL_TYPES.map((m) => (
                  <Pressable
                    key={m.value}
                    onPress={() => setMealType(m.value)}
                    style={[styles.optionChip, mealType === m.value && styles.optionChipSelected]}
                  >
                    <Text style={[styles.optionChipText, mealType === m.value && styles.optionChipTextSelected]}>
                      {m.label}
                    </Text>
                  </Pressable>
                ))}
              </View>
              <Text style={[styles.modalLabel, { marginTop: Spacing.md }]}>What did you eat?</Text>
              <TextInput
                style={[styles.textInput, styles.textArea]}
                placeholder="e.g. oatmeal with berries, black coffee"
                multiline
                numberOfLines={3}
                value={mealDesc}
                onChangeText={setMealDesc}
                placeholderTextColor={Colors.textMuted}
              />
            </View>
          )}

          {/* Stress form */}
          {logType === "stress" && (
            <View style={styles.modalSection}>
              <Text style={styles.modalLabel}>Stress level today</Text>
              {STRESS_LEVELS.map((s) => (
                <Pressable
                  key={s.value}
                  onPress={() => setStressLevel(s.value)}
                  style={[styles.option, stressLevel === s.value && styles.optionSelected]}
                >
                  <Text style={[styles.optionText, stressLevel === s.value && styles.optionTextSelected]}>
                    {s.label}
                  </Text>
                </Pressable>
              ))}
            </View>
          )}

          {/* Treatment form */}
          {logType === "treatment" && (
            <View style={styles.modalSection}>
              <Text style={styles.modalLabel}>Did you apply/take your treatment?</Text>
              {(["done", "partial", "skipped"] as const).map((s) => (
                <Pressable
                  key={s}
                  onPress={() => setTreatmentStatus(s)}
                  style={[styles.option, treatmentStatus === s && styles.optionSelected]}
                >
                  <Text style={[styles.optionText, treatmentStatus === s && styles.optionTextSelected]}>
                    {s === "done" ? "✓ Done" : s === "partial" ? "~ Partially done" : "✗ Skipped"}
                  </Text>
                </Pressable>
              ))}
              <Text style={[styles.modalLabel, { marginTop: Spacing.md }]}>
                Skin irritation (0–10, optional)
              </Text>
              <TextInput
                style={styles.textInput}
                placeholder="e.g. 3"
                keyboardType="number-pad"
                value={irritation}
                onChangeText={setIrritation}
                placeholderTextColor={Colors.textMuted}
                maxLength={2}
              />
            </View>
          )}

          {/* Skin state form */}
          {logType === "skin" && (
            <View style={styles.modalSection}>
              <Text style={styles.modalLabel}>How does your skin look today?</Text>
              {SKIN_STATE_OPTIONS.map((o) => (
                <Pressable
                  key={o.value}
                  onPress={() => setSkinSeverity(o.value)}
                  style={[styles.option, skinSeverity === o.value && styles.optionSelected]}
                >
                  <Text style={[styles.optionText, skinSeverity === o.value && styles.optionTextSelected]}>
                    {o.label}
                  </Text>
                </Pressable>
              ))}
            </View>
          )}

          {/* Notes */}
          <View style={styles.modalSection}>
            <Text style={styles.modalLabel}>Notes (optional)</Text>
            <TextInput
              style={[styles.textInput, styles.textArea]}
              placeholder="Any additional observations..."
              multiline
              numberOfLines={3}
              value={notes}
              onChangeText={setNotes}
              placeholderTextColor={Colors.textMuted}
            />
          </View>

          <View style={styles.modalActions}>
            <Button title="Save Log" onPress={handleSave} loading={saving} />
            <Button
              title="Cancel"
              onPress={() => { reset(); onClose(); }}
              variant="ghost"
              style={{ marginTop: Spacing.sm }}
            />
          </View>
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

// ─── Log History Items ────────────────────────────────────────────────────────

function SleepLogItem({ log }: { log: SleepLog }) {
  const qualityLabels: Record<number, string> = {
    5: "Excellent",
    4: "Good",
    3: "Fair",
    2: "Poor",
    1: "Very poor",
  };
  // DB time columns may return "HH:MM:SS" — display the clock part only.
  const times =
    log.sleep_time && log.wake_time
      ? ` · ${log.sleep_time.slice(0, 5)} → ${log.wake_time.slice(0, 5)}`
      : "";
  return (
    <View style={styles.logItem}>
      <Text style={styles.logItemIcon}>😴</Text>
      <View style={styles.logItemContent}>
        <Text style={styles.logItemTitle}>Sleep</Text>
        <Text style={styles.logItemSummary}>
          Quality: {log.quality ? qualityLabels[log.quality] ?? log.quality : "Logged"}
          {times}
        </Text>
        {log.notes && <Text style={styles.logItemNotes}>{log.notes}</Text>}
      </View>
      <Text style={styles.logItemTime}>
        {format(parseISO(log.created_at), "h:mm a")}
      </Text>
    </View>
  );
}

function FoodLogItem({ log }: { log: FoodLog }) {
  const desc =
    (log.items as Record<string, string> | null)?.description ??
    log.meal_type ??
    "Meal logged";
  return (
    <View style={styles.logItem}>
      <Text style={styles.logItemIcon}>🥗</Text>
      <View style={styles.logItemContent}>
        <Text style={styles.logItemTitle}>
          {log.meal_type
            ? log.meal_type.charAt(0).toUpperCase() + log.meal_type.slice(1)
            : "Food"}
        </Text>
        <Text style={styles.logItemSummary}>{String(desc).slice(0, 80)}</Text>
        {log.notes && <Text style={styles.logItemNotes}>{log.notes}</Text>}
      </View>
      <Text style={styles.logItemTime}>
        {format(parseISO(log.created_at), "h:mm a")}
      </Text>
    </View>
  );
}

function TreatmentItem({ log }: { log: TreatmentCheckin }) {
  const statusIcon =
    log.status === "done" ? "✓" : log.status === "partial" ? "~" : "✗";
  const statusColor =
    log.status === "done"
      ? Colors.success
      : log.status === "partial"
      ? Colors.warning
      : Colors.error;
  return (
    <View style={styles.logItem}>
      <Text style={styles.logItemIcon}>💊</Text>
      <View style={styles.logItemContent}>
        <Text style={styles.logItemTitle}>Treatment</Text>
        <Text style={[styles.logItemSummary, { color: statusColor }]}>
          {statusIcon}{" "}
          {log.status.charAt(0).toUpperCase() + log.status.slice(1)}
          {log.irritation !== null ? ` · Irritation: ${log.irritation}/10` : ""}
        </Text>
        {log.notes && <Text style={styles.logItemNotes}>{log.notes}</Text>}
      </View>
      <Text style={styles.logItemTime}>
        {format(parseISO(log.created_at), "h:mm a")}
      </Text>
    </View>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function LogsScreen() {
  const { user } = useAuthStore();
  const queryClient = useQueryClient();
  const [modalVisible, setModalVisible] = useState(false);
  const [activeLogType, setActiveLogType] = useState<LogType | "">("");

  const { data: sleepLogs = [], isLoading: sleepLoading } = useQuery({
    queryKey: ["sleep-logs", user?.id],
    queryFn: () => fetchRecentSleepLogs(user!.id, 7),
    enabled: !!user,
  });

  const { data: foodLogs = [], isLoading: foodLoading } = useQuery({
    queryKey: ["food-logs", user?.id],
    queryFn: () => fetchRecentFoodLogs(user!.id, 7),
    enabled: !!user,
  });

  const { data: treatmentCheckins = [], isLoading: treatmentLoading } = useQuery({
    queryKey: ["treatment-checkins", user?.id],
    queryFn: () => fetchRecentTreatmentCheckins(user!.id, 7),
    enabled: !!user,
  });

  // Honest offline indicator: real counts of writes queued on this device,
  // including terminally-failed ones — a failed write never silently
  // disappears from the banner as if it had synced.
  const { data: outboxSummary } = useQuery({
    queryKey: ["outbox-status"],
    queryFn: getLocalOutboxSummary,
    refetchOnWindowFocus: true,
  });
  const pendingSyncCount = outboxSummary?.pending ?? 0;
  const failedSyncCount = outboxSummary?.failed ?? 0;

  const isLoading = sleepLoading || foodLoading || treatmentLoading;

  const afterWrite = (
    outcome: WriteOutcome<unknown>,
    keys: (string | undefined)[][]
  ) => {
    for (const key of keys) queryClient.invalidateQueries({ queryKey: key });
    queryClient.invalidateQueries({ queryKey: ["outbox-status"] });
    setModalVisible(false);
    if (outcome.status === "queued_offline") {
      Alert.alert(
        "Saved on Device",
        "You're offline, so this log is stored securely on your device and will sync automatically when you're back online."
      );
    }
  };

  const { mutate: saveSleep, isPending: savingSleep } = useMutation({
    mutationFn: (args: {
      quality: number;
      sleep_time?: string;
      wake_time?: string;
      notes: string;
    }) => logSleep(user!.id, args),
    onSuccess: (outcome) =>
      afterWrite(outcome, [["sleep-logs", user?.id], ["today-logs", user?.id]]),
    onError: (e) => Alert.alert("Save Failed", e instanceof Error ? e.message : "Please try again."),
  });

  const { mutate: saveFood, isPending: savingFood } = useMutation({
    mutationFn: (args: { meal_type: string; description: string; notes: string }) =>
      logFood(user!.id, args),
    onSuccess: (outcome) =>
      afterWrite(outcome, [["food-logs", user?.id], ["today-logs", user?.id]]),
    onError: (e) => Alert.alert("Save Failed", e instanceof Error ? e.message : "Please try again."),
  });

  const { mutate: saveStress, isPending: savingStress } = useMutation({
    mutationFn: (args: { stress_level: number; notes: string }) =>
      logStress(user!.id, args),
    onSuccess: (outcome) => afterWrite(outcome, [["today-logs", user?.id]]),
    onError: (e) => Alert.alert("Save Failed", e instanceof Error ? e.message : "Please try again."),
  });

  const { mutate: saveTreatment, isPending: savingTreatment } = useMutation({
    mutationFn: (args: { status: "done" | "skipped" | "partial"; irritation?: number; notes: string }) =>
      logTreatmentCheckin(user!.id, args),
    onSuccess: (outcome) =>
      afterWrite(outcome, [["treatment-checkins", user?.id], ["today-logs", user?.id]]),
    onError: (e) => Alert.alert("Save Failed", e instanceof Error ? e.message : "Please try again."),
  });

  const { mutate: saveSkin, isPending: savingSkin } = useMutation({
    mutationFn: (args: { severity: SkinStateSeverity; notes?: string }) =>
      logSkinState(user!.id, args),
    onSuccess: (outcome) =>
      afterWrite(outcome, [["today-logs", user?.id], ["logging-streak", user?.id]]),
    onError: (e) => Alert.alert("Save Failed", e instanceof Error ? e.message : "Please try again."),
  });

  const { mutate: syncNow, isPending: syncing } = useMutation({
    mutationFn: replayPendingOutboxEvents,
    onSuccess: (result) => {
      queryClient.invalidateQueries();
      if (result.failed > 0) {
        Alert.alert(
          "Some Logs Could Not Sync",
          `${result.failed} log${result.failed === 1 ? "" : "s"} hit a non-network error and will not retry automatically. ${result.failed === 1 ? "It is" : "They are"} still stored on this device — use Retry Failed to try again.`
        );
      } else if (result.remaining > 0) {
        Alert.alert(
          "Sync Incomplete",
          `${result.replayed} log${result.replayed === 1 ? "" : "s"} synced, ${result.remaining} still waiting. They will retry automatically.`
        );
      }
    },
  });

  // User-initiated recovery for terminally-failed events: reset them to
  // pending and immediately attempt a real replay. Honest outcome reporting —
  // if the cause persists, the failure is re-surfaced, never hidden.
  const { mutate: retryFailed, isPending: retryingFailed } = useMutation({
    mutationFn: async () => {
      await retryFailedLocalOutboxEvents();
      return replayPendingOutboxEvents();
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries();
      if (result.failed > 0 || result.remaining > 0) {
        const stuck = result.failed + result.remaining;
        Alert.alert(
          "Sync Still Incomplete",
          `${result.replayed} log${result.replayed === 1 ? "" : "s"} synced, ${stuck} still could not. ${stuck === 1 ? "It remains" : "They remain"} stored on this device.`
        );
      }
    },
  });

  const saving = savingSleep || savingFood || savingStress || savingTreatment || savingSkin;

  const openLog = (type: LogType) => {
    setActiveLogType(type);
    setModalVisible(true);
  };

  const totalLogs = sleepLogs.length + foodLogs.length + treatmentCheckins.length;

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <Text style={styles.title}>Daily Logs</Text>
          <Text style={styles.subtitle}>Track what affects your skin.</Text>
        </View>

        {/* Offline sync status — shown while device-queued logs exist,
            including terminally-failed ones (those never vanish silently). */}
        {(pendingSyncCount > 0 || failedSyncCount > 0) && (
          <Card style={styles.syncBanner}>
            {pendingSyncCount > 0 && (
              <Text style={styles.syncBannerText}>
                {pendingSyncCount} log{pendingSyncCount === 1 ? "" : "s"} saved on
                this device {pendingSyncCount === 1 ? "is" : "are"} waiting to sync.
              </Text>
            )}
            {failedSyncCount > 0 && (
              <Text
                style={[
                  styles.syncBannerErrorText,
                  pendingSyncCount > 0 && { marginTop: Spacing.sm },
                ]}
              >
                {failedSyncCount} log{failedSyncCount === 1 ? "" : "s"} could not
                sync
                {outboxSummary?.lastFailureErrorCode
                  ? ` (last error: ${outboxSummary.lastFailureErrorCode})`
                  : ""}
                . {failedSyncCount === 1 ? "It is" : "They are"} still stored on
                this device but will not retry automatically.
              </Text>
            )}
            {pendingSyncCount > 0 && (
              <Button
                title={syncing ? "Syncing..." : "Sync Now"}
                onPress={() => syncNow()}
                variant="secondary"
                loading={syncing}
                style={{ marginTop: Spacing.sm, height: 44 }}
              />
            )}
            {failedSyncCount > 0 && (
              <Button
                title={retryingFailed ? "Retrying..." : "Retry Failed"}
                onPress={() => retryFailed()}
                variant="secondary"
                loading={retryingFailed}
                style={{ marginTop: Spacing.sm, height: 44 }}
              />
            )}
          </Card>
        )}

        {/* Quick log buttons */}
        <View style={styles.quickLogSection}>
          <Text style={styles.sectionLabel}>Log Now</Text>
          <View style={styles.quickLogGrid}>
            {LOG_TYPES.map((t) => (
              <Pressable
                key={t.type}
                onPress={() => openLog(t.type)}
                style={({ pressed }) => [
                  styles.quickLogButton,
                  pressed && { opacity: 0.8 },
                ]}
                accessibilityRole="button"
                accessibilityLabel={`Log ${t.label}`}
              >
                <Text style={styles.quickLogIcon}>{t.icon}</Text>
                <Text style={styles.quickLogLabel}>{t.label}</Text>
              </Pressable>
            ))}
          </View>
        </View>

        {/* Log history */}
        <View style={styles.historySection}>
          <Text style={styles.sectionLabel}>Recent History (7 days)</Text>

          {isLoading && (
            <Text style={styles.loadingText}>Loading logs...</Text>
          )}

          {!isLoading && totalLogs === 0 && (
            <EmptyState
              title="No logs yet"
              message="Start logging to build your skin intelligence. Each log helps AcneTrex understand your patterns."
            />
          )}

          {/* Sleep logs */}
          {sleepLogs.length > 0 && (
            <View style={styles.logGroup}>
              <Text style={styles.logGroupTitle}>Sleep Logs</Text>
              <Card style={{ padding: 0, overflow: "hidden" }}>
                {sleepLogs.map((log, i) => (
                  <View key={log.id}>
                    <SleepLogItem log={log} />
                    {i < sleepLogs.length - 1 && <View style={styles.divider} />}
                  </View>
                ))}
              </Card>
            </View>
          )}

          {/* Food logs */}
          {foodLogs.length > 0 && (
            <View style={styles.logGroup}>
              <Text style={styles.logGroupTitle}>Food Logs</Text>
              <Card style={{ padding: 0, overflow: "hidden" }}>
                {foodLogs.map((log, i) => (
                  <View key={log.id}>
                    <FoodLogItem log={log} />
                    {i < foodLogs.length - 1 && <View style={styles.divider} />}
                  </View>
                ))}
              </Card>
            </View>
          )}

          {/* Treatment checkins */}
          {treatmentCheckins.length > 0 && (
            <View style={styles.logGroup}>
              <Text style={styles.logGroupTitle}>Treatment Check-ins</Text>
              <Card style={{ padding: 0, overflow: "hidden" }}>
                {treatmentCheckins.map((log, i) => (
                  <View key={log.id}>
                    <TreatmentItem log={log} />
                    {i < treatmentCheckins.length - 1 && <View style={styles.divider} />}
                  </View>
                ))}
              </Card>
            </View>
          )}
        </View>
      </ScrollView>

      <QuickLogModal
        visible={modalVisible}
        logType={activeLogType}
        onClose={() => setModalVisible(false)}
        onSaveSleep={(q, bed, wake, n) =>
          saveSleep({ quality: q, sleep_time: bed, wake_time: wake, notes: n })
        }
        onSaveFood={(m, d, n) => saveFood({ meal_type: m, description: d, notes: n })}
        onSaveStress={(l, n) => saveStress({ stress_level: l, notes: n })}
        onSaveTreatment={(s, ir, n) => saveTreatment({ status: s, irritation: ir ?? undefined, notes: n })}
        onSaveSkin={(sev, n) => saveSkin({ severity: sev, notes: n || undefined })}
        saving={saving}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  content: { padding: Spacing.lg, paddingBottom: Spacing.xxl },
  header: { marginBottom: Spacing.lg },
  title: { ...Typography.largeTitle, color: Colors.textPrimary },
  subtitle: { ...Typography.body, color: Colors.textSecondary, marginTop: 4 },
  syncBanner: {
    marginBottom: Spacing.lg,
    backgroundColor: Colors.surfaceAlt,
    borderColor: Colors.primaryMid,
  },
  syncBannerText: {
    ...Typography.body,
    color: Colors.primaryDark,
    lineHeight: 20,
  },
  syncBannerErrorText: {
    ...Typography.body,
    color: Colors.error,
    lineHeight: 20,
  },
  quickLogSection: { marginBottom: Spacing.xl },
  sectionLabel: {
    ...Typography.bodyMedium,
    color: Colors.textPrimary,
    marginBottom: Spacing.sm,
  },
  quickLogGrid: { flexDirection: "row", flexWrap: "wrap", gap: Spacing.sm },
  quickLogButton: {
    width: "47%",
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    alignItems: "center",
    borderWidth: 1,
    borderColor: Colors.border,
    gap: 4,
  },
  quickLogIcon: { fontSize: 28 },
  quickLogLabel: {
    ...Typography.caption,
    color: Colors.textSecondary,
    textAlign: "center",
  },
  historySection: { gap: Spacing.lg },
  loadingText: {
    ...Typography.body,
    color: Colors.textMuted,
    textAlign: "center",
    padding: Spacing.xl,
  },
  logGroup: { gap: Spacing.sm },
  logGroupTitle: { ...Typography.label, color: Colors.textSecondary },
  divider: {
    height: 1,
    backgroundColor: Colors.border,
    marginHorizontal: Spacing.md,
  },
  logItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    padding: Spacing.md,
    gap: Spacing.md,
  },
  logItemIcon: { fontSize: 22, marginTop: 2 },
  logItemContent: { flex: 1 },
  logItemTitle: { ...Typography.bodyMedium, color: Colors.textPrimary },
  logItemSummary: {
    ...Typography.caption,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  logItemNotes: {
    ...Typography.caption,
    color: Colors.textMuted,
    marginTop: 4,
    fontStyle: "italic",
  },
  logItemTime: { ...Typography.caption, color: Colors.textMuted },
  // Modal
  modalSafe: { flex: 1, backgroundColor: Colors.background },
  modalContent: { padding: Spacing.lg, paddingBottom: Spacing.xxl },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: Spacing.xl,
  },
  modalTitle: { ...Typography.title2, color: Colors.textPrimary },
  modalClose: { padding: Spacing.sm },
  modalCloseText: { fontSize: 18, color: Colors.textSecondary },
  modalSection: { marginBottom: Spacing.lg },
  modalLabel: {
    ...Typography.bodyMedium,
    color: Colors.textPrimary,
    marginBottom: Spacing.sm,
  },
  modalHint: {
    ...Typography.caption,
    color: Colors.textMuted,
    lineHeight: 18,
    marginTop: -4,
    marginBottom: Spacing.sm,
  },
  timeRow: { flexDirection: "row", gap: Spacing.sm },
  timeInput: { flex: 1 },
  option: {
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1.5,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
    marginBottom: Spacing.sm,
  },
  optionSelected: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primaryLight,
  },
  optionText: { ...Typography.body, color: Colors.textSecondary },
  optionTextSelected: { color: Colors.primary, fontWeight: "700" },
  optionRow: { flexDirection: "row", flexWrap: "wrap", gap: Spacing.sm },
  optionChip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: 8,
    borderRadius: BorderRadius.md,
    borderWidth: 1.5,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
  },
  optionChipSelected: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primaryLight,
  },
  optionChipText: { ...Typography.body, color: Colors.textSecondary },
  optionChipTextSelected: { color: Colors.primary, fontWeight: "700" },
  textInput: {
    backgroundColor: Colors.surface,
    borderWidth: 1.5,
    borderColor: Colors.border,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: 12,
    fontSize: 16,
    color: Colors.textPrimary,
  },
  textArea: { height: 100, textAlignVertical: "top" },
  modalActions: { marginTop: Spacing.md },
});
