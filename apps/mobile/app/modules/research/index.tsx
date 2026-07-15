/**
 * Research Network — Anonymous Cohort Contribution & Insights
 *
 * Zero-fabrication: no fake cohort sizes, no fabricated population stats.
 * All numbers come from the API or show honest unavailable states.
 */
import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, Switch,
  StyleSheet, Alert, ActivityIndicator, RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { supabase } from '../../../src/lib/supabase';
import { Colors, Spacing, Typography, BorderRadius } from '../../../src/components/ui/theme';
import { Button, Card } from '../../../src/components/ui';

const API_BASE = process.env.EXPO_PUBLIC_API_BASE_URL ?? '';

interface ResearchStatus {
  enrolled: boolean;
  anonymousLearningEnabled: boolean;
  contributionCount: number | null;
  cohortInsights: Array<{
    label: string;
    value: string;
    confidence: string;
  }>;
  lastContributionAt: string | null;
}

type ScreenState = 'loading' | 'ready' | 'auth_required' | 'not_configured';

function getAccessToken(): Promise<string | null> {
  return supabase.auth.getSession().then(({ data }) => data.session?.access_token ?? null);
}

export default function ResearchScreen() {
  const [screenState, setScreenState] = useState<ScreenState>('loading');
  const [researchStatus, setResearchStatus] = useState<ResearchStatus | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [toggling, setToggling] = useState(false);

  const loadStatus = useCallback(async () => {
    const token = await getAccessToken();
    if (!token) { setScreenState('auth_required'); return; }
    if (!API_BASE) {
      // Show consent controls even without API
      setResearchStatus({
        enrolled: false,
        anonymousLearningEnabled: false,
        contributionCount: null,
        cohortInsights: [],
        lastContributionAt: null,
      });
      setScreenState('ready');
      return;
    }
    try {
      const res = await fetch(`${API_BASE}/api/research/status`, {
        headers: { authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        setResearchStatus({
          enrolled: false,
          anonymousLearningEnabled: false,
          contributionCount: null,
          cohortInsights: [],
          lastContributionAt: null,
        });
        setScreenState('ready');
        return;
      }
      const payload = await res.json() as ResearchStatus;
      setResearchStatus(payload);
      setScreenState('ready');
    } catch {
      setResearchStatus({
        enrolled: false,
        anonymousLearningEnabled: false,
        contributionCount: null,
        cohortInsights: [],
        lastContributionAt: null,
      });
      setScreenState('ready');
    }
  }, []);

  useEffect(() => { void loadStatus(); }, [loadStatus]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadStatus();
    setRefreshing(false);
  }, [loadStatus]);

  const toggleAnonymousLearning = useCallback(async (enabled: boolean) => {
    const token = await getAccessToken();
    if (!token) return;
    setToggling(true);
    try {
      if (API_BASE) {
        const res = await fetch(`${API_BASE}/api/privacy/consent`, {
          method: 'PATCH',
          headers: {
            authorization: `Bearer ${token}`,
            'content-type': 'application/json',
          },
          body: JSON.stringify({ anonymousLearning: enabled }),
        });
        if (!res.ok) {
          Alert.alert('Error', 'Could not update consent. Please try again.');
          return;
        }
      }
      setResearchStatus(prev => prev ? { ...prev, anonymousLearningEnabled: enabled, enrolled: enabled } : prev);
    } catch {
      Alert.alert('Error', 'Could not update consent.');
    } finally {
      setToggling(false);
    }
  }, []);

  if (screenState === 'loading') {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.centered}>
          <ActivityIndicator color={Colors.primary} size="large" />
          <Text style={styles.loadingText}>Loading Research Network…</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (screenState === 'auth_required') {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Text style={styles.backText}>‹ Back</Text>
          </TouchableOpacity>
          <Text style={styles.title}>Research Network</Text>
        </View>
        <View style={styles.centered}>
          <Text style={styles.stateIcon}>🔑</Text>
          <Text style={styles.stateMessage}>Sign in to manage research participation.</Text>
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
        <Text style={styles.title}>Research Network</Text>
      </View>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* About */}
        <Card style={styles.aboutCard}>
          <Text style={styles.aboutTitle}>🔬 Anonymous Learning Network</Text>
          <Text style={styles.aboutText}>
            Contribute anonymized, aggregated skin pattern data to improve acne research.
            Your identity is never shared. Raw images, personal details, and identifying
            information are always excluded. You can withdraw at any time.
          </Text>
        </Card>

        {/* Consent toggle */}
        <Card style={styles.consentCard}>
          <View style={styles.consentRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.consentLabel}>Anonymous Learning</Text>
              <Text style={styles.consentDesc}>
                Share anonymized pattern data to improve the collective model.
                Only aggregated, non-identifying data is contributed.
              </Text>
            </View>
            <Switch
              value={researchStatus?.anonymousLearningEnabled ?? false}
              onValueChange={toggleAnonymousLearning}
              disabled={toggling}
              trackColor={{ false: Colors.border, true: Colors.primary }}
              thumbColor="#fff"
              accessibilityLabel="Anonymous learning consent"
            />
          </View>
          {toggling && (
            <View style={styles.togglingRow}>
              <ActivityIndicator color={Colors.primary} size="small" />
              <Text style={styles.togglingText}>Updating consent…</Text>
            </View>
          )}
        </Card>

        {/* Participation status */}
        {researchStatus?.enrolled && (
          <Card style={styles.enrolledCard}>
            <Text style={styles.enrolledTitle}>✅ Enrolled in Research Network</Text>
            {researchStatus.contributionCount !== null && (
              <Text style={styles.enrolledMeta}>
                Contributions: {researchStatus.contributionCount}
              </Text>
            )}
            {researchStatus.lastContributionAt && (
              <Text style={styles.enrolledMeta}>
                Last contribution: {new Date(researchStatus.lastContributionAt).toLocaleDateString()}
              </Text>
            )}
          </Card>
        )}

        {/* Cohort insights */}
        {researchStatus?.cohortInsights && researchStatus.cohortInsights.length > 0 ? (
          <>
            <Text style={styles.sectionTitle}>Cohort Insights</Text>
            <Text style={styles.sectionSubtitle}>
              Aggregated, anonymized patterns from the research network.
              These are population-level observations, not personal predictions.
            </Text>
            {researchStatus.cohortInsights.map((insight, idx) => (
              <Card key={idx} style={styles.insightCard}>
                <Text style={styles.insightLabel}>{insight.label}</Text>
                <Text style={styles.insightValue}>{insight.value}</Text>
                <Text style={styles.insightConfidence}>{insight.confidence}</Text>
              </Card>
            ))}
          </>
        ) : (
          <Card style={styles.emptyCard}>
            <Text style={styles.emptyIcon}>📊</Text>
            <Text style={styles.emptyTitle}>Cohort insights not yet available</Text>
            <Text style={styles.emptyText}>
              Cohort insights require the research network to have sufficient enrolled participants.
              Enable anonymous learning above to contribute to and benefit from the network.
            </Text>
          </Card>
        )}

        {/* Privacy notice */}
        <Card style={styles.privacyCard}>
          <Text style={styles.privacyTitle}>🔒 Privacy Guarantees</Text>
          <Text style={styles.privacyText}>
            • Your name, email, and identifying details are never shared{'\n'}
            • Raw face images are never contributed{'\n'}
            • Only aggregated, anonymized pattern features are used{'\n'}
            • You can withdraw and delete your contributions at any time from Profile → Privacy{'\n'}
            • Withdrawal removes your data from future model training
          </Text>
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
  stateIcon: { fontSize: 48, marginBottom: Spacing.lg },
  stateMessage: { ...Typography.body, color: Colors.textSecondary, textAlign: 'center', lineHeight: 22, maxWidth: 320 },
  aboutCard: { marginBottom: Spacing.lg },
  aboutTitle: { ...Typography.bodyMedium, color: Colors.textPrimary, marginBottom: 6 },
  aboutText: { ...Typography.caption, color: Colors.textSecondary, lineHeight: 18 },
  consentCard: { marginBottom: Spacing.lg },
  consentRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  consentLabel: { ...Typography.bodyMedium, color: Colors.textPrimary },
  consentDesc: { ...Typography.caption, color: Colors.textSecondary, lineHeight: 18, marginTop: 2 },
  togglingRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginTop: Spacing.sm },
  togglingText: { ...Typography.caption, color: Colors.textMuted },
  enrolledCard: { marginBottom: Spacing.lg, backgroundColor: Colors.primaryLight, borderColor: Colors.primaryMid },
  enrolledTitle: { ...Typography.bodyMedium, color: Colors.primaryDark, marginBottom: 4 },
  enrolledMeta: { ...Typography.caption, color: Colors.primaryDark, marginTop: 2 },
  sectionTitle: { ...Typography.title3, color: Colors.textPrimary, marginBottom: Spacing.sm },
  sectionSubtitle: { ...Typography.caption, color: Colors.textSecondary, lineHeight: 18, marginBottom: Spacing.md },
  insightCard: { marginBottom: Spacing.sm },
  insightLabel: { ...Typography.bodyMedium, color: Colors.textPrimary },
  insightValue: { ...Typography.body, color: Colors.textSecondary, marginTop: 2 },
  insightConfidence: { ...Typography.caption, color: Colors.textMuted, marginTop: 2 },
  emptyCard: { alignItems: 'center', padding: Spacing.xl },
  emptyIcon: { fontSize: 40, marginBottom: Spacing.md },
  emptyTitle: { ...Typography.bodyMedium, color: Colors.textPrimary, marginBottom: 6 },
  emptyText: { ...Typography.caption, color: Colors.textSecondary, textAlign: 'center', lineHeight: 18 },
  privacyCard: { marginTop: Spacing.lg, backgroundColor: '#eff6ff', borderColor: '#bfdbfe' },
  privacyTitle: { ...Typography.bodyMedium, color: '#1d4ed8', marginBottom: 6 },
  privacyText: { ...Typography.caption, color: '#1e40af', lineHeight: 20 },
});
