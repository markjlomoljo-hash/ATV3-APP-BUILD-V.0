/**
 * TriggerGraph & ClearPath Forecast
 *
 * Zero-fabrication: no fake trigger causes, no fabricated forecasts.
 * Shows real hypotheses from the database or honest insufficient_data state.
 * Forecast section shows queued_for_cloud / not_configured as applicable.
 */
import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, ActivityIndicator, RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { supabase } from '../../../src/lib/supabase';
import { Colors, Spacing, Typography, BorderRadius } from '../../../src/components/ui/theme';
import { Button, Card } from '../../../src/components/ui';

const API_BASE = process.env.EXPO_PUBLIC_API_BASE_URL ?? '';

type ConfidenceLevel = 'insufficient_data' | 'early_hypothesis' | 'moderate_confidence' | 'high_confidence';
type ForecastStatus = 'queued_for_cloud' | 'processing' | 'completed' | 'insufficient_data' | 'not_configured' | 'failed';

interface TriggerHypothesis {
  id: string;
  triggerType: string;
  hypothesis: string;
  confidence: ConfidenceLevel;
  evidenceCount: number;
  lastUpdated: string;
  status: string;
}

interface ForecastSummary {
  id: string;
  forecastDate: string;
  status: ForecastStatus;
  predictedSeverity: number | null;
  confidence: ConfidenceLevel | null;
  modelVersion: string | null;
  factors: string[];
  createdAt: string;
}

type ScreenState = 'loading' | 'ready' | 'auth_required' | 'not_configured' | 'database_unavailable';

const CONFIDENCE_COLORS: Record<ConfidenceLevel, string> = {
  high_confidence: Colors.success,
  moderate_confidence: Colors.warning,
  early_hypothesis: Colors.info,
  insufficient_data: Colors.textMuted,
};

const CONFIDENCE_LABELS: Record<ConfidenceLevel, string> = {
  high_confidence: 'High Confidence',
  moderate_confidence: 'Moderate',
  early_hypothesis: 'Early Hypothesis',
  insufficient_data: 'Insufficient Data',
};

function getAccessToken(): Promise<string | null> {
  return supabase.auth.getSession().then(({ data }) => data.session?.access_token ?? null);
}

export default function TriggersScreen() {
  const [screenState, setScreenState] = useState<ScreenState>('loading');
  const [hypotheses, setHypotheses] = useState<TriggerHypothesis[]>([]);
  const [forecasts, setForecasts] = useState<ForecastSummary[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<'triggers' | 'forecast'>('triggers');

  const loadData = useCallback(async () => {
    const token = await getAccessToken();
    if (!token) { setScreenState('auth_required'); return; }
    if (!API_BASE) { setScreenState('not_configured'); return; }
    try {
      // Load trigger hypotheses
      const [trigRes, forecastRes] = await Promise.all([
        fetch(`${API_BASE}/api/patterns/summary`, {
          headers: { authorization: `Bearer ${token}` },
        }).catch(() => null),
        fetch(`${API_BASE}/api/forecasts/latest`, {
          headers: { authorization: `Bearer ${token}` },
        }).catch(() => null),
      ]);

      if (trigRes?.ok) {
        const payload = await trigRes.json() as { hypotheses?: TriggerHypothesis[] };
        setHypotheses(payload.hypotheses ?? []);
      }
      if (forecastRes?.ok) {
        const payload = await forecastRes.json() as { forecasts?: ForecastSummary[] };
        setForecasts(payload.forecasts ?? []);
      }
      setScreenState('ready');
    } catch {
      setScreenState('database_unavailable');
    }
  }, []);

  useEffect(() => { void loadData(); }, [loadData]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }, [loadData]);

  if (screenState === 'loading') {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.centered}>
          <ActivityIndicator color={Colors.primary} size="large" />
          <Text style={styles.loadingText}>Loading TriggerGraph…</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (screenState !== 'ready') {
    const messages: Record<string, string> = {
      auth_required: 'Sign in to view trigger patterns.',
      not_configured: 'TriggerGraph requires API configuration. Keep logging daily to build your pattern history.',
      database_unavailable: 'Pattern data is temporarily unavailable.',
    };
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Text style={styles.backText}>‹ Back</Text>
          </TouchableOpacity>
          <Text style={styles.title}>TriggerGraph</Text>
        </View>
        <View style={styles.centered}>
          <Text style={styles.stateIcon}>🔍</Text>
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
        <Text style={styles.title}>Patterns & Forecast</Text>
      </View>

      {/* Tabs */}
      <View style={styles.tabs}>
        <TouchableOpacity
          onPress={() => setActiveTab('triggers')}
          style={[styles.tab, activeTab === 'triggers' && styles.tabActive]}
          accessibilityRole="tab"
          accessibilityState={{ selected: activeTab === 'triggers' }}
        >
          <Text style={[styles.tabText, activeTab === 'triggers' && styles.tabTextActive]}>
            TriggerGraph
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => setActiveTab('forecast')}
          style={[styles.tab, activeTab === 'forecast' && styles.tabActive]}
          accessibilityRole="tab"
          accessibilityState={{ selected: activeTab === 'forecast' }}
        >
          <Text style={[styles.tabText, activeTab === 'forecast' && styles.tabTextActive]}>
            ClearPath Forecast
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {activeTab === 'triggers' ? (
          <>
            <Card style={styles.aboutCard}>
              <Text style={styles.aboutTitle}>🔍 TriggerGraph — Pattern Analysis</Text>
              <Text style={styles.aboutText}>
                TriggerGraph identifies possible associations between your daily logs and acne
                patterns. Hypotheses are labeled by confidence level. These are observed
                associations, not proven causes.
              </Text>
              <Text style={styles.disclaimer}>
                ⚠️ Associations are not diagnoses. Confounders may exist.
              </Text>
            </Card>

            {hypotheses.length === 0 ? (
              <Card style={styles.emptyCard}>
                <Text style={styles.emptyIcon}>📊</Text>
                <Text style={styles.emptyTitle}>Building your pattern model</Text>
                <Text style={styles.emptyText}>
                  TriggerGraph needs at least 14 days of consistent logging to identify patterns.
                  Keep logging daily — your first hypotheses will appear here.
                </Text>
                <View style={styles.progressHint}>
                  <Text style={styles.progressHintText}>
                    💡 Log sleep, food, stress, and skin state daily for best results.
                  </Text>
                </View>
              </Card>
            ) : (
              hypotheses.map(hyp => (
                <Card key={hyp.id} style={styles.hypothesisCard}>
                  <View style={styles.hypothesisHeader}>
                    <Text style={styles.triggerType}>{hyp.triggerType.replace(/_/g, ' ')}</Text>
                    <View style={[styles.confidenceBadge, { backgroundColor: CONFIDENCE_COLORS[hyp.confidence] + '20' }]}>
                      <Text style={[styles.confidenceText, { color: CONFIDENCE_COLORS[hyp.confidence] }]}>
                        {CONFIDENCE_LABELS[hyp.confidence]}
                      </Text>
                    </View>
                  </View>
                  <Text style={styles.hypothesisText}>{hyp.hypothesis}</Text>
                  <Text style={styles.evidenceCount}>
                    Based on {hyp.evidenceCount} data point{hyp.evidenceCount !== 1 ? 's' : ''}
                  </Text>
                  <Text style={styles.lastUpdated}>
                    Updated {new Date(hyp.lastUpdated).toLocaleDateString()}
                  </Text>
                </Card>
              ))
            )}
          </>
        ) : (
          <>
            <Card style={styles.aboutCard}>
              <Text style={styles.aboutTitle}>🌤️ ClearPath Forecast — 7-Day Skin Outlook</Text>
              <Text style={styles.aboutText}>
                ClearPath uses your historical patterns to estimate your skin outlook for the
                next 7 days. Forecasts are estimates, not guarantees. The prediction engine
                requires Codex ML configuration.
              </Text>
              <Text style={styles.disclaimer}>
                ⚠️ Forecasts are estimates only. Not medical predictions.
              </Text>
            </Card>

            {forecasts.length === 0 ? (
              <Card style={styles.emptyCard}>
                <Text style={styles.emptyIcon}>🌤️</Text>
                <Text style={styles.emptyTitle}>Forecast not yet available</Text>
                <Text style={styles.emptyText}>
                  ClearPath needs at least 30 days of consistent logging and Codex ML
                  configuration to generate forecasts.
                </Text>
                <View style={styles.statusRow}>
                  <View style={[styles.statusDot, { backgroundColor: Colors.warning }]} />
                  <Text style={styles.statusText}>ML engine: awaiting Codex configuration</Text>
                </View>
              </Card>
            ) : (
              forecasts.map(forecast => (
                <Card key={forecast.id} style={styles.forecastCard}>
                  <View style={styles.forecastHeader}>
                    <Text style={styles.forecastDate}>
                      {new Date(forecast.forecastDate).toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' })}
                    </Text>
                    {forecast.predictedSeverity !== null && (
                      <View style={styles.severityBadge}>
                        <Text style={styles.severityText}>
                          Severity est. {forecast.predictedSeverity.toFixed(1)}/10
                        </Text>
                      </View>
                    )}
                  </View>
                  {forecast.confidence && (
                    <Text style={[styles.confidenceText, { color: CONFIDENCE_COLORS[forecast.confidence] }]}>
                      {CONFIDENCE_LABELS[forecast.confidence]}
                    </Text>
                  )}
                  {forecast.factors.length > 0 && (
                    <Text style={styles.factorsText}>
                      Factors: {forecast.factors.join(', ')}
                    </Text>
                  )}
                  {forecast.modelVersion && (
                    <Text style={styles.metaText}>Model: {forecast.modelVersion}</Text>
                  )}
                </Card>
              ))
            )}
          </>
        )}
      </ScrollView>
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
  tabs: {
    flexDirection: 'row', backgroundColor: Colors.surface,
    borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  tab: { flex: 1, paddingVertical: Spacing.md, alignItems: 'center' },
  tabActive: { borderBottomWidth: 2, borderBottomColor: Colors.primary },
  tabText: { ...Typography.bodyMedium, color: Colors.textMuted },
  tabTextActive: { color: Colors.primary },
  content: { padding: Spacing.lg, paddingBottom: Spacing.xxl },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: Spacing.xl },
  loadingText: { ...Typography.body, color: Colors.textSecondary, marginTop: Spacing.md },
  stateIcon: { fontSize: 48, marginBottom: Spacing.lg },
  stateMessage: { ...Typography.body, color: Colors.textSecondary, textAlign: 'center', lineHeight: 22, maxWidth: 320 },
  aboutCard: { marginBottom: Spacing.lg },
  aboutTitle: { ...Typography.bodyMedium, color: Colors.textPrimary, marginBottom: 6 },
  aboutText: { ...Typography.caption, color: Colors.textSecondary, lineHeight: 18, marginBottom: Spacing.sm },
  disclaimer: { ...Typography.caption, color: '#92400e', fontStyle: 'italic' },
  emptyCard: { alignItems: 'center', padding: Spacing.xl },
  emptyIcon: { fontSize: 40, marginBottom: Spacing.md },
  emptyTitle: { ...Typography.bodyMedium, color: Colors.textPrimary, marginBottom: 6 },
  emptyText: { ...Typography.caption, color: Colors.textSecondary, textAlign: 'center', lineHeight: 18, marginBottom: Spacing.lg },
  progressHint: { backgroundColor: Colors.primaryLight, borderRadius: BorderRadius.md, padding: Spacing.md },
  progressHintText: { ...Typography.caption, color: Colors.primaryDark, lineHeight: 18 },
  hypothesisCard: { marginBottom: Spacing.md },
  hypothesisHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: Spacing.sm },
  triggerType: { ...Typography.bodyMedium, color: Colors.textPrimary, textTransform: 'capitalize' },
  confidenceBadge: { borderRadius: BorderRadius.sm, paddingHorizontal: 8, paddingVertical: 3 },
  confidenceText: { ...Typography.caption, fontWeight: '600' },
  hypothesisText: { ...Typography.body, color: Colors.textSecondary, lineHeight: 20, marginBottom: Spacing.sm },
  evidenceCount: { ...Typography.caption, color: Colors.textMuted },
  lastUpdated: { ...Typography.caption, color: Colors.textMuted, marginTop: 2 },
  forecastCard: { marginBottom: Spacing.md },
  forecastHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: Spacing.sm },
  forecastDate: { ...Typography.bodyMedium, color: Colors.textPrimary },
  severityBadge: { backgroundColor: Colors.primaryLight, borderRadius: BorderRadius.sm, paddingHorizontal: 8, paddingVertical: 3 },
  severityText: { ...Typography.caption, color: Colors.primaryDark },
  factorsText: { ...Typography.caption, color: Colors.textSecondary, lineHeight: 18, marginTop: 4 },
  metaText: { ...Typography.caption, color: Colors.textMuted, marginTop: 2 },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  statusText: { ...Typography.caption, color: Colors.textMuted },
});
