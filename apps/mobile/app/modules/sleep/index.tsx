/**
 * SleepDerm — Sleep Logging Screen
 * Deterministic analytics only; no AI inference
 */
import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, Switch,
  StyleSheet, Alert, ActivityIndicator, RefreshControl,
  TextInput, Platform, KeyboardAvoidingView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import DateTimePicker from '@react-native-community/datetimepicker';
import {
  fetchSleepForDate, upsertSleepLog, fetchSleepHistory,
  computeSleepAnalytics, fetchSleepConfiguration, saveSleepConfiguration,
  QUALITY_LABELS, SleepLog, type SleepRecord, type SleepTargetSource,
  type SleepDisturbance, type SleepNap,
} from '../../../src/lib/sleep-service';
import {
  normalizeSleepDisturbances,
  normalizeSleepNaps,
  removeSleepEvent,
  updateSleepEvent,
} from '../../../src/lib/sleep-events';
import { Colors, Spacing } from '../../../src/components/ui/theme';

function getLocalDate(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

function clockOnDate(date: string, clock: Date): Date {
  const [year, month, day] = date.split('-').map(Number);
  return new Date(year, month - 1, day, clock.getHours(), clock.getMinutes(), 0, 0);
}

export default function SleepScreen() {
  const [activeDate, setActiveDate] = useState(getLocalDate());
  const [log, setLog] = useState<SleepLog | null>(null);
  const [history, setHistory] = useState<SleepLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [showHistory, setShowHistory] = useState(false);

  // Form state
  const [sleepTime, setSleepTime] = useState<Date | null>(null);
  const [wakeTime, setWakeTime] = useState<Date | null>(null);
  const [quality, setQuality] = useState<number | null>(null);
  const [notes, setNotes] = useState('');
  const [manualDuration, setManualDuration] = useState('');
  const [manualDurationReason, setManualDurationReason] = useState('');
  const [useManualDuration, setUseManualDuration] = useState(false);
  const [targetHours, setTargetHours] = useState<number | null>(null);
  const [targetRange, setTargetRange] = useState<[number, number] | null>(null);
  const [targetSource, setTargetSource] = useState<SleepTargetSource | null>(null);
  const [sleepAgeRange, setSleepAgeRange] = useState<string | null>(null);
  const [typicalSchedule, setTypicalSchedule] = useState<string | null>(null);
  const [targetRuleVersion, setTargetRuleVersion] = useState<string | null>(null);
  const [disturbances, setDisturbances] = useState<SleepDisturbance[]>([]);
  const [naps, setNaps] = useState<SleepNap[]>([]);

  // Picker visibility
  const [showSleepPicker, setShowSleepPicker] = useState(false);
  const [showWakePicker, setShowWakePicker] = useState(false);

  const loadLog = useCallback(async (date: string) => {
    try {
      const [data, configuration] = await Promise.all([
        fetchSleepForDate(date),
        fetchSleepConfiguration(),
      ]);
      setLog(data);
      setSleepAgeRange(configuration.ageRange);
      setTypicalSchedule(configuration.typicalSchedule);
      setTargetRuleVersion(configuration.ruleVersion);
      setTargetRange(data?.target_sleep_range ?? configuration.targetRange);
      setTargetHours(data?.working_sleep_target ?? configuration.workingTarget);
      setTargetSource(data?.target_source ?? configuration.targetSource);
      if (data) {
        setSleepTime(data.sleep_time ? new Date(data.sleep_time) : null);
        setWakeTime(data.wake_time ? new Date(data.wake_time) : null);
        setQuality(data.quality);
        setNotes(data.notes ?? '');
        setDisturbances(normalizeSleepDisturbances(data.disturbances));
        setNaps(normalizeSleepNaps(data.naps));
        setUseManualDuration(data.manual_duration_override != null);
        setManualDuration(data.manual_duration_override != null
          ? String(Math.round(data.manual_duration_override / 60 * 10) / 10)
          : '');
        setManualDurationReason(data.manual_duration_reason ?? '');
      } else {
        setSleepTime(null);
        setWakeTime(null);
        setQuality(null);
        setNotes('');
        setManualDuration('');
        setManualDurationReason('');
        setUseManualDuration(false);
        setDisturbances([]);
        setNaps([]);
      }
    } catch (e) {
      console.error('Failed to load sleep log:', e);
    }
  }, []);

  useEffect(() => {
    (async () => {
      setLoading(true);
      await loadLog(activeDate);
      const h = await fetchSleepHistory(30, 0);
      setHistory(h);
      setLoading(false);
    })();
  }, [activeDate, loadLog]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadLog(activeDate);
    const h = await fetchSleepHistory(30, 0);
    setHistory(h);
    setRefreshing(false);
  };

  const handleSave = async () => {
    if (!sleepTime && !wakeTime && !useManualDuration) {
      Alert.alert('Required', 'Please enter at least sleep time, wake time, or manual duration.');
      return;
    }
    if (useManualDuration && !manualDurationReason.trim()) {
      Alert.alert('Reason required', 'Explain why you are overriding the calculated duration.');
      return;
    }
    if (disturbances.some((event) => !event.duration_minutes || event.duration_minutes <= 0)) {
      Alert.alert('Disturbance duration required', 'Enter minutes awake for every disturbance, or remove the empty row.');
      return;
    }
    if (naps.some((event) => !event.duration_minutes || event.duration_minutes <= 0)) {
      Alert.alert('Nap duration required', 'Enter minutes for every nap, or remove the empty row.');
      return;
    }
    setSaving(true);
    try {
      const manualMins = useManualDuration && manualDuration
        ? Math.round(parseFloat(manualDuration) * 60)
        : null;
      const wakeTimestamp = wakeTime ? clockOnDate(activeDate, wakeTime) : null;
      let sleepTimestamp = sleepTime ? clockOnDate(activeDate, sleepTime) : null;
      if (sleepTimestamp && wakeTimestamp && sleepTimestamp >= wakeTimestamp) {
        sleepTimestamp.setDate(sleepTimestamp.getDate() - 1);
      }

      if (targetHours !== null) {
        await saveSleepConfiguration({
          ageRange: sleepAgeRange,
          typicalSchedule,
          targetRange: targetRange ?? [targetHours, targetHours],
          workingTarget: targetHours,
          targetSource: targetSource ?? 'user_selected',
          ruleVersion: targetRuleVersion ?? 'sleep-target-v1',
        });
      }

      const sleepInput = {
        sleep_time: sleepTimestamp?.toISOString() ?? null,
        wake_time: wakeTimestamp?.toISOString() ?? null,
        quality,
        disturbances: normalizeSleepDisturbances(disturbances),
        naps: normalizeSleepNaps(naps),
        notes: notes || null,
        manual_duration_override: manualMins,
        manual_duration_reason: manualMins != null ? manualDurationReason.trim() : null,
        working_sleep_target: targetHours,
        target_sleep_range: targetHours != null ? (targetRange ?? [targetHours, targetHours]) : null,
        target_source: targetHours != null ? targetSource : null,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        schedule_context: typicalSchedule,
      };
      const provisionalRecord: SleepRecord = {
        log_date: activeDate,
        sleep_time: sleepInput.sleep_time,
        wake_time: sleepInput.wake_time,
        quality: sleepInput.quality,
        disturbances: sleepInput.disturbances,
        naps: sleepInput.naps,
        notes: sleepInput.notes,
        manual_duration_override: sleepInput.manual_duration_override,
      };
      const analyticsInputs = [
        provisionalRecord,
        ...history.filter((entry) => entry.log_date !== activeDate),
      ].sort((left, right) => right.log_date.localeCompare(left.log_date));
      const analyticsSnapshot = computeSleepAnalytics(analyticsInputs, targetHours, activeDate);

      const saved = await upsertSleepLog(activeDate, {
        ...sleepInput,
        analytics_snapshot: analyticsSnapshot,
      });
      setLog(saved);
      const h = await fetchSleepHistory(30, 0);
      setHistory(h);
      Alert.alert('Saved', 'Sleep log saved successfully.');
    } catch (e) {
      console.error('Save failed:', e);
      Alert.alert('Error', 'Failed to save sleep log. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  // Compute analytics from history
  const analytics = history.length > 0
    ? computeSleepAnalytics(history, targetHours, activeDate)
    : null;

  const targetChoices = targetRange
    ? Array.from(
        { length: Math.round((targetRange[1] - targetRange[0]) * 2) + 1 },
        (_, index) => targetRange[0] + index * 0.5,
      )
    : [7, 7.5, 8, 8.5, 9];

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <ActivityIndicator size="large" color={Colors.primary} style={{ marginTop: 80 }} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <Text style={styles.backButton}>← Back</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>SleepDerm</Text>
          <TouchableOpacity onPress={() => setShowHistory(!showHistory)}>
            <Text style={styles.historyToggle}>{showHistory ? 'Log' : 'History'}</Text>
          </TouchableOpacity>
        </View>

        {showHistory ? (
          <ScrollView style={styles.scroll} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}>
            <Text style={styles.sectionTitle}>Sleep History</Text>
            {history.length === 0 && <Text style={styles.emptyText}>No sleep logs yet.</Text>}
            {history.map(entry => {
              const dur = entry.manual_duration_override != null
                ? Math.round(entry.manual_duration_override / 60 * 10) / 10
                : (entry.sleep_time && entry.wake_time)
                  ? Math.round((new Date(entry.wake_time).getTime() - new Date(entry.sleep_time).getTime()) / 3600000 * 10) / 10
                  : null;
              return (
                <TouchableOpacity
                  key={entry.id}
                  style={styles.historyCard}
                  onPress={() => { setActiveDate(entry.log_date); setShowHistory(false); }}
                >
                  <Text style={styles.historyDate}>{entry.log_date}</Text>
                  <Text style={styles.historyDetail}>
                    {dur != null ? `${dur}h` : 'Duration unknown'}
                    {entry.quality ? ` · Quality: ${QUALITY_LABELS[entry.quality]}` : ''}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        ) : (
          <ScrollView style={styles.scroll} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />} keyboardShouldPersistTaps="handled">
            {/* Date nav */}
            <View style={styles.dateRow}>
              <TouchableOpacity onPress={() => { const d = new Date(activeDate); d.setDate(d.getDate() - 1); setActiveDate(d.toISOString().split('T')[0]); }}>
                <Text style={styles.dateArrow}>‹</Text>
              </TouchableOpacity>
              <Text style={styles.dateText}>{activeDate === getLocalDate() ? 'Today' : activeDate}</Text>
              <TouchableOpacity
                onPress={() => { if (activeDate < getLocalDate()) { const d = new Date(activeDate); d.setDate(d.getDate() + 1); setActiveDate(d.toISOString().split('T')[0]); } }}
                disabled={activeDate >= getLocalDate()}
              >
                <Text style={[styles.dateArrow, activeDate >= getLocalDate() && styles.dateArrowDisabled]}>›</Text>
              </TouchableOpacity>
            </View>

            {log && <Text style={styles.savedBadge}>✓ Saved · {new Date(log.updated_at).toLocaleTimeString()}</Text>}

            {/* Analytics card */}
            {analytics && (
              <View style={styles.analyticsCard}>
                <Text style={styles.analyticsTitle}>Sleep Analytics</Text>
                <Text style={styles.analyticsSubtitle}>
                  Rule version: {analytics.rule_version} · {analytics.days_logged} days logged
                </Text>
                {analytics.readiness === 'insufficient_data' && (
                  <Text style={styles.analyticsWarning}>
                    ⚠ Log at least {analytics.min_records_required} days for full analytics
                  </Text>
                )}
                <View style={styles.analyticsRow}>
                  <View style={styles.analyticsStat}>
                    <Text style={styles.analyticsValue}>
                      {analytics.duration_hours != null ? `${analytics.duration_hours}h` : '—'}
                    </Text>
                    <Text style={styles.analyticsLabel}>Duration</Text>
                  </View>
                  <View style={styles.analyticsStat}>
                    <Text style={styles.analyticsValue}>
                      {analytics.daily_debt_hours != null ? `${analytics.daily_debt_hours}h` : '—'}
                    </Text>
                    <Text style={styles.analyticsLabel}>Today's Debt</Text>
                  </View>
                  <View style={styles.analyticsStat}>
                    <Text style={styles.analyticsValue}>
                      {analytics.cumulative_debt_7d != null ? `${analytics.cumulative_debt_7d}h` : '—'}
                    </Text>
                    <Text style={styles.analyticsLabel}>7-Day Debt</Text>
                  </View>
                </View>
                {analytics.readiness === 'sufficient_data' ? (
                  <>
                    <View style={styles.analyticsRow}>
                      <View style={styles.analyticsStat}>
                        <Text style={styles.analyticsValue}>
                          {analytics.circadian_alignment_score ?? '—'}
                        </Text>
                        <Text style={styles.analyticsLabel}>Circadian alignment</Text>
                      </View>
                      <View style={styles.analyticsStat}>
                        <Text style={styles.analyticsCategory}>
                          {analytics.nocturnal_recovery_opportunity}
                        </Text>
                        <Text style={styles.analyticsLabel}>Recovery opportunity estimate</Text>
                      </View>
                      <View style={styles.analyticsStat}>
                        <Text style={styles.analyticsValue}>
                          {analytics.onset_regularity_minutes ?? '—'}m
                        </Text>
                        <Text style={styles.analyticsLabel}>Bedtime regularity</Text>
                      </View>
                    </View>
                    <Text style={styles.analyticsDetail}>
                      Pattern: {analytics.sleep_pattern} · Confidence: {analytics.confidence}
                    </Text>
                    {analytics.score_factors.length > 0 && (
                      <Text style={styles.analyticsDetail}>
                        Main score factors: {analytics.score_factors.join(', ')}
                      </Text>
                    )}
                  </>
                ) : (
                  <Text style={styles.analyticsWarning}>
                    Circadian alignment and nocturnal recovery opportunity are unavailable until 7 valid records exist.
                  </Text>
                )}
                {analytics.missing_data_notes.map((note) => (
                  <Text key={note} style={styles.analyticsDetail}>Missing data: {note}</Text>
                ))}
                <Text style={styles.analyticsDisclaimer}>
                  Recovery is an opportunity estimate, not proof that skin repair occurred. These are observational records only — no causal claims are made between sleep and skin outcomes.
                </Text>
              </View>
            )}

            {/* Sleep time */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Sleep Time</Text>
              <TouchableOpacity style={styles.timeButton} onPress={() => setShowSleepPicker(true)}>
                <Text style={styles.timeButtonText}>
                  {sleepTime ? sleepTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Tap to set'}
                </Text>
              </TouchableOpacity>
              {showSleepPicker && (
                <DateTimePicker
                  value={sleepTime ?? new Date()}
                  mode="time"
                  display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                  onChange={(_: unknown, date?: Date) => { setShowSleepPicker(false); if (date) setSleepTime(date); }}
                />
              )}
            </View>

            {/* Wake time */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Wake Time</Text>
              <TouchableOpacity style={styles.timeButton} onPress={() => setShowWakePicker(true)}>
                <Text style={styles.timeButtonText}>
                  {wakeTime ? wakeTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Tap to set'}
                </Text>
              </TouchableOpacity>
              {showWakePicker && (
                <DateTimePicker
                  value={wakeTime ?? new Date()}
                  mode="time"
                  display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                  onChange={(_: unknown, date?: Date) => { setShowWakePicker(false); if (date) setWakeTime(date); }}
                />
              )}
            </View>

            {/* Manual duration override */}
            <View style={styles.section}>
              <View style={styles.checkRow}>
                <Switch value={useManualDuration} onValueChange={setUseManualDuration} trackColor={{ true: Colors.primary }} />
                <Text style={styles.checkLabel}>Enter duration manually (hours)</Text>
              </View>
              {useManualDuration && (
                <>
                  <TextInput
                    style={styles.inputField}
                    value={manualDuration}
                    onChangeText={setManualDuration}
                    keyboardType="decimal-pad"
                    placeholder="e.g. 7.5"
                    accessibilityLabel="Manual sleep duration in hours"
                  />
                  <TextInput
                    style={styles.inputField}
                    value={manualDurationReason}
                    onChangeText={setManualDurationReason}
                    placeholder="Why are you overriding the calculated duration?"
                    accessibilityLabel="Manual duration override reason"
                  />
                </>
              )}
            </View>

            {/* Sleep quality */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Sleep Quality</Text>
              <View style={styles.qualityRow}>
                {[1, 2, 3, 4, 5].map(q => (
                  <TouchableOpacity
                    key={q}
                    style={[styles.qualityButton, quality === q && styles.qualityButtonActive]}
                    onPress={() => setQuality(q)}
                    accessibilityLabel={QUALITY_LABELS[q]}
                  >
                    <Text style={[styles.qualityButtonText, quality === q && styles.qualityButtonTextActive]}>
                      {q}
                    </Text>
                    <Text style={[styles.qualityButtonLabel, quality === q && styles.qualityButtonTextActive]}>
                      {QUALITY_LABELS[q]}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.section}>
              <View style={styles.eventHeader}>
                <View style={styles.eventHeaderCopy}>
                  <Text style={styles.sectionTitle}>Awakenings / Disturbances</Text>
                  <Text style={styles.analyticsDetail}>Minutes awake are excluded from calculated nighttime sleep.</Text>
                </View>
                <TouchableOpacity
                  onPress={() => setDisturbances((current) => [...current, {}])}
                  accessibilityLabel="Add sleep disturbance"
                >
                  <Text style={styles.addEventText}>+ Add</Text>
                </TouchableOpacity>
              </View>
              {disturbances.length === 0 && (
                <Text style={styles.emptyEventText}>No disturbances recorded.</Text>
              )}
              {disturbances.map((event, index) => (
                <View key={`disturbance-${index}`} style={styles.eventCard}>
                  <View style={styles.eventHeader}>
                    <Text style={styles.eventTitle}>Disturbance {index + 1}</Text>
                    <TouchableOpacity
                      onPress={() => setDisturbances((current) => removeSleepEvent(current, index))}
                      accessibilityLabel={`Remove disturbance ${index + 1}`}
                    >
                      <Text style={styles.removeEventText}>Remove</Text>
                    </TouchableOpacity>
                  </View>
                  <TextInput
                    style={styles.inputField}
                    value={event.duration_minutes == null ? '' : String(event.duration_minutes)}
                    onChangeText={(value) => setDisturbances((current) => updateSleepEvent(current, index, {
                      duration_minutes: value.trim() === '' ? undefined : Number(value),
                    }))}
                    keyboardType="number-pad"
                    placeholder="Minutes awake"
                    accessibilityLabel={`Disturbance ${index + 1} minutes awake`}
                  />
                  <TextInput
                    style={styles.inputField}
                    value={event.reason ?? ''}
                    onChangeText={(value) => setDisturbances((current) => updateSleepEvent(current, index, { reason: value }))}
                    placeholder="Reason or context (optional)"
                    accessibilityLabel={`Disturbance ${index + 1} reason`}
                  />
                </View>
              ))}
            </View>

            <View style={styles.section}>
              <View style={styles.eventHeader}>
                <View style={styles.eventHeaderCopy}>
                  <Text style={styles.sectionTitle}>Naps</Text>
                  <Text style={styles.analyticsDetail}>Nap credit is capped at 90 minutes and is not treated as a full replacement for nighttime sleep.</Text>
                </View>
                <TouchableOpacity
                  onPress={() => setNaps((current) => [...current, {}])}
                  accessibilityLabel="Add nap"
                >
                  <Text style={styles.addEventText}>+ Add</Text>
                </TouchableOpacity>
              </View>
              {naps.length === 0 && <Text style={styles.emptyEventText}>No naps recorded.</Text>}
              {naps.map((event, index) => (
                <View key={`nap-${index}`} style={styles.eventCard}>
                  <View style={styles.eventHeader}>
                    <Text style={styles.eventTitle}>Nap {index + 1}</Text>
                    <TouchableOpacity
                      onPress={() => setNaps((current) => removeSleepEvent(current, index))}
                      accessibilityLabel={`Remove nap ${index + 1}`}
                    >
                      <Text style={styles.removeEventText}>Remove</Text>
                    </TouchableOpacity>
                  </View>
                  <TextInput
                    style={styles.inputField}
                    value={event.duration_minutes == null ? '' : String(event.duration_minutes)}
                    onChangeText={(value) => setNaps((current) => updateSleepEvent(current, index, {
                      duration_minutes: value.trim() === '' ? undefined : Number(value),
                    }))}
                    keyboardType="number-pad"
                    placeholder="Nap duration in minutes"
                    accessibilityLabel={`Nap ${index + 1} duration in minutes`}
                  />
                  <Text style={styles.eventQualityLabel}>Nap quality (optional)</Text>
                  <View style={styles.eventQualityRow}>
                    {[1, 2, 3, 4, 5].map((rating) => (
                      <TouchableOpacity
                        key={rating}
                        style={[styles.eventQualityButton, event.quality === rating && styles.qualityButtonActive]}
                        onPress={() => setNaps((current) => updateSleepEvent(current, index, { quality: rating }))}
                        accessibilityLabel={`Nap ${index + 1} quality ${rating}`}
                      >
                        <Text style={[styles.targetButtonText, event.quality === rating && styles.targetButtonTextActive]}>{rating}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              ))}
            </View>

            {/* Target hours */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Sleep Target (hours)</Text>
              <Text style={styles.analyticsDetail}>
                {targetRange
                  ? `Recommended range: ${targetRange[0]}–${targetRange[1]}h · Source: ${targetSource ?? 'not recorded'}`
                  : 'No age-aware range is available. Select a working target or update your onboarding age range.'}
              </Text>
              {typicalSchedule && (
                <Text style={styles.analyticsDetail}>Schedule context: {typicalSchedule.replace(/_/g, ' ')}</Text>
              )}
              <View style={styles.targetRow}>
                {targetChoices.map(h => (
                  <TouchableOpacity
                    key={h}
                    style={[styles.targetButton, targetHours === h && styles.targetButtonActive]}
                    onPress={() => {
                      setTargetHours(h);
                      setTargetRange((current) => current ?? [h, h]);
                      setTargetSource('user_selected');
                      setTargetRuleVersion('sleep-target-v1');
                    }}
                    accessibilityLabel={`${h} hours target`}
                  >
                    <Text style={[styles.targetButtonText, targetHours === h && styles.targetButtonTextActive]}>{h}h</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Notes */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Notes</Text>
              <TextInput
                style={styles.notesInput}
                value={notes}
                onChangeText={setNotes}
                placeholder="Any sleep observations..."
                multiline
                numberOfLines={3}
                accessibilityLabel="Sleep notes"
              />
            </View>

            {/* Save */}
            <TouchableOpacity
              style={[styles.saveButton, saving && styles.saveButtonDisabled]}
              onPress={handleSave}
              disabled={saving}
            >
              {saving ? <ActivityIndicator color="#fff" /> : (
                <Text style={styles.saveButtonText}>{log ? 'Update Sleep Log' : 'Save Sleep Log'}</Text>
              )}
            </TouchableOpacity>

            <View style={{ height: 40 }} />
          </ScrollView>
        )}
      </KeyboardAvoidingView>
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
  headerTitle: { fontSize: 18, fontWeight: '700', color: Colors.text },
  historyToggle: { fontSize: 14, color: Colors.primary },
  scroll: { flex: 1 },
  dateRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    paddingVertical: Spacing.sm, gap: Spacing.lg,
  },
  dateArrow: { fontSize: 28, color: Colors.primary, paddingHorizontal: Spacing.md },
  dateArrowDisabled: { color: Colors.textMuted },
  dateText: { fontSize: 16, fontWeight: '600', color: Colors.text },
  savedBadge: { textAlign: 'center', fontSize: 12, color: Colors.success, paddingBottom: Spacing.xs },
  analyticsCard: {
    marginHorizontal: Spacing.md, marginBottom: Spacing.md,
    backgroundColor: '#EEF2FF', borderRadius: 12, padding: Spacing.md,
    borderLeftWidth: 4, borderLeftColor: Colors.primary,
  },
  analyticsTitle: { fontSize: 15, fontWeight: '700', color: Colors.text },
  analyticsSubtitle: { fontSize: 11, color: Colors.textMuted, marginBottom: Spacing.sm },
  analyticsWarning: { fontSize: 12, color: '#856404', marginBottom: Spacing.sm },
  analyticsRow: { flexDirection: 'row', justifyContent: 'space-around', marginBottom: Spacing.sm },
  analyticsStat: { alignItems: 'center' },
  analyticsValue: { fontSize: 22, fontWeight: '700', color: Colors.primary },
  analyticsCategory: { fontSize: 14, fontWeight: '700', color: Colors.primary, textAlign: 'center' },
  analyticsLabel: { fontSize: 11, color: Colors.textMuted },
  analyticsDetail: { fontSize: 11, color: Colors.textSecondary, marginBottom: 4 },
  analyticsDisclaimer: { fontSize: 11, color: Colors.textMuted, fontStyle: 'italic', lineHeight: 16 },
  section: {
    marginHorizontal: Spacing.md, marginBottom: Spacing.md,
    backgroundColor: Colors.surface, borderRadius: 12, padding: Spacing.md,
  },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: Colors.text, marginBottom: Spacing.xs },
  timeButton: {
    borderWidth: 1, borderColor: Colors.border, borderRadius: 8,
    padding: Spacing.md, alignItems: 'center', backgroundColor: Colors.background,
  },
  timeButtonText: { fontSize: 20, fontWeight: '600', color: Colors.primary },
  checkRow: { flexDirection: 'row', alignItems: 'center', marginBottom: Spacing.xs },
  checkLabel: { fontSize: 14, color: Colors.text, marginLeft: Spacing.sm, flex: 1 },
  inputField: {
    borderWidth: 1, borderColor: Colors.border, borderRadius: 8,
    padding: Spacing.sm, fontSize: 16, color: Colors.text,
    backgroundColor: Colors.background, marginTop: Spacing.xs,
  },
  eventHeader: {
    flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: Spacing.sm,
  },
  eventHeaderCopy: { flex: 1 },
  addEventText: { color: Colors.primary, fontSize: 14, fontWeight: '700', paddingVertical: 2 },
  emptyEventText: { fontSize: 13, color: Colors.textMuted, paddingVertical: Spacing.sm },
  eventCard: {
    marginTop: Spacing.sm, borderWidth: 1, borderColor: Colors.border,
    borderRadius: 10, padding: Spacing.sm, backgroundColor: Colors.background,
  },
  eventTitle: { fontSize: 13, fontWeight: '700', color: Colors.text },
  removeEventText: { fontSize: 12, color: Colors.error, fontWeight: '600' },
  eventQualityLabel: { fontSize: 12, color: Colors.textSecondary, marginTop: Spacing.sm },
  eventQualityRow: { flexDirection: 'row', gap: 6, marginTop: Spacing.xs },
  eventQualityButton: {
    flex: 1, alignItems: 'center', paddingVertical: 8,
    borderRadius: 8, borderWidth: 1, borderColor: Colors.border,
  },
  qualityRow: { flexDirection: 'row', gap: 6 },
  qualityButton: {
    flex: 1, alignItems: 'center', paddingVertical: 8,
    borderRadius: 8, borderWidth: 1, borderColor: Colors.border,
    backgroundColor: Colors.background,
  },
  qualityButtonActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  qualityButtonText: { fontSize: 16, fontWeight: '700', color: Colors.text },
  qualityButtonLabel: { fontSize: 9, color: Colors.textMuted, marginTop: 2 },
  qualityButtonTextActive: { color: '#fff' },
  targetRow: { flexDirection: 'row', gap: 8 },
  targetButton: {
    flex: 1, paddingVertical: 10, alignItems: 'center',
    borderRadius: 8, borderWidth: 1, borderColor: Colors.border,
    backgroundColor: Colors.background,
  },
  targetButtonActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  targetButtonText: { fontSize: 13, fontWeight: '600', color: Colors.text },
  targetButtonTextActive: { color: '#fff' },
  notesInput: {
    borderWidth: 1, borderColor: Colors.border, borderRadius: 8,
    padding: Spacing.sm, fontSize: 14, color: Colors.text,
    backgroundColor: Colors.background, textAlignVertical: 'top',
  },
  saveButton: {
    marginHorizontal: Spacing.md, marginTop: Spacing.md,
    backgroundColor: Colors.primary, borderRadius: 12,
    paddingVertical: 16, alignItems: 'center',
  },
  saveButtonDisabled: { opacity: 0.6 },
  saveButtonText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  historyCard: {
    marginHorizontal: Spacing.md, marginBottom: Spacing.sm,
    backgroundColor: Colors.surface, borderRadius: 12, padding: Spacing.md,
  },
  historyDate: { fontSize: 14, fontWeight: '700', color: Colors.text },
  historyDetail: { fontSize: 13, color: Colors.textSecondary, marginTop: 2 },
  emptyText: { textAlign: 'center', color: Colors.textMuted, marginTop: 40, fontSize: 15 },
});
