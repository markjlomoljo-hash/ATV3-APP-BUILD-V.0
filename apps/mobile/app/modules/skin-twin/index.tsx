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
import * as Crypto from 'expo-crypto';
import { supabase } from '../../../src/lib/supabase';
import { Colors, Spacing, Typography, BorderRadius } from '../../../src/components/ui/theme';
import { Button, Card } from '../../../src/components/ui';

const API_BASE = process.env.EXPO_PUBLIC_API_BASE_URL ?? '';

type ScenarioStatus = 'insufficient_data' | 'queued_for_cloud' | 'completed' | 'failed' | 'not_configured';
type TimeWindow = '7d' | '30d' | '90d' | '6m' | '1y' | 'provider_review_custom';

interface Scenario {
  id: string;
  name: string;
  window: TimeWindow;
  status: ScenarioStatus;
  confidence: string | null;
  modelVersion: string | null;
  simulation: unknown;
  uncertainty: unknown;
  snapshotAt: string;
}

type ScreenState = 'loading' | 'ready' | 'auth_required' | 'consent_required' | 'not_configured' | 'database_unavailable';

const WINDOW_LABELS: Record<TimeWindow, string> = {
  '7d': '7 Days',
  '30d': '30 Days',
  '90d': '90 Days',
  '6m': '6 Months',
  '1y': '1 Year',
  'provider_review_custom': 'Provider Review (Custom)',
};

const STATUS_COLORS: Record<ScenarioStatus, string> = {
  completed: Colors.success,
  queued_for_cloud: Colors.warning,
  insufficient_data: Colors.info,
  failed: Colors.error,
  not_configured: Colors.textMuted,
};

function getAccessToken(): Promise<string | null> {
  return supabase.auth.getSession().then(({ data }) => data.session?.access_token ?? null);
}

function generateIdempotencyKey(): string {
  return `skin-twin-${Crypto.randomUUID()}`;
}

export default function SkinTwinScreen() {
  const [screenState, setScreenState] = useState<ScreenState>('loading');
  const [scenarios, setScenarios] = useState<Scenario[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [showBuilder, setShowBuilder] = useState(false);
  const [building, setBuilding] = useState(false);
  // Builder form
  const [scenarioName, setScenarioName] = useState('');
  const [selectedWindow, setSelectedWindow] = useState<TimeWindow>('30d');
  const [providerReview, setProviderReview] = useState('');

  const loadScenarios = useCallback(async () => {
    const token = await getAccessToken();
    if (!token) { setScreenState('auth_required'); return; }
    if (!API_BASE) { setScreenState('not_configured'); return; }
    try {
      const res = await fetch(`${API_BASE}/api/skin-twin/scenarios`, {
        headers: { authorization: `Bearer ${token}` },
      });
      if (res.status === 403) { setScreenState('consent_required'); return; }
      if (res.status === 503) { setScreenState('database_unavailable'); return; }
      if (!res.ok) { setScreenState('not_configured'); return; }
      const payload = await res.json() as { scenarios?: Scenario[] };
      setScenarios(payload.scenarios ?? []);
      setScreenState('ready');
    } catch {
      setScreenState('database_unavailable');
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
    if (selectedWindow === 'provider_review_custom' && !providerReview.trim()) {
      Alert.alert('Provider Review Required', 'Please describe the provider review context for a custom timeline.');
      return;
    }
    const token = await getAccessToken();
    if (!token || !API_BASE) return;
    setBuilding(true);
    try {
      const body: Record<string, unknown> = {
        scenario: name,
        window: selectedWindow,
        idempotencyKey: generateIdempotencyKey(),
      };
      if (selectedWindow === 'provider_review_custom') {
        body.providerReview = { context: providerReview.trim() };
      }
      const res = await fetch(`${API_BASE}/api/skin-twin/scenarios`, {
        method: 'POST',
        headers: {
          authorization: `Bearer ${token}`,
          'content-type': 'application/json',
          'idempotency-key': body.idempotencyKey as string,
        },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'unknown' })) as { error?: string };
        if (err.error === 'consent_required') {
          Alert.alert('Consent Required', 'Enable personal learning consent in Profile → Privacy.');
        } else if (err.error === 'insufficient_data') {
          Alert.alert('Insufficient Data', 'More skin logs are needed before a Skin Twin scenario can be created. Keep logging daily.');
        } else {
          Alert.alert('Error', 'Could not create scenario. Please try again.');
        }
        return;
      }
      const payload = await res.json() as { scenario?: Scenario };
      if (payload.scenario) {
        setScenarios(prev => [payload.scenario!, ...prev]);
      }
      setShowBuilder(false);
      setScenarioName('');
      setProviderReview('');
      setSelectedWindow('30d');
    } catch {
      Alert.alert('Error', 'Could not create scenario. Please try again.');
    } finally {
      setBuilding(false);
    }
  }, [scenarioName, selectedWindow, providerReview]);

  const deleteScenario = useCallback(async (id: string) => {
    Alert.alert('Delete Scenario', 'Are you sure you want to delete this scenario?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive', onPress: async () => {
          const token = await getAccessToken();
          if (!token || !API_BASE) return;
          try {
            await fetch(`${API_BASE}/api/skin-twin/scenarios/${id}`, {
              method: 'DELETE',
              headers: { authorization: `Bearer ${token}` },
            });
            setScenarios(prev => prev.filter(s => s.id !== id));
          } catch {
            Alert.alert('Error', 'Could not delete scenario.');
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
              {scenario.status === 'completed' && scenario.confidence && (
                <Text style={styles.confidenceText}>Confidence: {scenario.confidence}</Text>
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
  estimatedNotice: {
    backgroundColor: '#eff6ff', borderRadius: BorderRadius.md, padding: Spacing.md,
    marginTop: Spacing.lg,
  },
  estimatedText: { ...Typography.caption, color: '#1d4ed8', lineHeight: 18 },
  createBtn: { marginTop: Spacing.xl },
});
