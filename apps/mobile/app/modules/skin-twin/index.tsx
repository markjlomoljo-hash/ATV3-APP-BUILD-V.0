/**
 * Skin Twin — Scenario Builder & Simulation History
 *
 * Zero-fabrication: no photorealistic future face, no guaranteed outcomes.
 * All projections are labeled "estimated". Status is honest:
 * queued_for_cloud / insufficient_data / not_configured as applicable.
 */
import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, TextInput,
  StyleSheet, Alert, ActivityIndicator, RefreshControl, Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { apiFetch, apiMutation, createMutationOperation } from '../../../src/lib/api';
import { Colors, Spacing, Typography, BorderRadius } from '../../../src/components/ui/theme';
import { Button, Card } from '../../../src/components/ui';
import {
  EstimatedProjectionVisualization,
  ObservedSkinVisualization,
} from '../../../src/components/SkinVisualization';
import { fetchLatestObservedSkin } from '../../../src/lib/faceatlas-service';
import {
  buildObservedSkinViewModel,
  buildSkinTwinProjectionViewModel,
  type ObservedSkinViewModel,
} from '../../../src/lib/faceatlas-visualization';

const API_BASE = process.env.EXPO_PUBLIC_API_BASE_URL ?? '';

type ScenarioStatus = 'insufficient_data' | 'queued_for_cloud' | 'completed' | 'failed' | 'not_configured';
type TimeWindow = '3d' | '7d' | '14d' | '30d' | 'treatment_cycle' | 'provider_review_custom';
type SkinTwinVariable =
  | 'better_sleep' | 'reduced_sleep_debt' | 'circadian_improvement' | 'lower_stress'
  | 'reduced_dairy' | 'reduced_high_glycemic' | 'reduced_sugary_processed_snacks'
  | 'hydration_improvement' | 'meal_timing_consistency' | 'routine_consistency'
  | 'product_removal' | 'product_replacement' | 'active_ingredient_pause'
  | 'active_ingredient_introduction_provider_review' | 'sunscreen_consistency'
  | 'treatment_adherence' | 'missed_dose_reduction' | 'weather_exposure_change'
  | 'reduced_contact_occlusion' | 'reduced_picking_touching' | 'cycle_context_confounder';

interface Scenario {
  id: string;
  name: string;
  window: TimeWindow;
  status: ScenarioStatus;
  variables: SkinTwinVariable[];
  confidence: string | null;
  modelVersion: string | null;
  simulation: unknown;
  uncertainty: unknown;
  sourceRecordRefs: unknown[];
  snapshotAt: string;
}

type ScreenState = 'loading' | 'ready' | 'auth_required' | 'consent_required' | 'not_configured' | 'database_unavailable';

const WINDOW_LABELS: Record<TimeWindow, string> = {
  '3d': '3 Days',
  '7d': '7 Days',
  '14d': '14 Days',
  '30d': '30 Days',
  'treatment_cycle': 'Treatment Cycle',
  'provider_review_custom': 'Provider Review (Custom)',
};

const VARIABLE_OPTIONS: ReadonlyArray<{ value: SkinTwinVariable; label: string }> = [
  { value: 'better_sleep', label: 'Better sleep' },
  { value: 'reduced_sleep_debt', label: 'Reduced sleep debt' },
  { value: 'circadian_improvement', label: 'Circadian improvement' },
  { value: 'lower_stress', label: 'Lower stress' },
  { value: 'reduced_dairy', label: 'Reduced dairy' },
  { value: 'reduced_high_glycemic', label: 'Reduced high-glycemic foods' },
  { value: 'reduced_sugary_processed_snacks', label: 'Reduced sugary/processed snacks' },
  { value: 'hydration_improvement', label: 'Hydration improvement' },
  { value: 'meal_timing_consistency', label: 'Meal timing consistency' },
  { value: 'routine_consistency', label: 'Routine consistency' },
  { value: 'product_removal', label: 'Product removal' },
  { value: 'product_replacement', label: 'Product replacement' },
  { value: 'active_ingredient_pause', label: 'Active ingredient pause' },
  { value: 'active_ingredient_introduction_provider_review', label: 'Provider-reviewed active introduction' },
  { value: 'sunscreen_consistency', label: 'Sunscreen consistency' },
  { value: 'treatment_adherence', label: 'Treatment adherence' },
  { value: 'missed_dose_reduction', label: 'Reduced missed doses' },
  { value: 'weather_exposure_change', label: 'Weather exposure change' },
  { value: 'reduced_contact_occlusion', label: 'Reduced contact/occlusion' },
  { value: 'reduced_picking_touching', label: 'Reduced picking/touching' },
  { value: 'cycle_context_confounder', label: 'Cycle context (confounder)' },
];

const STATUS_COLORS: Record<ScenarioStatus, string> = {
  completed: Colors.success,
  queued_for_cloud: Colors.warning,
  insufficient_data: Colors.info,
  failed: Colors.error,
  not_configured: Colors.textMuted,
};

function variableLabel(value: SkinTwinVariable): string {
  return VARIABLE_OPTIONS.find((option) => option.value === value)?.label ?? value.replace(/_/g, ' ');
}

export default function SkinTwinScreen() {
  const [screenState, setScreenState] = useState<ScreenState>('loading');
  const [scenarios, setScenarios] = useState<Scenario[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [observedSkin, setObservedSkin] = useState<ObservedSkinViewModel>(() => buildObservedSkinViewModel(null));
  const [showBuilder, setShowBuilder] = useState(false);
  const [building, setBuilding] = useState(false);
  // Builder form
  const [scenarioName, setScenarioName] = useState('');
  const [selectedWindow, setSelectedWindow] = useState<TimeWindow>('30d');
  const [providerReview, setProviderReview] = useState('');
  const [selectedVariables, setSelectedVariables] = useState<SkinTwinVariable[]>([]);

  const loadScenarios = useCallback(async () => {
    if (!API_BASE) { setScreenState('not_configured'); return; }
    try {
      const [payload, observed] = await Promise.all([
        apiFetch<{ ok: true; scenarios: Scenario[] }>('/api/skin-twin/scenarios'),
        fetchLatestObservedSkin().catch(() => buildObservedSkinViewModel(null)),
      ]);
      setScenarios(payload.scenarios);
      setObservedSkin(observed);
      setScreenState('ready');
    } catch (error) {
      const reason = error instanceof Error ? error.message : 'database_unavailable';
      setScreenState(reason === 'auth_required'
        ? 'auth_required'
        : reason === 'consent_required'
          ? 'consent_required'
          : 'database_unavailable');
    }
  }, []);

  useEffect(() => { void loadScenarios(); }, [loadScenarios]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadScenarios();
    setRefreshing(false);
  }, [loadScenarios]);

  const createScenario = useCallback(async () => {
    const name = scenarioName.trim();
    if (!name) { Alert.alert('Name Required', 'Please enter a scenario name.'); return; }
    if (selectedVariables.length === 0) {
      Alert.alert('Variable Required', 'Select at least one active variable for this estimated scenario.');
      return;
    }
    if (selectedWindow === 'provider_review_custom' && !providerReview.trim()) {
      Alert.alert('Provider Review Required', 'Please describe the provider review context for a custom timeline.');
      return;
    }
    if (!API_BASE) return;
    setBuilding(true);
    try {
      const body = {
        name,
        window: selectedWindow,
        variables: selectedVariables,
        sourceRecordRefs: [],
        providerReview: selectedWindow === 'provider_review_custom',
        providerReviewContext: selectedWindow === 'provider_review_custom'
          ? providerReview.trim()
          : undefined,
      };
      const payload = await apiMutation<
        { ok: true; snapshot: Scenario; projection: unknown; projectionStatus: ScenarioStatus },
        typeof body
      >('POST', '/api/skin-twin/scenarios', createMutationOperation(body));
      setScenarios(prev => [payload.snapshot, ...prev]);
      setShowBuilder(false);
      setScenarioName('');
      setProviderReview('');
      setSelectedVariables([]);
      setSelectedWindow('30d');
    } catch (error) {
      const reason = error instanceof Error ? error.message : 'unknown_error';
      Alert.alert(
        reason === 'consent_required' ? 'Consent Required' : 'Scenario not created',
        reason === 'consent_required'
          ? 'Enable personal learning consent in Profile → Privacy.'
          : reason.replace(/_/g, ' '),
      );
    } finally {
      setBuilding(false);
    }
  }, [providerReview, scenarioName, selectedVariables, selectedWindow]);

  const deleteScenario = useCallback(async (id: string) => {
    Alert.alert('Delete Scenario', 'Are you sure you want to delete this scenario?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive', onPress: async () => {
          if (!API_BASE) return;
          try {
            await apiMutation('DELETE', `/api/skin-twin/scenarios/${id}`, createMutationOperation({}));
            setScenarios(prev => prev.filter(s => s.id !== id));
          } catch (error) {
            Alert.alert('Delete failed', error instanceof Error ? error.message.replace(/_/g, ' ') : 'Please retry.');
          }
        },
      },
    ]);
  }, []);

  if (screenState === 'loading') {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.centered}>
          <ActivityIndicator color={Colors.primary} size="large" />
          <Text style={styles.loadingText}>Loading Skin Twin…</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (screenState !== 'ready') {
    const icons: Record<string, string> = { auth_required: '🔑', consent_required: '🔒', not_configured: '⚙️', database_unavailable: '⚠️' };
    const messages: Record<string, string> = {
      auth_required: 'Sign in to access Skin Twin scenarios.',
      consent_required: 'Personal learning consent is required. Enable it in Profile → Privacy.',
      not_configured: 'Skin Twin simulation requires Codex ML configuration. The scenario persistence layer is ready.',
      database_unavailable: 'Scenario persistence is temporarily unavailable.',
    };
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Text style={styles.backText}>‹ Back</Text>
          </TouchableOpacity>
          <Text style={styles.title}>Skin Twin</Text>
        </View>
        <View style={styles.centered}>
          <Text style={styles.stateIcon}>{icons[screenState] ?? '⚙️'}</Text>
          <Text style={styles.stateTitle}>{screenState.replace(/_/g, ' ')}</Text>
          <Text style={styles.stateMessage}>{messages[screenState] ?? ''}</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backText}>‹ Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Skin Twin</Text>
        <TouchableOpacity onPress={() => setShowBuilder(true)} style={styles.newBtn} accessibilityLabel="New scenario">
          <Text style={styles.newBtnText}>+ New</Text>
        </TouchableOpacity>
      </View>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* About */}
        <Card style={styles.aboutCard}>
          <Text style={styles.aboutTitle}>🧬 Skin Twin — Estimated Projections</Text>
          <Text style={styles.aboutText}>
            Skin Twin builds estimated skin models from your logs, FaceAtlas data, and treatment
            history. All projections are labeled estimated — not guaranteed outcomes. The simulation
            engine requires Codex ML configuration.
          </Text>
          <View style={styles.disclaimerRow}>
            <Text style={styles.disclaimerText}>
              ⚠️ Projections are estimates only. Not medical advice.
            </Text>
          </View>
        </Card>

        <Card style={styles.currentStateCard}>
          <ObservedSkinVisualization model={observedSkin} />
        </Card>

        {/* Scenarios */}
        <Text style={styles.sectionTitle}>Scenarios ({scenarios.length})</Text>
        {scenarios.length === 0 ? (
          <Card style={styles.emptyCard}>
            <Text style={styles.emptyIcon}>🧬</Text>
            <Text style={styles.emptyTitle}>No scenarios yet</Text>
            <Text style={styles.emptyText}>
              Create your first scenario to explore estimated skin outcomes under different conditions.
              Requires at least 7 days of logs.
            </Text>
            <Button title="Create Scenario" onPress={() => setShowBuilder(true)} style={styles.startBtn} />
          </Card>
        ) : (
          scenarios.map(scenario => (
            <Card key={scenario.id} style={styles.scenarioCard}>
              <View style={styles.scenarioHeader}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.scenarioName}>{scenario.name}</Text>
                  <Text style={styles.scenarioWindow}>{WINDOW_LABELS[scenario.window] ?? scenario.window}</Text>
                </View>
                <View style={[styles.statusBadge, { backgroundColor: STATUS_COLORS[scenario.status] + '20' }]}>
                  <Text style={[styles.statusText, { color: STATUS_COLORS[scenario.status] }]}>
                    {scenario.status.replace(/_/g, ' ')}
                  </Text>
                </View>
              </View>
              <Text style={styles.variableSummary}>
                Active variables: {scenario.variables.length > 0
                  ? scenario.variables.map(variableLabel).join(', ')
                  : 'Not recorded'}
              </Text>
              {scenario.status === 'completed' && scenario.confidence && (
                <Text style={styles.confidenceText}>Confidence: {scenario.confidence}</Text>
              )}
              {scenario.status === 'completed' && (
                <View style={styles.projectionPanel}>
                  <Text style={styles.projectionTitle}>Observed vs estimated</Text>
                  <View style={styles.comparisonRow}>
                    <View style={styles.comparisonColumn}>
                      <ObservedSkinVisualization model={observedSkin} compact />
                    </View>
                    <View style={styles.comparisonColumn}>
                      <EstimatedProjectionVisualization model={buildSkinTwinProjectionViewModel(scenario)} compact />
                    </View>
                  </View>
                  <Text style={styles.uncertaintyText}>
                    {buildSkinTwinProjectionViewModel(scenario).explanation}
                  </Text>
                  <Text style={styles.estimatedOnly}>{buildSkinTwinProjectionViewModel(scenario).disclaimer}</Text>
                </View>
              )}
              {scenario.status === 'insufficient_data' && (
                <Text style={styles.hintText}>
                  More daily logs needed. Keep logging to unlock simulation.
                </Text>
              )}
              {scenario.status === 'queued_for_cloud' && (
                <Text style={styles.hintText}>Queued for Cloud Run simulation. Check back soon.</Text>
              )}
              {scenario.modelVersion && (
                <Text style={styles.metaText}>Model: {scenario.modelVersion}</Text>
              )}
              <Text style={styles.metaText}>
                Created: {new Date(scenario.snapshotAt).toLocaleDateString()}
              </Text>
              <TouchableOpacity
                onPress={() => deleteScenario(scenario.id)}
                style={styles.deleteBtn}
                accessibilityLabel="Delete scenario"
              >
                <Text style={styles.deleteBtnText}>Delete</Text>
              </TouchableOpacity>
            </Card>
          ))
        )}
      </ScrollView>

      {/* Builder Modal */}
      <Modal visible={showBuilder} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={styles.safe}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setShowBuilder(false)}>
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>New Scenario</Text>
            <View style={{ width: 60 }} />
          </View>
          <ScrollView contentContainerStyle={styles.modalContent}>
            <Text style={styles.fieldLabel}>Scenario Name *</Text>
            <TextInput
              style={styles.textInput}
              value={scenarioName}
              onChangeText={setScenarioName}
              placeholder="e.g. Retinoid introduction — 90 days"
              placeholderTextColor={Colors.textMuted}
              maxLength={120}
              accessibilityLabel="Scenario name"
            />
            <Text style={styles.fieldLabel}>Time Window *</Text>
            <View style={styles.windowGrid}>
              {(Object.keys(WINDOW_LABELS) as TimeWindow[]).map(w => (
                <TouchableOpacity
                  key={w}
                  onPress={() => setSelectedWindow(w)}
                  style={[styles.windowChip, selectedWindow === w && styles.windowChipSelected]}
                  accessibilityLabel={WINDOW_LABELS[w]}
                  accessibilityState={{ selected: selectedWindow === w }}
                >
                  <Text style={[styles.windowChipText, selectedWindow === w && styles.windowChipTextSelected]}>
                    {WINDOW_LABELS[w]}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            <Text style={styles.fieldLabel}>Active Variables * (1–8)</Text>
            <Text style={styles.helperText}>
              Select only changes you actually want to compare. These are scenario assumptions, not observed outcomes.
            </Text>
            <View style={styles.variableGrid}>
              {VARIABLE_OPTIONS.map((option) => {
                const selected = selectedVariables.includes(option.value);
                return (
                  <TouchableOpacity
                    key={option.value}
                    onPress={() => {
                      setSelectedVariables((current) => {
                        if (selected) return current.filter((value) => value !== option.value);
                        if (current.length >= 8) {
                          Alert.alert('Maximum selected', 'A scenario can compare up to 8 active variables.');
                          return current;
                        }
                        return [...current, option.value];
                      });
                    }}
                    style={[styles.variableChip, selected && styles.variableChipSelected]}
                    accessibilityRole="checkbox"
                    accessibilityState={{ checked: selected }}
                  >
                    <Text style={[styles.variableChipText, selected && styles.variableChipTextSelected]}>
                      {option.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
            {selectedWindow === 'provider_review_custom' && (
              <>
                <Text style={styles.fieldLabel}>Provider Review Context *</Text>
                <TextInput
                  style={[styles.textInput, styles.textArea]}
                  value={providerReview}
                  onChangeText={setProviderReview}
                  placeholder="Describe the provider review context…"
                  placeholderTextColor={Colors.textMuted}
                  multiline
                  numberOfLines={4}
                  maxLength={500}
                  accessibilityLabel="Provider review context"
                />
              </>
            )}
            <View style={styles.estimatedNotice}>
              <Text style={styles.estimatedText}>
                🔬 All projections are estimated based on your historical data.
                Not a medical prediction or guaranteed outcome.
              </Text>
            </View>
            <Button
              title={building ? 'Creating…' : 'Create Scenario'}
              onPress={createScenario}
              loading={building}
              disabled={building}
              style={styles.createBtn}
            />
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md,
    backgroundColor: Colors.surface, borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  backBtn: { paddingRight: Spacing.sm },
  backText: { ...Typography.bodyMedium, color: Colors.primary },
  title: { ...Typography.title3, color: Colors.textPrimary, flex: 1, textAlign: 'center' },
  newBtn: { paddingLeft: Spacing.sm },
  newBtnText: { ...Typography.bodyMedium, color: Colors.primary },
  content: { padding: Spacing.lg, paddingBottom: Spacing.xxl },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: Spacing.xl },
  loadingText: { ...Typography.body, color: Colors.textSecondary, marginTop: Spacing.md },
  stateIcon: { fontSize: 48, marginBottom: Spacing.lg },
  stateTitle: { ...Typography.title3, color: Colors.textPrimary, marginBottom: Spacing.sm, textTransform: 'capitalize' },
  stateMessage: { ...Typography.body, color: Colors.textSecondary, textAlign: 'center', lineHeight: 22, maxWidth: 320 },
  aboutCard: { marginBottom: Spacing.lg },
  currentStateCard: { marginBottom: Spacing.lg },
  aboutTitle: { ...Typography.bodyMedium, color: Colors.textPrimary, marginBottom: 6 },
  aboutText: { ...Typography.caption, color: Colors.textSecondary, lineHeight: 18, marginBottom: Spacing.sm },
  disclaimerRow: { backgroundColor: '#fef3c7', borderRadius: BorderRadius.sm, padding: Spacing.sm },
  disclaimerText: { ...Typography.caption, color: '#92400e' },
  sectionTitle: { ...Typography.title3, color: Colors.textPrimary, marginBottom: Spacing.md },
  emptyCard: { alignItems: 'center', padding: Spacing.xl },
  emptyIcon: { fontSize: 40, marginBottom: Spacing.md },
  emptyTitle: { ...Typography.bodyMedium, color: Colors.textPrimary, marginBottom: 6 },
  emptyText: { ...Typography.caption, color: Colors.textSecondary, textAlign: 'center', lineHeight: 18, marginBottom: Spacing.lg },
  startBtn: { minWidth: 180 },
  scenarioCard: { marginBottom: Spacing.md },
  scenarioHeader: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: Spacing.sm },
  scenarioName: { ...Typography.bodyMedium, color: Colors.textPrimary },
  scenarioWindow: { ...Typography.caption, color: Colors.textMuted, marginTop: 2 },
  statusBadge: { borderRadius: BorderRadius.sm, paddingHorizontal: 8, paddingVertical: 3 },
  statusText: { ...Typography.caption, fontWeight: '600', textTransform: 'capitalize' },
  confidenceText: { ...Typography.caption, color: Colors.primary, marginBottom: 4 },
  variableSummary: { ...Typography.caption, color: Colors.textSecondary, lineHeight: 18, marginBottom: Spacing.sm },
  projectionPanel: { padding: Spacing.md, borderRadius: BorderRadius.md, backgroundColor: Colors.primaryLight, marginVertical: Spacing.sm },
  projectionTitle: { ...Typography.bodyMedium, color: Colors.primaryDark, marginBottom: Spacing.sm },
  comparisonRow: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.sm },
  comparisonColumn: { flex: 1, minWidth: 0 },
  projectionRow: { flexDirection: 'row', justifyContent: 'space-between', gap: Spacing.sm, marginBottom: 6 },
  projectionLabel: { ...Typography.caption, color: Colors.textSecondary, textTransform: 'capitalize', flex: 1 },
  projectionValue: { ...Typography.caption, color: Colors.textPrimary, fontWeight: '600', flex: 1, textAlign: 'right' },
  uncertaintyText: { ...Typography.caption, color: Colors.textMuted, marginTop: 4 },
  estimatedOnly: { ...Typography.caption, color: Colors.primaryDark, fontStyle: 'italic', marginTop: Spacing.sm },
  hintText: { ...Typography.caption, color: Colors.textSecondary, lineHeight: 18, marginBottom: 4 },
  metaText: { ...Typography.caption, color: Colors.textMuted, marginTop: 2 },
  deleteBtn: { marginTop: Spacing.sm, alignSelf: 'flex-start' },
  deleteBtnText: { ...Typography.caption, color: Colors.error },
  modalHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md,
    borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  cancelText: { ...Typography.bodyMedium, color: Colors.primary },
  modalTitle: { ...Typography.title3, color: Colors.textPrimary },
  modalContent: { padding: Spacing.lg, paddingBottom: Spacing.xxl },
  fieldLabel: { ...Typography.bodyMedium, color: Colors.textPrimary, marginBottom: Spacing.sm, marginTop: Spacing.md },
  textInput: {
    ...Typography.body, color: Colors.textPrimary,
    backgroundColor: Colors.surface, borderRadius: BorderRadius.md,
    borderWidth: 1, borderColor: Colors.border,
    paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, minHeight: 44,
  },
  textArea: { minHeight: 100, textAlignVertical: 'top' },
  windowGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  windowChip: {
    paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full, borderWidth: 1, borderColor: Colors.border,
    backgroundColor: Colors.surface,
  },
  windowChipSelected: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  windowChipText: { ...Typography.caption, color: Colors.textSecondary },
  windowChipTextSelected: { color: '#fff', fontWeight: '600' },
  helperText: { ...Typography.caption, color: Colors.textMuted, lineHeight: 18, marginBottom: Spacing.sm },
  variableGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  variableChip: { paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, borderRadius: BorderRadius.md, borderWidth: 1, borderColor: Colors.border, backgroundColor: Colors.surface },
  variableChipSelected: { borderColor: Colors.primary, backgroundColor: Colors.primaryLight },
  variableChipText: { ...Typography.caption, color: Colors.textSecondary },
  variableChipTextSelected: { color: Colors.primary, fontWeight: '700' },
  estimatedNotice: {
    backgroundColor: '#eff6ff', borderRadius: BorderRadius.md, padding: Spacing.md,
    marginTop: Spacing.lg,
  },
  estimatedText: { ...Typography.caption, color: '#1d4ed8', lineHeight: 18 },
  createBtn: { marginTop: Spacing.xl },
});
