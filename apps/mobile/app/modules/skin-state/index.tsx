/**
 * SkinState Journal — Daily Acne Activity Logging
 * Zero-fabrication: all data from real user input
 */
import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, Switch,
  StyleSheet, Alert, ActivityIndicator, RefreshControl,
  TextInput, Platform, KeyboardAvoidingView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import {
  fetchSkinStateForDate, upsertSkinState, fetchSkinStateHistory,
  SKIN_ZONES, SENSITIVITY_SYMPTOMS, BARRIER_SYMPTOMS,
  ACTIVITY_LABELS, INTERPRETATION_LABELS, INTERPRETATION_CAUTIONS,
  SkinStateLog, SaveState,
} from '../../../src/lib/skin-state-service';
import { Colors, Spacing, Typography } from '../../../src/components/ui/theme';

const TODAY = new Date().toISOString().split('T')[0];

function getLocalDate(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export default function SkinStateScreen() {
  const [activeDate, setActiveDate] = useState(getLocalDate());
  const [log, setLog] = useState<SkinStateLog | null>(null);
  const [history, setHistory] = useState<SkinStateLog[]>([]);
  const [saveState, setSaveState] = useState<SaveState>('idle');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [historyPage, setHistoryPage] = useState(0);
  const [hasMoreHistory, setHasMoreHistory] = useState(true);

  // Form state
  const [overallActivity, setOverallActivity] = useState<string | null>(null);
  const [changeFromBaseline, setChangeFromBaseline] = useState<string | null>(null);
  const [newLesions, setNewLesions] = useState<string>('');
  const [healingLesions, setHealingLesions] = useState<string>('');
  const [persistentLesions, setPersistentLesions] = useState<string>('');
  const [lesionCountUncertain, setLesionCountUncertain] = useState(false);
  const [lesionTypes, setLesionTypes] = useState({ inflammatory: false, comedonal: false, nodular_cystic: false, unsure: false });
  const [dominantZones, setDominantZones] = useState<string[]>([]);
  const [inflammationLevel, setInflammationLevel] = useState<number | null>(null);
  const [oilinessLevel, setOilinessLevel] = useState<number | null>(null);
  const [drynessLevel, setDrynessLevel] = useState<number | null>(null);
  const [sensitivitySymptoms, setSensitivitySymptoms] = useState<string[]>([]);
  const [barrierSymptoms, setBarrierSymptoms] = useState<string[]>([]);
  const [pihConcern, setPihConcern] = useState<boolean | null>(null);
  const [scarringConcern, setScarringConcern] = useState<boolean | null>(null);
  const [interpretation, setInterpretation] = useState<string | null>(null);
  const [pickingTouching, setPickingTouching] = useState<boolean | null>(null);
  const [pickingNotes, setPickingNotes] = useState('');
  const [confidence, setConfidence] = useState<'high' | 'medium' | 'low' | 'unsure'>('medium');
  const [notes, setNotes] = useState('');

  const loadLog = useCallback(async (date: string) => {
    try {
      const data = await fetchSkinStateForDate(date);
      setLog(data);
      if (data) {
        setOverallActivity(data.overall_activity);
        setChangeFromBaseline(data.change_from_baseline);
        setNewLesions(data.new_lesions != null ? String(data.new_lesions) : '');
        setHealingLesions(data.healing_lesions != null ? String(data.healing_lesions) : '');
        setPersistentLesions(data.persistent_lesions != null ? String(data.persistent_lesions) : '');
        setLesionCountUncertain(data.lesion_count_uncertain);
        setLesionTypes(data.lesion_types ?? { inflammatory: false, comedonal: false, nodular_cystic: false, unsure: false });
        setDominantZones(data.dominant_zones ?? []);
        setInflammationLevel(data.inflammation_level);
        setOilinessLevel(data.oiliness_level);
        setDrynessLevel(data.dryness_level);
        setSensitivitySymptoms(data.sensitivity_symptoms ?? []);
        setBarrierSymptoms(data.barrier_symptoms ?? []);
        setPihConcern(data.pih_concern);
        setScarringConcern(data.scarring_concern);
        setInterpretation(data.interpretation);
        setPickingTouching(data.picking_touching);
        setPickingNotes(data.picking_notes ?? '');
        setConfidence(data.confidence ?? 'medium');
        setNotes(data.notes ?? '');
      } else {
        resetForm();
      }
    } catch (e) {
      console.error('Failed to load skin state:', e);
    }
  }, []);

  const resetForm = () => {
    setOverallActivity(null);
    setChangeFromBaseline(null);
    setNewLesions('');
    setHealingLesions('');
    setPersistentLesions('');
    setLesionCountUncertain(false);
    setLesionTypes({ inflammatory: false, comedonal: false, nodular_cystic: false, unsure: false });
    setDominantZones([]);
    setInflammationLevel(null);
    setOilinessLevel(null);
    setDrynessLevel(null);
    setSensitivitySymptoms([]);
    setBarrierSymptoms([]);
    setPihConcern(null);
    setScarringConcern(null);
    setInterpretation(null);
    setPickingTouching(null);
    setPickingNotes('');
    setConfidence('medium');
    setNotes('');
  };

  const loadHistory = useCallback(async (page = 0) => {
    try {
      const data = await fetchSkinStateHistory(10, page * 10);
      if (page === 0) {
        setHistory(data);
      } else {
        setHistory(prev => [...prev, ...data]);
      }
      setHasMoreHistory(data.length === 10);
    } catch (e) {
      console.error('Failed to load history:', e);
    }
  }, []);

  useEffect(() => {
    (async () => {
      setLoading(true);
      await loadLog(activeDate);
      setLoading(false);
    })();
  }, [activeDate, loadLog]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadLog(activeDate);
    if (showHistory) await loadHistory(0);
    setRefreshing(false);
  };

  const handleSave = async () => {
    setSaveState('validating');
    // Validate: at minimum, overall_activity should be set
    if (!overallActivity) {
      Alert.alert('Required', 'Please select your overall acne activity level before saving.');
      setSaveState('idle');
      return;
    }
    setSaveState('saving');
    try {
      const saved = await upsertSkinState(activeDate, {
        overall_activity: overallActivity as SkinStateLog['overall_activity'],
        change_from_baseline: changeFromBaseline as SkinStateLog['change_from_baseline'],
        new_lesions: newLesions !== '' && !lesionCountUncertain ? parseInt(newLesions) : null,
        healing_lesions: healingLesions !== '' && !lesionCountUncertain ? parseInt(healingLesions) : null,
        persistent_lesions: persistentLesions !== '' && !lesionCountUncertain ? parseInt(persistentLesions) : null,
        lesion_count_uncertain: lesionCountUncertain,
        lesion_types: lesionTypes,
        dominant_zones: dominantZones.length > 0 ? dominantZones : null,
        inflammation_level: inflammationLevel,
        oiliness_level: oilinessLevel,
        dryness_level: drynessLevel,
        sensitivity_symptoms: sensitivitySymptoms.length > 0 ? sensitivitySymptoms : null,
        barrier_symptoms: barrierSymptoms.length > 0 ? barrierSymptoms : null,
        pih_concern: pihConcern,
        scarring_concern: scarringConcern,
        interpretation: interpretation as SkinStateLog['interpretation'],
        picking_touching: pickingTouching,
        picking_notes: pickingNotes || null,
        confidence,
        notes: notes || null,
        is_backfill: activeDate < getLocalDate(),
        backfill_reason: activeDate < getLocalDate() ? 'user_backfill' : null,
      });
      setLog(saved);
      setSaveState(log ? 'updated' : 'saved');
      setTimeout(() => setSaveState('idle'), 3000);
    } catch (e: unknown) {
      console.error('Save failed:', e);
      setSaveState('failed');
      Alert.alert('Save Failed', 'Could not save your skin state. Please try again.');
    }
  };

  const toggleZone = (zoneId: string) => {
    setDominantZones(prev =>
      prev.includes(zoneId) ? prev.filter(z => z !== zoneId) : [...prev, zoneId]
    );
  };

  const toggleSymptom = (symptomId: string, type: 'sensitivity' | 'barrier') => {
    if (type === 'sensitivity') {
      setSensitivitySymptoms(prev =>
        prev.includes(symptomId) ? prev.filter(s => s !== symptomId) : [...prev, symptomId]
      );
    } else {
      setBarrierSymptoms(prev =>
        prev.includes(symptomId) ? prev.filter(s => s !== symptomId) : [...prev, symptomId]
      );
    }
  };

  const renderScaleSelector = (
    label: string,
    value: number | null,
    onChange: (v: number) => void
  ) => (
    <View style={styles.scaleRow}>
      <Text style={styles.scaleLabel}>{label}</Text>
      <View style={styles.scaleButtons}>
        {[0, 1, 2, 3, 4, 5].map(n => (
          <TouchableOpacity
            key={n}
            style={[styles.scaleButton, value === n && styles.scaleButtonActive]}
            onPress={() => onChange(n)}
            accessibilityLabel={`${label} level ${n}`}
          >
            <Text style={[styles.scaleButtonText, value === n && styles.scaleButtonTextActive]}>
              {n}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <ActivityIndicator size="large" color={Colors.primary} style={{ marginTop: 80 }} />
      </SafeAreaView>
    );
  }

  const isBackfill = activeDate < getLocalDate();
  const interpretationCaution = interpretation ? INTERPRETATION_CAUTIONS[interpretation] : null;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} accessibilityLabel="Go back">
            <Text style={styles.backButton}>← Back</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Skin Journal</Text>
          <TouchableOpacity onPress={() => { setShowHistory(!showHistory); if (!showHistory) loadHistory(0); }}>
            <Text style={styles.historyToggle}>{showHistory ? 'Log' : 'History'}</Text>
          </TouchableOpacity>
        </View>

        {showHistory ? (
          <ScrollView
            style={styles.scroll}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          >
            <Text style={styles.sectionTitle}>Recent Entries</Text>
            <Text style={styles.disclaimer}>
              Entries shown as recorded. No causal claims are made between entries.
            </Text>
            {history.length === 0 && (
              <Text style={styles.emptyText}>No skin state entries yet.</Text>
            )}
            {history.map(entry => (
              <TouchableOpacity
                key={entry.id}
                style={styles.historyCard}
                onPress={() => { setActiveDate(entry.log_date); setShowHistory(false); }}
              >
                <Text style={styles.historyDate}>{entry.log_date}</Text>
                <Text style={styles.historyActivity}>
                  {entry.overall_activity ? ACTIVITY_LABELS[entry.overall_activity] : 'Not specified'}
                  {entry.is_backfill ? ' (backfilled)' : ''}
                </Text>
                {entry.dominant_zones && entry.dominant_zones.length > 0 && (
                  <Text style={styles.historyZones}>
                    Zones: {entry.dominant_zones.join(', ')}
                  </Text>
                )}
                <Text style={styles.historyRevision}>Rev. {entry.revision}</Text>
              </TouchableOpacity>
            ))}
            {hasMoreHistory && (
              <TouchableOpacity
                style={styles.loadMoreButton}
                onPress={() => { const next = historyPage + 1; setHistoryPage(next); loadHistory(next); }}
              >
                <Text style={styles.loadMoreText}>Load More</Text>
              </TouchableOpacity>
            )}
          </ScrollView>
        ) : (
          <ScrollView
            style={styles.scroll}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
            keyboardShouldPersistTaps="handled"
          >
            {/* Date selector */}
            <View style={styles.dateRow}>
              <TouchableOpacity
                onPress={() => {
                  const d = new Date(activeDate);
                  d.setDate(d.getDate() - 1);
                  setActiveDate(d.toISOString().split('T')[0]);
                }}
                accessibilityLabel="Previous day"
              >
                <Text style={styles.dateArrow}>‹</Text>
              </TouchableOpacity>
              <Text style={styles.dateText}>
                {activeDate === getLocalDate() ? 'Today' : activeDate}
                {isBackfill ? ' (backfill)' : ''}
              </Text>
              <TouchableOpacity
                onPress={() => {
                  if (activeDate < getLocalDate()) {
                    const d = new Date(activeDate);
                    d.setDate(d.getDate() + 1);
                    setActiveDate(d.toISOString().split('T')[0]);
                  }
                }}
                disabled={activeDate >= getLocalDate()}
                accessibilityLabel="Next day"
              >
                <Text style={[styles.dateArrow, activeDate >= getLocalDate() && styles.dateArrowDisabled]}>›</Text>
              </TouchableOpacity>
            </View>

            {log && (
              <Text style={styles.savedBadge}>
                ✓ Saved — Rev. {log.revision} · {new Date(log.updated_at).toLocaleTimeString()}
              </Text>
            )}

            {/* Overall Activity */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Overall Acne Activity *</Text>
              <View style={styles.optionRow}>
                {Object.entries(ACTIVITY_LABELS).map(([key, label]) => (
                  <TouchableOpacity
                    key={key}
                    style={[styles.optionChip, overallActivity === key && styles.optionChipActive]}
                    onPress={() => setOverallActivity(key)}
                    accessibilityLabel={label}
                  >
                    <Text style={[styles.optionChipText, overallActivity === key && styles.optionChipTextActive]}>
                      {label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Change from baseline */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Change from Your Baseline</Text>
              <View style={styles.optionRow}>
                {[
                  { key: 'better', label: 'Better' },
                  { key: 'same', label: 'Same' },
                  { key: 'worse', label: 'Worse' },
                  { key: 'unknown', label: 'Not Sure' },
                ].map(({ key, label }) => (
                  <TouchableOpacity
                    key={key}
                    style={[styles.optionChip, changeFromBaseline === key && styles.optionChipActive]}
                    onPress={() => setChangeFromBaseline(key)}
                    accessibilityLabel={label}
                  >
                    <Text style={[styles.optionChipText, changeFromBaseline === key && styles.optionChipTextActive]}>
                      {label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Lesion counts */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Lesion Counts (Optional)</Text>
              <View style={styles.checkRow}>
                <Switch
                  value={lesionCountUncertain}
                  onValueChange={setLesionCountUncertain}
                  trackColor={{ true: Colors.primary }}
                />
                <Text style={styles.checkLabel}>I'm not sure / don't want to count</Text>
              </View>
              {!lesionCountUncertain && (
                <View style={styles.lesionInputRow}>
                  {[
                    { label: 'New', value: newLesions, setter: setNewLesions },
                    { label: 'Healing', value: healingLesions, setter: setHealingLesions },
                    { label: 'Persistent', value: persistentLesions, setter: setPersistentLesions },
                  ].map(({ label, value, setter }) => (
                    <View key={label} style={styles.lesionInput}>
                      <Text style={styles.lesionInputLabel}>{label}</Text>
                      <TextInput
                        style={styles.lesionInputField}
                        value={value}
                        onChangeText={setter}
                        keyboardType="number-pad"
                        maxLength={3}
                        placeholder="—"
                        accessibilityLabel={`${label} lesions count`}
                      />
                    </View>
                  ))}
                </View>
              )}
            </View>

            {/* Lesion types */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Lesion Types</Text>
              <View style={styles.optionRow}>
                {[
                  { key: 'inflammatory', label: 'Inflammatory' },
                  { key: 'comedonal', label: 'Comedonal' },
                  { key: 'nodular_cystic', label: 'Nodular/Cystic' },
                  { key: 'unsure', label: 'Not Sure' },
                ].map(({ key, label }) => (
                  <TouchableOpacity
                    key={key}
                    style={[styles.optionChip, lesionTypes[key as keyof typeof lesionTypes] && styles.optionChipActive]}
                    onPress={() => setLesionTypes(prev => ({ ...prev, [key]: !prev[key as keyof typeof lesionTypes] }))}
                    accessibilityLabel={label}
                  >
                    <Text style={[styles.optionChipText, lesionTypes[key as keyof typeof lesionTypes] && styles.optionChipTextActive]}>
                      {label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Dominant zones */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Dominant Zones</Text>
              <View style={styles.optionRow}>
                {SKIN_ZONES.map(({ id, label }) => (
                  <TouchableOpacity
                    key={id}
                    style={[styles.optionChip, dominantZones.includes(id) && styles.optionChipActive]}
                    onPress={() => toggleZone(id)}
                    accessibilityLabel={label}
                  >
                    <Text style={[styles.optionChipText, dominantZones.includes(id) && styles.optionChipTextActive]}>
                      {label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Skin condition scales */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Skin Condition (0 = none, 5 = severe)</Text>
              {renderScaleSelector('Inflammation/Redness', inflammationLevel, setInflammationLevel)}
              {renderScaleSelector('Oiliness', oilinessLevel, setOilinessLevel)}
              {renderScaleSelector('Dryness', drynessLevel, setDrynessLevel)}
            </View>

            {/* Sensitivity symptoms */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Sensitivity Symptoms</Text>
              <View style={styles.optionRow}>
                {SENSITIVITY_SYMPTOMS.map(({ id, label }) => (
                  <TouchableOpacity
                    key={id}
                    style={[styles.optionChip, sensitivitySymptoms.includes(id) && styles.optionChipActive]}
                    onPress={() => toggleSymptom(id, 'sensitivity')}
                    accessibilityLabel={label}
                  >
                    <Text style={[styles.optionChipText, sensitivitySymptoms.includes(id) && styles.optionChipTextActive]}>
                      {label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Barrier symptoms */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Barrier Symptoms</Text>
              <View style={styles.optionRow}>
                {BARRIER_SYMPTOMS.map(({ id, label }) => (
                  <TouchableOpacity
                    key={id}
                    style={[styles.optionChip, barrierSymptoms.includes(id) && styles.optionChipActive]}
                    onPress={() => toggleSymptom(id, 'barrier')}
                    accessibilityLabel={label}
                  >
                    <Text style={[styles.optionChipText, barrierSymptoms.includes(id) && styles.optionChipTextActive]}>
                      {label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Residual marks */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Residual Marks Concern</Text>
              <View style={styles.checkRow}>
                <Switch value={pihConcern ?? false} onValueChange={setPihConcern} trackColor={{ true: Colors.primary }} />
                <Text style={styles.checkLabel}>PIH / PIE (dark spots / red marks)</Text>
              </View>
              <View style={styles.checkRow}>
                <Switch value={scarringConcern ?? false} onValueChange={setScarringConcern} trackColor={{ true: Colors.primary }} />
                <Text style={styles.checkLabel}>Scarring concern</Text>
              </View>
            </View>

            {/* Interpretation */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>How Would You Describe This?</Text>
              <Text style={styles.sectionSubtitle}>Your interpretation, not a diagnosis</Text>
              <View style={styles.optionRow}>
                {Object.entries(INTERPRETATION_LABELS).map(([key, label]) => (
                  <TouchableOpacity
                    key={key}
                    style={[styles.optionChip, interpretation === key && styles.optionChipActive]}
                    onPress={() => setInterpretation(key)}
                    accessibilityLabel={label}
                  >
                    <Text style={[styles.optionChipText, interpretation === key && styles.optionChipTextActive]}>
                      {label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
              {interpretationCaution && (
                <View style={styles.cautionBox}>
                  <Text style={styles.cautionText}>⚠ {interpretationCaution}</Text>
                </View>
              )}
            </View>

            {/* Picking/touching */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Picking / Touching</Text>
              <View style={styles.checkRow}>
                <Switch
                  value={pickingTouching ?? false}
                  onValueChange={setPickingTouching}
                  trackColor={{ true: Colors.primary }}
                />
                <Text style={styles.checkLabel}>I picked or touched my skin today</Text>
              </View>
              {pickingTouching && (
                <TextInput
                  style={styles.notesInput}
                  value={pickingNotes}
                  onChangeText={setPickingNotes}
                  placeholder="Optional context..."
                  multiline
                  numberOfLines={2}
                  accessibilityLabel="Picking notes"
                />
              )}
            </View>

            {/* Confidence */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>How Confident Are You in This Entry?</Text>
              <View style={styles.optionRow}>
                {[
                  { key: 'high', label: 'Confident' },
                  { key: 'medium', label: 'Somewhat' },
                  { key: 'low', label: 'Uncertain' },
                  { key: 'unsure', label: 'Not Sure' },
                ].map(({ key, label }) => (
                  <TouchableOpacity
                    key={key}
                    style={[styles.optionChip, confidence === key && styles.optionChipActive]}
                    onPress={() => setConfidence(key as typeof confidence)}
                    accessibilityLabel={label}
                  >
                    <Text style={[styles.optionChipText, confidence === key && styles.optionChipTextActive]}>
                      {label}
                    </Text>
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
                placeholder="Any additional observations..."
                multiline
                numberOfLines={3}
                accessibilityLabel="Skin state notes"
              />
            </View>

            {/* Save button */}
            <TouchableOpacity
              style={[
                styles.saveButton,
                saveState === 'saving' && styles.saveButtonDisabled,
              ]}
              onPress={handleSave}
              disabled={saveState === 'saving' || saveState === 'validating'}
              accessibilityLabel="Save skin state"
            >
              {saveState === 'saving' ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.saveButtonText}>
                  {saveState === 'saved' ? '✓ Saved' :
                   saveState === 'updated' ? '✓ Updated' :
                   saveState === 'failed' ? 'Retry Save' :
                   log ? 'Update Entry' : 'Save Entry'}
                </Text>
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
  savedBadge: {
    textAlign: 'center', fontSize: 12, color: Colors.success,
    paddingBottom: Spacing.xs,
  },
  section: {
    marginHorizontal: Spacing.md, marginBottom: Spacing.md,
    backgroundColor: Colors.surface, borderRadius: 12, padding: Spacing.md,
  },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: Colors.text, marginBottom: Spacing.xs },
  sectionSubtitle: { fontSize: 12, color: Colors.textMuted, marginBottom: Spacing.sm },
  disclaimer: { fontSize: 12, color: Colors.textMuted, marginHorizontal: Spacing.md, marginBottom: Spacing.sm },
  optionRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  optionChip: {
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20,
    borderWidth: 1, borderColor: Colors.border, backgroundColor: Colors.background,
  },
  optionChipActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  optionChipText: { fontSize: 13, color: Colors.text },
  optionChipTextActive: { color: '#fff', fontWeight: '600' },
  checkRow: { flexDirection: 'row', alignItems: 'center', marginBottom: Spacing.xs },
  checkLabel: { fontSize: 14, color: Colors.text, marginLeft: Spacing.sm, flex: 1 },
  lesionInputRow: { flexDirection: 'row', gap: Spacing.md, marginTop: Spacing.sm },
  lesionInput: { flex: 1, alignItems: 'center' },
  lesionInputLabel: { fontSize: 12, color: Colors.textMuted, marginBottom: 4 },
  lesionInputField: {
    width: '100%', borderWidth: 1, borderColor: Colors.border,
    borderRadius: 8, padding: Spacing.sm, textAlign: 'center',
    fontSize: 16, color: Colors.text, backgroundColor: Colors.background,
  },
  scaleRow: { marginBottom: Spacing.sm },
  scaleLabel: { fontSize: 13, color: Colors.textSecondary, marginBottom: 4 },
  scaleButtons: { flexDirection: 'row', gap: 6 },
  scaleButton: {
    width: 40, height: 40, borderRadius: 20, borderWidth: 1,
    borderColor: Colors.border, alignItems: 'center', justifyContent: 'center',
    backgroundColor: Colors.background,
  },
  scaleButtonActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  scaleButtonText: { fontSize: 14, color: Colors.text },
  scaleButtonTextActive: { color: '#fff', fontWeight: '700' },
  cautionBox: {
    marginTop: Spacing.sm, padding: Spacing.sm,
    backgroundColor: '#FFF3CD', borderRadius: 8, borderLeftWidth: 3, borderLeftColor: '#FFC107',
  },
  cautionText: { fontSize: 13, color: '#856404', lineHeight: 18 },
  notesInput: {
    borderWidth: 1, borderColor: Colors.border, borderRadius: 8,
    padding: Spacing.sm, fontSize: 14, color: Colors.text,
    backgroundColor: Colors.background, textAlignVertical: 'top', marginTop: Spacing.xs,
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
  historyActivity: { fontSize: 13, color: Colors.textSecondary, marginTop: 2 },
  historyZones: { fontSize: 12, color: Colors.textMuted, marginTop: 2 },
  historyRevision: { fontSize: 11, color: Colors.textMuted, marginTop: 4 },
  emptyText: { textAlign: 'center', color: Colors.textMuted, marginTop: 40, fontSize: 15 },
  loadMoreButton: {
    marginHorizontal: Spacing.md, marginBottom: Spacing.md,
    borderWidth: 1, borderColor: Colors.primary, borderRadius: 8,
    paddingVertical: 12, alignItems: 'center',
  },
  loadMoreText: { color: Colors.primary, fontSize: 14, fontWeight: '600' },
});
