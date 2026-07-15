/**
 * Treatment Plan Center — Protocol Builder, Check-in, Adherence
 */
import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, Switch,
  StyleSheet, Alert, ActivityIndicator, RefreshControl,
  TextInput, Platform, KeyboardAvoidingView, Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import {
  fetchTreatmentPlans, createTreatmentPlan, updateTreatmentPlan, deleteTreatmentPlan,
  fetchCheckinForDate, upsertCheckin, fetchCheckinHistory,
  COMMON_TREATMENTS, STATUS_COLORS, STATUS_LABELS,
  TreatmentPlan, TreatmentCheckin, TreatmentStep, ScheduleSlot,
} from '../../../src/lib/treatment-service';
import { Colors, Spacing } from '../../../src/components/ui/theme';

function getLocalDate(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

type View_ = 'plans' | 'checkin' | 'builder' | 'history';

export default function TreatmentScreen() {
  const [view, setView] = useState<View_>('plans');
  const [plans, setPlans] = useState<TreatmentPlan[]>([]);
  const [selectedPlan, setSelectedPlan] = useState<TreatmentPlan | null>(null);
  const [checkin, setCheckin] = useState<TreatmentCheckin | null>(null);
  const [checkinHistory, setCheckinHistory] = useState<TreatmentCheckin[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [activeDate] = useState(getLocalDate());

  // Check-in form
  const [checkinStatus, setCheckinStatus] = useState<TreatmentCheckin['status']>('completed');
  const [checkinIrritation, setCheckinIrritation] = useState<number | null>(null);
  const [checkinNotes, setCheckinNotes] = useState('');

  // Builder form
  const [builderTitle, setBuilderTitle] = useState('');
  const [builderDescription, setBuilderDescription] = useState('');
  const [builderSlots, setBuilderSlots] = useState<ScheduleSlot[]>([
    { time: 'morning', steps: [] },
    { time: 'evening', steps: [] },
  ]);

  const loadPlans = useCallback(async () => {
    try {
      const data = await fetchTreatmentPlans();
      setPlans(data);
    } catch (e) {
      console.error('Failed to load plans:', e);
    }
  }, []);

  useEffect(() => {
    (async () => {
      setLoading(true);
      await loadPlans();
      setLoading(false);
    })();
  }, [loadPlans]);

  const openCheckin = async (plan: TreatmentPlan) => {
    setSelectedPlan(plan);
    setSaving(true);
    try {
      const existing = await fetchCheckinForDate(plan.id, activeDate);
      setCheckin(existing);
      if (existing) {
        setCheckinStatus(existing.status);
        setCheckinIrritation(existing.irritation);
        setCheckinNotes(existing.notes ?? '');
      } else {
        setCheckinStatus('completed');
        setCheckinIrritation(null);
        setCheckinNotes('');
      }
      const history = await fetchCheckinHistory(plan.id, 30);
      setCheckinHistory(history);
    } catch (e) {
      console.error('Failed to load checkin:', e);
    } finally {
      setSaving(false);
    }
    setView('checkin');
  };

  const handleSaveCheckin = async () => {
    if (!selectedPlan) return;
    setSaving(true);
    try {
      const saved = await upsertCheckin(selectedPlan.id, activeDate, {
        status: checkinStatus,
        irritation: checkinIrritation,
        notes: checkinNotes || null,
      });
      setCheckin(saved);
      await loadPlans();
      Alert.alert('Saved', 'Check-in recorded.');
    } catch (e) {
      console.error('Checkin save failed:', e);
      Alert.alert('Error', 'Failed to save check-in.');
    } finally {
      setSaving(false);
    }
  };

  const handleCreatePlan = async () => {
    if (!builderTitle.trim()) {
      Alert.alert('Required', 'Please enter a plan title.');
      return;
    }
    const hasSteps = builderSlots.some(slot => slot.steps.length > 0);
    if (!hasSteps) {
      Alert.alert('Required', 'Please add at least one step to your protocol.');
      return;
    }
    setSaving(true);
    try {
      await createTreatmentPlan({
        title: builderTitle.trim(),
        description: builderDescription.trim() || undefined,
        schedule: {
          slots: builderSlots.filter(s => s.steps.length > 0),
          frequency: 'daily',
        },
      });
      await loadPlans();
      setBuilderTitle('');
      setBuilderDescription('');
      setBuilderSlots([{ time: 'morning', steps: [] }, { time: 'evening', steps: [] }]);
      setView('plans');
      Alert.alert('Created', 'Treatment plan created successfully.');
    } catch (e) {
      console.error('Create plan failed:', e);
      Alert.alert('Error', 'Failed to create plan.');
    } finally {
      setSaving(false);
    }
  };

  const handleDeletePlan = (plan: TreatmentPlan) => {
    Alert.alert('Delete Plan', `Delete "${plan.title}"? This cannot be undone.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive',
        onPress: async () => {
          try {
            await deleteTreatmentPlan(plan.id);
            await loadPlans();
          } catch (e) {
            Alert.alert('Error', 'Failed to delete plan.');
          }
        },
      },
    ]);
  };

  const addStepToSlot = (slotIndex: number, treatmentId: string) => {
    const treatment = COMMON_TREATMENTS.find(t => t.id === treatmentId);
    if (!treatment) return;
    const newStep: TreatmentStep = {
      id: `${treatmentId}-${Date.now()}`,
      name: treatment.name,
      required: true,
    };
    setBuilderSlots(prev => prev.map((slot, i) =>
      i === slotIndex ? { ...slot, steps: [...slot.steps, newStep] } : slot
    ));
  };

  const removeStepFromSlot = (slotIndex: number, stepId: string) => {
    setBuilderSlots(prev => prev.map((slot, i) =>
      i === slotIndex ? { ...slot, steps: slot.steps.filter(s => s.id !== stepId) } : slot
    ));
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadPlans();
    setRefreshing(false);
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
        <TouchableOpacity onPress={() => view === 'plans' ? router.back() : setView('plans')}>
          <Text style={styles.backButton}>{view === 'plans' ? '← Back' : '← Plans'}</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          {view === 'plans' ? 'Treatment Plans' : view === 'checkin' ? 'Daily Check-in' : view === 'builder' ? 'Build Protocol' : 'History'}
        </Text>
        {view === 'plans' && (
          <TouchableOpacity onPress={() => setView('builder')}>
            <Text style={styles.addLink}>+ New</Text>
          </TouchableOpacity>
        )}
        {view !== 'plans' && <View style={{ width: 60 }} />}
      </View>

      {/* Plans List */}
      {view === 'plans' && (
        <ScrollView style={styles.scroll} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}>
          {plans.length === 0 && (
            <View style={styles.emptyState}>
              <Text style={styles.emptyTitle}>No Treatment Plans</Text>
              <Text style={styles.emptySubtitle}>Build your first skincare protocol to start tracking adherence.</Text>
              <TouchableOpacity style={styles.emptyButton} onPress={() => setView('builder')}>
                <Text style={styles.emptyButtonText}>Build Protocol</Text>
              </TouchableOpacity>
            </View>
          )}
          {plans.map(plan => (
            <View key={plan.id} style={styles.planCard}>
              <View style={styles.planCardHeader}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.planTitle}>{plan.title}</Text>
                  <Text style={styles.planStatus}>
                    {plan.status.toUpperCase()} · {plan.adherence_pct}% adherence
                  </Text>
                </View>
                <View style={[styles.statusDot, { backgroundColor: plan.status === 'active' ? Colors.success : Colors.textMuted }]} />
              </View>
              {plan.description && <Text style={styles.planDescription}>{plan.description}</Text>}
              <View style={styles.planSlots}>
                {(plan.schedule?.slots ?? []).map((slot, i) => (
                  <Text key={i} style={styles.planSlot}>
                    {slot.time === 'morning' ? '☀️' : '🌙'} {slot.time}: {slot.steps.length} steps
                  </Text>
                ))}
              </View>
              <View style={styles.planActions}>
                <TouchableOpacity style={styles.checkinButton} onPress={() => openCheckin(plan)}>
                  <Text style={styles.checkinButtonText}>Check In Today</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.historyButton} onPress={async () => {
                  setSelectedPlan(plan);
                  const history = await fetchCheckinHistory(plan.id, 30);
                  setCheckinHistory(history);
                  setView('history');
                }}>
                  <Text style={styles.historyButtonText}>History</Text>
                </TouchableOpacity>
                {plan.status !== 'abandoned' && (
                  <TouchableOpacity onPress={() => handleDeletePlan(plan)}>
                    <Text style={styles.deleteText}>Delete</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          ))}
          <View style={{ height: 40 }} />
        </ScrollView>
      )}

      {/* Check-in View */}
      {view === 'checkin' && selectedPlan && (
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <ScrollView style={styles.scroll} keyboardShouldPersistTaps="handled">
            <View style={styles.checkinHeader}>
              <Text style={styles.checkinPlanTitle}>{selectedPlan.title}</Text>
              <Text style={styles.checkinDate}>{activeDate}</Text>
              {checkin && <Text style={styles.savedBadge}>✓ Saved</Text>}
            </View>

            {/* Protocol steps */}
            {(selectedPlan.schedule?.slots ?? []).map((slot, i) => (
              <View key={i} style={styles.section}>
                <Text style={styles.sectionTitle}>
                  {slot.time === 'morning' ? '☀️ Morning' : slot.time === 'evening' ? '🌙 Evening' : slot.time} Protocol
                </Text>
                {slot.steps.map(step => (
                  <View key={step.id} style={styles.stepRow}>
                    <View style={styles.stepBullet} />
                    <Text style={styles.stepName}>{step.name}</Text>
                    {step.required && <Text style={styles.requiredBadge}>Required</Text>}
                  </View>
                ))}
              </View>
            ))}

            {/* Status */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Today's Status</Text>
              <View style={styles.statusRow}>
                {(['completed', 'partial', 'skipped', 'missed'] as const).map(s => (
                  <TouchableOpacity
                    key={s}
                    style={[styles.statusButton, checkinStatus === s && { backgroundColor: STATUS_COLORS[s] }]}
                    onPress={() => setCheckinStatus(s)}
                  >
                    <Text style={[styles.statusButtonText, checkinStatus === s && { color: '#fff' }]}>
                      {STATUS_LABELS[s]}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Irritation */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Irritation Level (0-10, optional)</Text>
              <View style={styles.scaleRow}>
                {[null, 0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(n => (
                  <TouchableOpacity
                    key={n === null ? 'none' : n}
                    style={[styles.scaleButton, checkinIrritation === n && styles.scaleButtonActive]}
                    onPress={() => setCheckinIrritation(n)}
                  >
                    <Text style={[styles.scaleButtonText, checkinIrritation === n && styles.scaleButtonTextActive]}>
                      {n === null ? '—' : n}
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
                value={checkinNotes}
                onChangeText={setCheckinNotes}
                placeholder="Any observations..."
                multiline
                numberOfLines={3}
              />
            </View>

            {/* Save */}
            <TouchableOpacity
              style={[styles.saveButton, saving && styles.saveButtonDisabled]}
              onPress={handleSaveCheckin}
              disabled={saving}
            >
              {saving ? <ActivityIndicator color="#fff" /> : (
                <Text style={styles.saveButtonText}>{checkin ? 'Update Check-in' : 'Save Check-in'}</Text>
              )}
            </TouchableOpacity>

            <View style={{ height: 40 }} />
          </ScrollView>
        </KeyboardAvoidingView>
      )}

      {/* History View */}
      {view === 'history' && selectedPlan && (
        <ScrollView style={styles.scroll}>
          <Text style={styles.historyTitle}>{selectedPlan.title} — Check-in History</Text>
          <Text style={styles.adherenceLabel}>
            Overall Adherence: {selectedPlan.adherence_pct}%
          </Text>
          {checkinHistory.length === 0 && <Text style={styles.emptyText}>No check-ins recorded yet.</Text>}
          {checkinHistory.map(entry => (
            <View key={entry.id} style={[styles.historyCard, { borderLeftColor: STATUS_COLORS[entry.status] }]}>
              <Text style={styles.historyDate}>{entry.checkin_date}</Text>
              <Text style={[styles.historyStatus, { color: STATUS_COLORS[entry.status] }]}>
                {STATUS_LABELS[entry.status]}
              </Text>
              {entry.irritation != null && <Text style={styles.historyDetail}>Irritation: {entry.irritation}/10</Text>}
              {entry.notes && <Text style={styles.historyDetail}>{entry.notes}</Text>}
            </View>
          ))}
          <View style={{ height: 40 }} />
        </ScrollView>
      )}

      {/* Builder View */}
      {view === 'builder' && (
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <ScrollView style={styles.scroll} keyboardShouldPersistTaps="handled">
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Plan Name</Text>
              <TextInput
                style={styles.inputField}
                value={builderTitle}
                onChangeText={setBuilderTitle}
                placeholder="e.g. AM/PM Acne Protocol"
              />
            </View>
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Description (optional)</Text>
              <TextInput
                style={styles.notesInput}
                value={builderDescription}
                onChangeText={setBuilderDescription}
                placeholder="What is this protocol for?"
                multiline
                numberOfLines={2}
              />
            </View>

            {builderSlots.map((slot, slotIndex) => (
              <View key={slotIndex} style={styles.section}>
                <Text style={styles.sectionTitle}>
                  {slot.time === 'morning' ? '☀️ Morning' : '🌙 Evening'} Steps
                </Text>
                {slot.steps.map(step => (
                  <View key={step.id} style={styles.builderStepRow}>
                    <Text style={styles.builderStepName}>{step.name}</Text>
                    <TouchableOpacity onPress={() => removeStepFromSlot(slotIndex, step.id)}>
                      <Text style={styles.removeStep}>✕</Text>
                    </TouchableOpacity>
                  </View>
                ))}
                <Text style={styles.addStepLabel}>Add step:</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  <View style={styles.treatmentChips}>
                    {COMMON_TREATMENTS.filter(t => !slot.steps.some(s => s.id.startsWith(t.id))).map(t => (
                      <TouchableOpacity
                        key={t.id}
                        style={styles.treatmentChip}
                        onPress={() => addStepToSlot(slotIndex, t.id)}
                      >
                        <Text style={styles.treatmentChipText}>+ {t.name}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </ScrollView>
              </View>
            ))}

            <TouchableOpacity
              style={[styles.saveButton, saving && styles.saveButtonDisabled]}
              onPress={handleCreatePlan}
              disabled={saving}
            >
              {saving ? <ActivityIndicator color="#fff" /> : (
                <Text style={styles.saveButtonText}>Create Treatment Plan</Text>
              )}
            </TouchableOpacity>

            <View style={{ height: 40 }} />
          </ScrollView>
        </KeyboardAvoidingView>
      )}
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
  addLink: { fontSize: 15, color: Colors.primary, fontWeight: '600' },
  scroll: { flex: 1 },
  section: {
    marginHorizontal: Spacing.md, marginTop: Spacing.md,
    backgroundColor: Colors.surface, borderRadius: 12, padding: Spacing.md,
  },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: Colors.text, marginBottom: Spacing.xs },
  planCard: {
    marginHorizontal: Spacing.md, marginTop: Spacing.md,
    backgroundColor: Colors.surface, borderRadius: 12, padding: Spacing.md,
  },
  planCardHeader: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 4 },
  planTitle: { fontSize: 16, fontWeight: '700', color: Colors.text },
  planStatus: { fontSize: 12, color: Colors.textMuted, marginTop: 2 },
  statusDot: { width: 10, height: 10, borderRadius: 5, marginTop: 4 },
  planDescription: { fontSize: 13, color: Colors.textSecondary, marginBottom: 6 },
  planSlots: { marginBottom: 8 },
  planSlot: { fontSize: 13, color: Colors.textSecondary, marginBottom: 2 },
  planActions: { flexDirection: 'row', gap: 8, marginTop: 4, alignItems: 'center' },
  checkinButton: {
    flex: 1, backgroundColor: Colors.primary, borderRadius: 8,
    paddingVertical: 8, alignItems: 'center',
  },
  checkinButtonText: { color: '#fff', fontSize: 13, fontWeight: '700' },
  historyButton: {
    paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8,
    borderWidth: 1, borderColor: Colors.primary,
  },
  historyButtonText: { color: Colors.primary, fontSize: 13, fontWeight: '600' },
  deleteText: { fontSize: 12, color: '#D32F2F', fontWeight: '600' },
  emptyState: { alignItems: 'center', paddingTop: 60, paddingHorizontal: Spacing.xl },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: Colors.text, marginBottom: 8 },
  emptySubtitle: { fontSize: 14, color: Colors.textMuted, textAlign: 'center', marginBottom: 24 },
  emptyButton: { backgroundColor: Colors.primary, borderRadius: 12, paddingHorizontal: 24, paddingVertical: 12 },
  emptyButtonText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  emptyText: { textAlign: 'center', color: Colors.textMuted, marginTop: 40, fontSize: 14 },
  checkinHeader: { padding: Spacing.md, alignItems: 'center' },
  checkinPlanTitle: { fontSize: 17, fontWeight: '700', color: Colors.text },
  checkinDate: { fontSize: 13, color: Colors.textMuted, marginTop: 2 },
  savedBadge: { fontSize: 12, color: Colors.success, marginTop: 4 },
  stepRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
  stepBullet: { width: 6, height: 6, borderRadius: 3, backgroundColor: Colors.primary, marginRight: 8 },
  stepName: { fontSize: 14, color: Colors.text, flex: 1 },
  requiredBadge: { fontSize: 10, color: Colors.primary, fontWeight: '600' },
  statusRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  statusButton: {
    flex: 1, paddingVertical: 10, borderRadius: 8, alignItems: 'center',
    borderWidth: 1, borderColor: Colors.border, backgroundColor: Colors.background,
    minWidth: 70,
  },
  statusButtonText: { fontSize: 12, fontWeight: '600', color: Colors.text },
  scaleRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  scaleButton: {
    width: 36, height: 36, borderRadius: 18, borderWidth: 1,
    borderColor: Colors.border, alignItems: 'center', justifyContent: 'center',
    backgroundColor: Colors.background,
  },
  scaleButtonActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  scaleButtonText: { fontSize: 12, color: Colors.text },
  scaleButtonTextActive: { color: '#fff', fontWeight: '700' },
  notesInput: {
    borderWidth: 1, borderColor: Colors.border, borderRadius: 8,
    padding: Spacing.sm, fontSize: 14, color: Colors.text,
    backgroundColor: Colors.background, textAlignVertical: 'top',
  },
  inputField: {
    borderWidth: 1, borderColor: Colors.border, borderRadius: 8,
    padding: Spacing.sm, fontSize: 16, color: Colors.text, backgroundColor: Colors.background,
  },
  saveButton: {
    marginHorizontal: Spacing.md, marginTop: Spacing.md,
    backgroundColor: Colors.primary, borderRadius: 12,
    paddingVertical: 16, alignItems: 'center',
  },
  saveButtonDisabled: { opacity: 0.6 },
  saveButtonText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  historyTitle: { fontSize: 16, fontWeight: '700', color: Colors.text, padding: Spacing.md },
  adherenceLabel: { fontSize: 14, color: Colors.primary, fontWeight: '600', paddingHorizontal: Spacing.md, marginBottom: Spacing.sm },
  historyCard: {
    marginHorizontal: Spacing.md, marginBottom: Spacing.sm,
    backgroundColor: Colors.surface, borderRadius: 12, padding: Spacing.md,
    borderLeftWidth: 4,
  },
  historyDate: { fontSize: 14, fontWeight: '700', color: Colors.text },
  historyStatus: { fontSize: 13, fontWeight: '600', marginTop: 2 },
  historyDetail: { fontSize: 13, color: Colors.textSecondary, marginTop: 2 },
  builderStepRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  builderStepName: { fontSize: 14, color: Colors.text, flex: 1 },
  removeStep: { fontSize: 16, color: '#D32F2F', paddingHorizontal: 8 },
  addStepLabel: { fontSize: 13, color: Colors.textMuted, marginTop: Spacing.sm, marginBottom: 6 },
  treatmentChips: { flexDirection: 'row', gap: 8, paddingBottom: 4 },
  treatmentChip: {
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20,
    borderWidth: 1, borderColor: Colors.primary, backgroundColor: Colors.primary + '10',
  },
  treatmentChipText: { fontSize: 12, color: Colors.primary, fontWeight: '600' },
});
