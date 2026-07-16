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
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { supabase } from '../../../src/lib/supabase';
import { apiFetch, apiMutation, createMutationOperation } from '../../../src/lib/api';
import { Colors, Spacing, Typography, BorderRadius } from '../../../src/components/ui/theme';
import { Button, Card } from '../../../src/components/ui';

const API_BASE = process.env.EXPO_PUBLIC_API_BASE_URL ?? '';

type ReportStatus = 'queued' | 'processing' | 'completed' | 'failed';

type ReportInclusionOptions = {
  includeFaceAtlasPhotos: boolean;
  includeTreatmentDetails: boolean;
  includeSections: 'all';
};

interface ReportRecord {
  id: string;
  status: ReportStatus;
  requestedAt: string;
  inclusionOptions: ReportInclusionOptions;
  fileSizeBytes: number | null;
  failureReason: string | null;
}

type ScreenState = 'loading' | 'ready' | 'auth_required' | 'not_configured' | 'database_unavailable';

const STATUS_COLORS: Record<ReportStatus, string> = {
  completed: Colors.success,
  queued: Colors.info,
  processing: Colors.warning,
  failed: Colors.error,
};

const STATUS_LABELS: Record<ReportStatus, string> = {
  completed: 'Ready to Download',
  queued: 'Queued',
  processing: 'Generating…',
  failed: 'Failed',
};

const INCLUSION_OPTIONS = [
  { key: 'includeTreatmentDetails', label: 'Treatment details', description: 'Include recorded plans and treatment check-ins.' },
  { key: 'includeFaceAtlasPhotos', label: 'FaceAtlas photos', description: 'Include only when report consent permits retained scan photos.' },
] as const;

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
  const [inclusions, setInclusions] = useState<ReportInclusionOptions>({
    includeFaceAtlasPhotos: false,
    includeTreatmentDetails: true,
    includeSections: 'all',
  });

  const loadReports = useCallback(async () => {
    if (!API_BASE) { setScreenState('not_configured'); return; }
    try {
      const payload = await apiFetch<{ ok: true; history: ReportRecord[] }>('/api/reports/history');
      setReports(payload.history);
      setScreenState('ready');
    } catch (error) {
      setScreenState(error instanceof Error && error.message === 'auth_required'
        ? 'auth_required'
        : 'database_unavailable');
    }
  }, []);

  useEffect(() => { void loadReports(); }, [loadReports]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadReports();
    setRefreshing(false);
  }, [loadReports]);

  const createReport = useCallback(async () => {
    if (!API_BASE) return;
    setCreating(true);
    try {
      const idempotencyKey = generateIdempotencyKey();
      const payload = await apiMutation<
        { ok: true; reportRequestId: string; status: ReportStatus },
        { inclusionOptions: ReportInclusionOptions; idempotencyKey: string }
      >(
        'POST',
        '/api/reports/dermatologist',
        createMutationOperation({ inclusionOptions: inclusions, idempotencyKey }),
      );
      await loadReports();
      setShowCreate(false);
      Alert.alert(
        payload.status === 'completed' ? 'Report Ready' : 'Report Processing',
        payload.status === 'completed'
          ? 'Your private PDF is ready to save or share.'
          : 'Your report is processing. Pull to refresh for its verified status.',
      );
    } catch (error) {
      Alert.alert(
        'Report generation failed',
        error instanceof Error ? error.message.replace(/_/g, ' ') : 'Please retry.',
      );
    } finally {
      setCreating(false);
    }
  }, [inclusions, loadReports]);

  const downloadReport = useCallback(async (reportId: string) => {
    const token = await getAccessToken();
    if (!token || !API_BASE) return;
    try {
      const directory = FileSystem.cacheDirectory ?? FileSystem.documentDirectory;
      if (!directory) throw new Error('device_storage_unavailable');
      const destination = `${directory}acnetrex-dermatologist-report-${reportId}.pdf`;
      const result = await FileSystem.downloadAsync(
        `${API_BASE}/api/reports/${reportId}/download`,
        destination,
        { headers: { authorization: `Bearer ${token}` } },
      );
      if (result.status !== 200) throw new Error(`download_http_${result.status}`);
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(result.uri, {
          mimeType: 'application/pdf',
          dialogTitle: 'Save or share AcneTrex dermatologist report',
          UTI: 'com.adobe.pdf',
        });
      } else {
        Alert.alert('Report saved', `The private PDF was saved on this device at ${result.uri}.`);
      }
    } catch (error) {
      Alert.alert(
        'Download failed',
        error instanceof Error ? error.message.replace(/_/g, ' ') : 'Please retry.',
      );
    }
  }, []);

  const retryReport = useCallback(async (reportId: string) => {
    const failedReport = reports.find((report) => report.id === reportId);
    if (!failedReport || !API_BASE) return;
    try {
      await apiMutation(
        'POST',
        '/api/reports/dermatologist',
        createMutationOperation({
          inclusionOptions: failedReport.inclusionOptions,
          idempotencyKey: generateIdempotencyKey(),
        }),
      );
      await loadReports();
    } catch (error) {
      Alert.alert('Retry failed', error instanceof Error ? error.message.replace(/_/g, ' ') : 'Please retry.');
    }
  }, [loadReports, reports]);

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
              Missing sections will state the exact records required instead of using substitute data.
            </Text>
            <Button title="Create Report" onPress={() => setShowCreate(true)} style={styles.startBtn} />
          </Card>
        ) : (
          reports.map(report => (
            <Card key={report.id} style={styles.reportCard}>
              <View style={styles.reportHeader}>
                <Text style={styles.reportDate}>
                  {new Date(report.requestedAt).toLocaleDateString()}
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
              {report.status === 'failed' && (
                <Button
                  title="Retry"
                  onPress={() => retryReport(report.id)}
                  variant="secondary"
                  style={styles.downloadBtn}
                />
              )}
              {report.failureReason && <Text style={styles.failureReason}>{report.failureReason}</Text>}
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
  failureReason: { ...Typography.caption, color: Colors.error, marginTop: Spacing.sm },
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
