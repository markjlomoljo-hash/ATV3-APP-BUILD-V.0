/**
 * Reports — Dermatologist-Ready PDF Report Creation
 *
 * Zero-fabrication: no fake report completion. All states are honest.
 * Reports are generated asynchronously via the web API.
 */
import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, Switch,
  StyleSheet, Alert, ActivityIndicator, RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import * as Crypto from 'expo-crypto';
import { supabase } from '../../../src/lib/supabase';
import { Colors, Spacing, Typography, BorderRadius } from '../../../src/components/ui/theme';
import { Button, Card } from '../../../src/components/ui';

const API_BASE = process.env.EXPO_PUBLIC_API_BASE_URL ?? '';

type ReportStatus = 'queued' | 'processing' | 'completed' | 'failed_retryable' | 'failed_terminal' | 'cancelled' | 'expired';

interface ReportRecord {
  id: string;
  status: ReportStatus;
  createdAt: string;
  completedAt: string | null;
  expiresAt: string | null;
  inclusionOptions: Record<string, boolean>;
}

type ScreenState = 'loading' | 'ready' | 'auth_required' | 'not_configured' | 'database_unavailable';

const STATUS_COLORS: Record<ReportStatus, string> = {
  completed: Colors.success,
  queued: Colors.info,
  processing: Colors.warning,
  failed_retryable: Colors.error,
  failed_terminal: Colors.error,
  cancelled: Colors.textMuted,
  expired: Colors.textMuted,
};

const STATUS_LABELS: Record<ReportStatus, string> = {
  completed: 'Ready to Download',
  queued: 'Queued',
  processing: 'Generating…',
  failed_retryable: 'Failed — Retryable',
  failed_terminal: 'Failed',
  cancelled: 'Cancelled',
  expired: 'Expired',
};

const INCLUSION_OPTIONS = [
  { key: 'includeSkinState', label: 'Skin State Journal', description: 'Acne severity, zones, lesion types' },
  { key: 'includeSleep', label: 'SleepDerm', description: 'Sleep duration, debt, regularity' },
  { key: 'includeDiet', label: 'DermDiet', description: 'Meal patterns, dietary categories' },
  { key: 'includeContext', label: 'Context Logs', description: 'Stress, activity, hydration, cycle, contact' },
  { key: 'includeTreatment', label: 'Treatment Plan', description: 'Protocol, adherence, tolerance' },
  { key: 'includeFaceAtlas', label: 'FaceAtlas Summaries', description: 'Scan summaries (no raw images)' },
  { key: 'includeFaceAtlasImages', label: 'FaceAtlas Images', description: 'Include raw scan images (optional)' },
  { key: 'includeTriggers', label: 'TriggerGraph', description: 'Hypotheses and episode labels' },
  { key: 'includeForecasts', label: 'Forecasts', description: 'Prediction history and evaluations' },
  { key: 'includeSkinTwin', label: 'Skin Twin', description: 'Selected scenarios (labeled estimated)' },
  { key: 'includeCutisAI', label: 'CutisAI Insights', description: 'Validated messages and citations' },
];

function getAccessToken(): Promise<string | null> {
  return supabase.auth.getSession().then(({ data }) => data.session?.access_token ?? null);
}

function generateIdempotencyKey(): string {
  return `report-${Crypto.randomUUID()}`;
}

export default function ReportsScreen() {
  const [screenState, setScreenState] = useState<ScreenState>('loading');
  const [reports, setReports] = useState<ReportRecord[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [creating, setCreating] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [inclusions, setInclusions] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(INCLUSION_OPTIONS.map(o => [o.key, o.key !== 'includeFaceAtlasImages']))
  );

  const loadReports = useCallback(async () => {
    const token = await getAccessToken();
    if (!token) { setScreenState('auth_required'); return; }
    if (!API_BASE) { setScreenState('not_configured'); return; }
    try {
      const res = await fetch(`${API_BASE}/api/reports/history`, {
        headers: { authorization: `Bearer ${token}` },
      });
      if (res.status === 503) { setScreenState('database_unavailable'); return; }
      if (!res.ok) { setScreenState('not_configured'); return; }
      const payload = await res.json() as { reports?: ReportRecord[] };
      setReports(payload.reports ?? []);
      setScreenState('ready');
    } catch {
      setScreenState('database_unavailable');
    }
  }, []);

  useEffect(() => { void loadReports(); }, [loadReports]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadReports();
    setRefreshing(false);
  }, [loadReports]);

  const createReport = useCallback(async () => {
    const token = await getAccessToken();
    if (!token || !API_BASE) return;
    setCreating(true);
    try {
      const idempotencyKey = generateIdempotencyKey();
      const res = await fetch(`${API_BASE}/api/reports/dermatologist`, {
        method: 'POST',
        headers: {
          authorization: `Bearer ${token}`,
          'content-type': 'application/json',
        },
        body: JSON.stringify({ inclusionOptions: inclusions, idempotencyKey }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'unknown' })) as { error?: string };
        Alert.alert('Error', err.error === 'insufficient_data'
          ? 'Not enough data to generate a report. Keep logging daily.'
          : 'Could not create report. Please try again.');
        return;
      }
      const payload = await res.json() as { id?: string; status?: ReportStatus };
      if (payload.id) {
        const newReport: ReportRecord = {
          id: payload.id,
          status: payload.status ?? 'queued',
          createdAt: new Date().toISOString(),
          completedAt: null,
          expiresAt: null,
          inclusionOptions: inclusions,
        };
        setReports(prev => [newReport, ...prev]);
      }
      setShowCreate(false);
      Alert.alert('Report Queued', 'Your report is being generated. Check back in a moment.');
    } catch {
      Alert.alert('Error', 'Could not create report. Please try again.');
    } finally {
      setCreating(false);
    }
  }, [inclusions]);

  const downloadReport = useCallback(async (reportId: string) => {
    const token = await getAccessToken();
    if (!token || !API_BASE) return;
    try {
      const res = await fetch(`${API_BASE}/api/reports/${reportId}/download`, {
        headers: { authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        Alert.alert('Download Failed', 'Could not get download link. The report may have expired.');
        return;
      }
      const payload = await res.json() as { url?: string };
      if (payload.url) {
        Alert.alert('Download Ready', 'Open this link in your browser to download your report:\n\n' + payload.url);
      }
    } catch {
      Alert.alert('Error', 'Could not get download link.');
    }
  }, []);

  const retryReport = useCallback(async (reportId: string) => {
    const token = await getAccessToken();
    if (!token || !API_BASE) return;
    try {
      const res = await fetch(`${API_BASE}/api/reports/${reportId}`, {
        method: 'POST',
        headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
        body: JSON.stringify({ action: 'retry' }),
      });
      if (!res.ok) { Alert.alert('Error', 'Could not retry report.'); return; }
      setReports(prev => prev.map(r => r.id === reportId ? { ...r, status: 'queued' } : r));
    } catch {
      Alert.alert('Error', 'Could not retry report.');
    }
  }, []);

  if (screenState === 'loading') {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.centered}>
          <ActivityIndicator color={Colors.primary} size="large" />
          <Text style={styles.loadingText}>Loading Reports…</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (screenState !== 'ready') {
    const messages: Record<string, string> = {
      auth_required: 'Sign in to access your reports.',
      not_configured: 'Report generation requires API configuration.',
      database_unavailable: 'Report history is temporarily unavailable.',
    };
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Text style={styles.backText}>‹ Back</Text>
          </TouchableOpacity>
          <Text style={styles.title}>Reports</Text>
        </View>
        <View style={styles.centered}>
          <Text style={styles.stateIcon}>📄</Text>
          <Text style={styles.stateMessage}>{messages[screenState] ?? ''}</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (showCreate) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => setShowCreate(false)} style={styles.backBtn}>
            <Text style={styles.backText}>Cancel</Text>
          </TouchableOpacity>
          <Text style={styles.title}>New Report</Text>
          <View style={{ width: 60 }} />
        </View>
        <ScrollView contentContainerStyle={styles.content}>
          <Text style={styles.sectionTitle}>Include Sections</Text>
          <Text style={styles.sectionSubtitle}>
            Only sections with real data will appear in the report. Missing sections are noted honestly.
          </Text>
          {INCLUSION_OPTIONS.map(opt => (
            <View key={opt.key} style={styles.inclusionRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.inclusionLabel}>{opt.label}</Text>
                <Text style={styles.inclusionDesc}>{opt.description}</Text>
              </View>
              <Switch
                value={inclusions[opt.key] ?? false}
                onValueChange={v => setInclusions(prev => ({ ...prev, [opt.key]: v }))}
                trackColor={{ false: Colors.border, true: Colors.primary }}
                thumbColor="#fff"
                accessibilityLabel={opt.label}
              />
            </View>
          ))}
          <Card style={styles.privacyCard}>
            <Text style={styles.privacyText}>
              🔒 Reports are generated from your data only. They are stored privately and
              accessible only to you. Raw images are included only if you enable FaceAtlas Images above.
            </Text>
          </Card>
          <Button
            title={creating ? 'Creating Report…' : 'Generate Report'}
            onPress={createReport}
            loading={creating}
            disabled={creating}
            style={styles.generateBtn}
          />
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backText}>‹ Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Reports</Text>
        <TouchableOpacity onPress={() => setShowCreate(true)} style={styles.newBtn} accessibilityLabel="New report">
          <Text style={styles.newBtnText}>+ New</Text>
        </TouchableOpacity>
      </View>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        <Card style={styles.aboutCard}>
          <Text style={styles.aboutTitle}>📋 Dermatologist-Ready Reports</Text>
          <Text style={styles.aboutText}>
            Generate professional PDF reports from your real skin data for provider review.
            Reports include treatment adherence, skin state trends, FaceAtlas summaries, and
            contextual factors — all from your actual logs.
          </Text>
        </Card>

        <Text style={styles.sectionTitle}>Report History</Text>
        {reports.length === 0 ? (
          <Card style={styles.emptyCard}>
            <Text style={styles.emptyIcon}>📄</Text>
            <Text style={styles.emptyTitle}>No reports yet</Text>
            <Text style={styles.emptyText}>
              Generate your first report to share with your dermatologist.
              Requires at least 7 days of logs.
            </Text>
            <Button title="Create Report" onPress={() => setShowCreate(true)} style={styles.startBtn} />
          </Card>
        ) : (
          reports.map(report => (
            <Card key={report.id} style={styles.reportCard}>
              <View style={styles.reportHeader}>
                <Text style={styles.reportDate}>
                  {new Date(report.createdAt).toLocaleDateString()}
                </Text>
                <View style={[styles.statusBadge, { backgroundColor: STATUS_COLORS[report.status] + '20' }]}>
                  <Text style={[styles.statusText, { color: STATUS_COLORS[report.status] }]}>
                    {STATUS_LABELS[report.status]}
                  </Text>
                </View>
              </View>
              {report.status === 'completed' && (
                <Button
                  title="Download PDF"
                  onPress={() => downloadReport(report.id)}
                  variant="secondary"
                  style={styles.downloadBtn}
                />
              )}
              {report.status === 'failed_retryable' && (
                <Button
                  title="Retry"
                  onPress={() => retryReport(report.id)}
                  variant="secondary"
                  style={styles.downloadBtn}
                />
              )}
              {(report.status === 'queued' || report.status === 'processing') && (
                <View style={styles.processingRow}>
                  <ActivityIndicator color={Colors.warning} size="small" />
                  <Text style={styles.processingText}>Generating your report…</Text>
                </View>
              )}
            </Card>
          ))
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
  newBtn: { paddingLeft: Spacing.sm },
  newBtnText: { ...Typography.bodyMedium, color: Colors.primary },
  content: { padding: Spacing.lg, paddingBottom: Spacing.xxl },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: Spacing.xl },
  loadingText: { ...Typography.body, color: Colors.textSecondary, marginTop: Spacing.md },
  stateIcon: { fontSize: 48, marginBottom: Spacing.lg },
  stateMessage: { ...Typography.body, color: Colors.textSecondary, textAlign: 'center', lineHeight: 22, maxWidth: 320 },
  aboutCard: { marginBottom: Spacing.lg },
  aboutTitle: { ...Typography.bodyMedium, color: Colors.textPrimary, marginBottom: 6 },
  aboutText: { ...Typography.caption, color: Colors.textSecondary, lineHeight: 18 },
  sectionTitle: { ...Typography.title3, color: Colors.textPrimary, marginBottom: Spacing.sm },
  sectionSubtitle: { ...Typography.caption, color: Colors.textSecondary, marginBottom: Spacing.md, lineHeight: 18 },
  emptyCard: { alignItems: 'center', padding: Spacing.xl },
  emptyIcon: { fontSize: 40, marginBottom: Spacing.md },
  emptyTitle: { ...Typography.bodyMedium, color: Colors.textPrimary, marginBottom: 6 },
  emptyText: { ...Typography.caption, color: Colors.textSecondary, textAlign: 'center', lineHeight: 18, marginBottom: Spacing.lg },
  startBtn: { minWidth: 180 },
  reportCard: { marginBottom: Spacing.md },
  reportHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: Spacing.sm },
  reportDate: { ...Typography.bodyMedium, color: Colors.textPrimary },
  statusBadge: { borderRadius: BorderRadius.sm, paddingHorizontal: 8, paddingVertical: 3 },
  statusText: { ...Typography.caption, fontWeight: '600' },
  downloadBtn: { marginTop: Spacing.sm },
  processingRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginTop: Spacing.sm },
  processingText: { ...Typography.caption, color: Colors.warning },
  inclusionRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingVertical: Spacing.sm, borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  inclusionLabel: { ...Typography.bodyMedium, color: Colors.textPrimary },
  inclusionDesc: { ...Typography.caption, color: Colors.textMuted, marginTop: 2 },
  privacyCard: { marginTop: Spacing.lg, backgroundColor: Colors.primaryLight, borderColor: Colors.primaryMid },
  privacyText: { ...Typography.caption, color: Colors.primaryDark, lineHeight: 18 },
  generateBtn: { marginTop: Spacing.xl },
});
