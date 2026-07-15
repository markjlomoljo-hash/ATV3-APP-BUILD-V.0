/**
 * Intelligence Core — ML Readiness, BarrierGuard, Acne Signature Map
 *
 * Zero-fabrication: no fake engine badges, no fabricated scores.
 * Shows real job/result states from the database.
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
import { Card } from '../../../src/components/ui';

const API_BASE = process.env.EXPO_PUBLIC_API_BASE_URL ?? '';

type JobStatus = 'queued' | 'processing' | 'completed' | 'insufficient_data' | 'not_configured' | 'failed_retryable' | 'failed_terminal' | 'cancelled';

interface IntelligenceStatus {
  overallStatus: 'ready' | 'not_configured' | 'partial' | 'unavailable';
  engines: Array<{
    name: string;
    status: JobStatus;
    modelVersion: string | null;
    lastRunAt: string | null;
    coverage: number | null;
  }>;
  recentJobs: Array<{
    id: string;
    operation: string;
    status: JobStatus;
    createdAt: string;
  }>;
}

type ScreenState = 'loading' | 'ready' | 'auth_required' | 'not_configured' | 'unavailable';

const STATUS_COLORS: Record<JobStatus, string> = {
  completed: Colors.success,
  processing: Colors.warning,
  queued: Colors.info,
  insufficient_data: Colors.textMuted,
  not_configured: Colors.textMuted,
  failed_retryable: Colors.error,
  failed_terminal: Colors.error,
  cancelled: Colors.textMuted,
};

function getAccessToken(): Promise<string | null> {
  return supabase.auth.getSession().then(({ data }) => data.session?.access_token ?? null);
}

export default function IntelligenceScreen() {
  const [screenState, setScreenState] = useState<ScreenState>('loading');
  const [intelligenceStatus, setIntelligenceStatus] = useState<IntelligenceStatus | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const loadStatus = useCallback(async () => {
    const token = await getAccessToken();
    if (!token) { setScreenState('auth_required'); return; }
    if (!API_BASE) { setScreenState('not_configured'); return; }
    try {
      const res = await fetch(`${API_BASE}/api/intelligence/status`, {
        headers: { authorization: `Bearer ${token}` },
      });
      if (res.status === 503) { setScreenState('unavailable'); return; }
      if (!res.ok) { setScreenState('not_configured'); return; }
      const payload = await res.json() as IntelligenceStatus;
      setIntelligenceStatus(payload);
      setScreenState('ready');
    } catch {
      setScreenState('not_configured');
    }
  }, []);

  useEffect(() => { void loadStatus(); }, [loadStatus]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadStatus();
    setRefreshing(false);
  }, [loadStatus]);

  if (screenState === 'loading') {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.centered}>
          <ActivityIndicator color={Colors.primary} size="large" />
          <Text style={styles.loadingText}>Loading Intelligence Core…</Text>
        </View>
      </SafeAreaView>
    );
  }

  const overallColor = intelligenceStatus?.overallStatus === 'ready' ? Colors.success
    : intelligenceStatus?.overallStatus === 'partial' ? Colors.warning
    : Colors.textMuted;

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backText}>‹ Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Intelligence Core</Text>
      </View>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* Overall status */}
        <Card style={styles.statusCard}>
          <View style={styles.statusRow}>
            <View style={[styles.statusDot, { backgroundColor: overallColor }]} />
            <Text style={styles.statusLabel}>
              {intelligenceStatus?.overallStatus === 'ready' ? 'Intelligence Ready'
                : intelligenceStatus?.overallStatus === 'partial' ? 'Partial Configuration'
                : 'Awaiting Codex Configuration'}
            </Text>
          </View>
          <Text style={styles.statusDesc}>
            The intelligence layer processes your logs through validated ML models to generate
            TriggerGraph hypotheses, BarrierGuard assessments, and ClearPath forecasts.
            All results are backed by real job records — no fabricated engine badges.
          </Text>
        </Card>

        {/* Engines */}
        {intelligenceStatus?.engines && intelligenceStatus.engines.length > 0 ? (
          <>
            <Text style={styles.sectionTitle}>Analysis Engines</Text>
            {intelligenceStatus.engines.map((engine, idx) => (
              <Card key={idx} style={styles.engineCard}>
                <View style={styles.engineHeader}>
                  <Text style={styles.engineName}>{engine.name}</Text>
                  <View style={[styles.engineBadge, { backgroundColor: STATUS_COLORS[engine.status] + '20' }]}>
                    <Text style={[styles.engineStatus, { color: STATUS_COLORS[engine.status] }]}>
                      {engine.status.replace(/_/g, ' ')}
                    </Text>
                  </View>
                </View>
                {engine.modelVersion && (
                  <Text style={styles.metaText}>Model: {engine.modelVersion}</Text>
                )}
                {engine.coverage !== null && (
                  <Text style={styles.metaText}>Coverage: {Math.round(engine.coverage * 100)}%</Text>
                )}
                {engine.lastRunAt && (
                  <Text style={styles.metaText}>
                    Last run: {new Date(engine.lastRunAt).toLocaleDateString()}
                  </Text>
                )}
              </Card>
            ))}
          </>
        ) : (
          <Card style={styles.emptyCard}>
            <Text style={styles.emptyIcon}>⚙️</Text>
            <Text style={styles.emptyTitle}>Engines not yet configured</Text>
            <Text style={styles.emptyText}>
              Intelligence engines will appear here once Codex connects the ML service.
              Your data is being collected and will be ready for analysis.
            </Text>
          </Card>
        )}

        {/* Recent jobs */}
        {intelligenceStatus?.recentJobs && intelligenceStatus.recentJobs.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>Recent Jobs</Text>
            {intelligenceStatus.recentJobs.slice(0, 5).map(job => (
              <View key={job.id} style={styles.jobRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.jobOperation}>{job.operation.replace(/_/g, ' ')}</Text>
                  <Text style={styles.jobDate}>{new Date(job.createdAt).toLocaleString()}</Text>
                </View>
                <View style={[styles.jobBadge, { backgroundColor: STATUS_COLORS[job.status] + '20' }]}>
                  <Text style={[styles.jobStatus, { color: STATUS_COLORS[job.status] }]}>
                    {job.status.replace(/_/g, ' ')}
                  </Text>
                </View>
              </View>
            ))}
          </>
        )}

        {/* BarrierGuard section */}
        <Text style={styles.sectionTitle}>BarrierGuard</Text>
        <Card style={styles.barrierCard}>
          <Text style={styles.barrierTitle}>🛡️ Skin Barrier Assessment</Text>
          <Text style={styles.barrierText}>
            BarrierGuard assesses your skin barrier health from zone patterns, lesion lifecycle,
            SkinState logs, and FaceAtlas data. Real zone/pattern views require validated
            FaceAtlas results and consistent logging.
          </Text>
          <View style={styles.barrierStatus}>
            <View style={[styles.statusDot, { backgroundColor: Colors.textMuted }]} />
            <Text style={styles.statusText}>Awaiting sufficient data and ML configuration</Text>
          </View>
        </Card>
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
  content: { padding: Spacing.lg, paddingBottom: Spacing.xxl },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: Spacing.xl },
  loadingText: { ...Typography.body, color: Colors.textSecondary, marginTop: Spacing.md },
  statusCard: { marginBottom: Spacing.lg },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginBottom: Spacing.sm },
  statusDot: { width: 10, height: 10, borderRadius: 5 },
  statusLabel: { ...Typography.bodyMedium, color: Colors.textPrimary },
  statusDesc: { ...Typography.caption, color: Colors.textSecondary, lineHeight: 18 },
  sectionTitle: { ...Typography.title3, color: Colors.textPrimary, marginBottom: Spacing.md, marginTop: Spacing.sm },
  engineCard: { marginBottom: Spacing.md },
  engineHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: Spacing.sm },
  engineName: { ...Typography.bodyMedium, color: Colors.textPrimary },
  engineBadge: { borderRadius: BorderRadius.sm, paddingHorizontal: 8, paddingVertical: 3 },
  engineStatus: { ...Typography.caption, fontWeight: '600', textTransform: 'capitalize' },
  metaText: { ...Typography.caption, color: Colors.textMuted, marginTop: 2 },
  emptyCard: { alignItems: 'center', padding: Spacing.xl },
  emptyIcon: { fontSize: 40, marginBottom: Spacing.md },
  emptyTitle: { ...Typography.bodyMedium, color: Colors.textPrimary, marginBottom: 6 },
  emptyText: { ...Typography.caption, color: Colors.textSecondary, textAlign: 'center', lineHeight: 18 },
  jobRow: {
    flexDirection: 'row', alignItems: 'center', paddingVertical: Spacing.sm,
    borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  jobOperation: { ...Typography.bodyMedium, color: Colors.textPrimary, textTransform: 'capitalize' },
  jobDate: { ...Typography.caption, color: Colors.textMuted, marginTop: 2 },
  jobBadge: { borderRadius: BorderRadius.sm, paddingHorizontal: 8, paddingVertical: 3 },
  jobStatus: { ...Typography.caption, fontWeight: '600', textTransform: 'capitalize' },
  barrierCard: { marginBottom: Spacing.lg },
  barrierTitle: { ...Typography.bodyMedium, color: Colors.textPrimary, marginBottom: 6 },
  barrierText: { ...Typography.caption, color: Colors.textSecondary, lineHeight: 18, marginBottom: Spacing.sm },
  barrierStatus: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  statusText: { ...Typography.caption, color: Colors.textMuted },
});
