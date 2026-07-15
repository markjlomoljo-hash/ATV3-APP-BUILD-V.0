import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { useQuery } from "@tanstack/react-query";
import { useAuthStore } from "../../src/stores/auth";
import {
  fetchInsightsData,
  InsightsSummary,
} from "../../src/lib/daily-logs-service";
import { Card, EmptyState } from "../../src/components/ui";
import {
  Colors,
  Spacing,
  Typography,
  BorderRadius,
} from "../../src/components/ui/theme";

const MIN_LOGS_FOR_INSIGHTS = 5;

function SleepQualityBar({ quality, date }: { quality: number; date: string }) {
  const colors: Record<number, string> = {
    5: Colors.success,
    4: "#84cc16",
    3: Colors.warning,
    2: "#f97316",
    1: Colors.error,
  };
  const labels: Record<number, string> = {
    5: "Excellent",
    4: "Good",
    3: "Fair",
    2: "Poor",
    1: "Very poor",
  };
  return (
    <View style={styles.trendBar}>
      <Text style={styles.trendDate}>{date.slice(5)}</Text>
      <View style={styles.trendBarBg}>
        <View
          style={[
            styles.trendBarFill,
            {
              width: `${(quality / 5) * 100}%`,
              backgroundColor: colors[quality] ?? Colors.textMuted,
            },
          ]}
        />
      </View>
      <Text style={styles.trendState}>{labels[quality] ?? quality}</Text>
    </View>
  );
}

function AdherenceCard({ rate }: { rate: number }) {
  const pct = Math.round(rate * 100);
  const label =
    pct >= 90
      ? "Excellent"
      : pct >= 70
      ? "Good"
      : pct >= 50
      ? "Fair"
      : "Needs improvement";
  const color =
    pct >= 90
      ? Colors.success
      : pct >= 70
      ? "#84cc16"
      : pct >= 50
      ? Colors.warning
      : Colors.error;

  return (
    <Card style={styles.adherenceCard}>
      <Text style={styles.adherenceTitle}>💊 Treatment Adherence</Text>
      <View style={styles.adherenceRow}>
        <Text style={[styles.adherencePct, { color }]}>{pct}%</Text>
        <Text style={styles.adherenceLabel}>{label}</Text>
      </View>
      <View style={styles.progressBar}>
        <View
          style={[
            styles.progressFill,
            { width: `${pct}%`, backgroundColor: color },
          ]}
        />
      </View>
      <Text style={styles.adherenceHint}>
        Based on your treatment check-ins over the last 30 days.
      </Text>
    </Card>
  );
}

function SleepInsightCard({ summary }: { summary: InsightsSummary }) {
  const { avgSleepQuality, sleepLogs } = summary;
  if (!avgSleepQuality || sleepLogs.length < 3) return null;

  const qualityLabel =
    avgSleepQuality >= 4.5
      ? "Excellent"
      : avgSleepQuality >= 3.5
      ? "Good"
      : avgSleepQuality >= 2.5
      ? "Fair"
      : "Poor";

  const poorNights = sleepLogs.filter((l) => (l.quality ?? 3) <= 2).length;
  const poorPct = Math.round((poorNights / sleepLogs.length) * 100);

  return (
    <Card style={styles.insightCard}>
      <Text style={styles.insightIcon}>😴</Text>
      <Text style={styles.insightTitle}>Sleep Pattern</Text>
      <Text style={styles.insightText}>
        Your average sleep quality over the last 30 days is{" "}
        <Text style={{ fontWeight: "700" }}>{qualityLabel}</Text> (
        {avgSleepQuality.toFixed(1)}/5).
        {poorPct > 30
          ? ` ${poorPct}% of nights were poor or very poor — poor sleep is a known acne trigger.`
          : " Keep maintaining consistent sleep quality."}
      </Text>
      <Text style={styles.insightCaveat}>
        This is an observational pattern from your data, not a medical
        conclusion.
      </Text>
    </Card>
  );
}

const INTELLIGENCE_MODULES = [
  { icon: '🧠', title: 'CutisAI', subtitle: 'Clinical skin assistant', route: '/modules/cutisai' },
  { icon: '🧬', title: 'Skin Twin', subtitle: 'Estimated projections', route: '/modules/skin-twin' },
  { icon: '🔍', title: 'TriggerGraph', subtitle: 'Patterns & forecast', route: '/modules/triggers' },
  { icon: '📋', title: 'Reports', subtitle: 'Dermatologist PDFs', route: '/modules/reports' },
  { icon: '🔬', title: 'FormulaLens', subtitle: 'Product intelligence', route: '/modules/formulalens' },
  { icon: '⚙️', title: 'Intelligence', subtitle: 'ML engine status', route: '/modules/intelligence' },
  { icon: '🔬', title: 'Research', subtitle: 'Anonymous learning', route: '/modules/research' },
  { icon: '🔒', title: 'Privacy', subtitle: 'Data controls', route: '/modules/privacy' },
];

export default function InsightsScreen() {
  const router = useRouter();
  const { user } = useAuthStore();

  const { data: summary, isLoading } = useQuery({
    queryKey: ["insights-data", user?.id],
    queryFn: () => fetchInsightsData(user!.id, 30),
    enabled: !!user,
  });

  const hasEnoughData = (summary?.totalLogs ?? 0) >= MIN_LOGS_FOR_INSIGHTS;

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <Text style={styles.title}>Insights</Text>
          <Text style={styles.subtitle}>
            Patterns derived from your personal logs. No fabricated scores.
          </Text>
        </View>

        {/* Intelligence Hub */}
        <View style={styles.hubSection}>
          <Text style={styles.hubTitle}>Intelligence Modules</Text>
          <View style={styles.hubGrid}>
            {INTELLIGENCE_MODULES.map(mod => (
              <TouchableOpacity
                key={mod.route}
                onPress={() => router.push(mod.route as never)}
                style={styles.hubCard}
                accessibilityRole="button"
                accessibilityLabel={mod.title}
              >
                <Text style={styles.hubIcon}>{mod.icon}</Text>
                <Text style={styles.hubCardTitle}>{mod.title}</Text>
                <Text style={styles.hubCardSubtitle}>{mod.subtitle}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {isLoading && (
          <Text style={styles.loadingText}>Analyzing your data...</Text>
        )}

        {!isLoading && !hasEnoughData && (
          <EmptyState
            title="Not enough data yet"
            message={`You have ${summary?.totalLogs ?? 0} log${(summary?.totalLogs ?? 0) !== 1 ? "s" : ""}. Log for a few more days to unlock pattern analysis. AcneTrex will never fabricate insights from insufficient data.`}
          />
        )}

        {!isLoading && hasEnoughData && summary && (
          <>
            {/* Sleep insight */}
            <SleepInsightCard summary={summary} />

            {/* Treatment adherence */}
            {summary.treatmentAdherence !== null && (
              <AdherenceCard rate={summary.treatmentAdherence} />
            )}

            {/* Sleep quality trend */}
            {summary.sleepLogs.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Sleep Quality Trend</Text>
                <Card>
                  {summary.sleepLogs
                    .filter((l) => l.quality !== null)
                    .slice(0, 14)
                    .map((l) => (
                      <SleepQualityBar
                        key={l.id}
                        quality={l.quality!}
                        date={l.log_date}
                      />
                    ))}
                </Card>
              </View>
            )}

            {/* Data quality */}
            <Card style={styles.dataCard}>
              <Text style={styles.dataTitle}>📊 Data Quality (30 days)</Text>
              <View style={styles.dataRow}>
                <Text style={styles.dataLabel}>Total logs</Text>
                <Text style={styles.dataValue}>{summary.totalLogs}</Text>
              </View>
              <View style={styles.dataRow}>
                <Text style={styles.dataLabel}>Sleep logs</Text>
                <Text style={styles.dataValue}>{summary.sleepLogs.length}</Text>
              </View>
              <View style={styles.dataRow}>
                <Text style={styles.dataLabel}>Food logs</Text>
                <Text style={styles.dataValue}>{summary.foodLogs.length}</Text>
              </View>
              <View style={styles.dataRow}>
                <Text style={styles.dataLabel}>Treatment check-ins</Text>
                <Text style={styles.dataValue}>
                  {summary.treatmentCheckins.length}
                </Text>
              </View>
            </Card>

            {/* Honesty note */}
            <View style={styles.honestyNote}>
              <Text style={styles.honestyText}>
                All insights above are derived directly from your logged data.
                AcneTrex does not fabricate scores, correlations, or
                recommendations. When data is insufficient, nothing is shown.
              </Text>
            </View>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  content: { padding: Spacing.lg, paddingBottom: Spacing.xxl },
  header: { marginBottom: Spacing.lg },
  title: { ...Typography.largeTitle, color: Colors.textPrimary },
  subtitle: { ...Typography.body, color: Colors.textSecondary, marginTop: 4 },
  loadingText: {
    ...Typography.body,
    color: Colors.textMuted,
    textAlign: "center",
    padding: Spacing.xl,
  },
  insightCard: {
    marginBottom: Spacing.lg,
    borderColor: Colors.primaryMid,
    backgroundColor: Colors.primaryLight,
  },
  insightIcon: { fontSize: 24, marginBottom: 6 },
  insightTitle: {
    ...Typography.bodyMedium,
    color: Colors.primaryDark,
    marginBottom: 4,
  },
  insightText: {
    ...Typography.body,
    color: Colors.primaryDark,
    lineHeight: 22,
    marginBottom: 8,
  },
  insightCaveat: {
    ...Typography.caption,
    color: Colors.primary,
    fontStyle: "italic",
  },
  adherenceCard: { marginBottom: Spacing.lg },
  adherenceTitle: {
    ...Typography.bodyMedium,
    color: Colors.textPrimary,
    marginBottom: Spacing.sm,
  },
  adherenceRow: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  adherencePct: { fontSize: 36, fontWeight: "800" },
  adherenceLabel: { ...Typography.body, color: Colors.textSecondary },
  progressBar: {
    height: 8,
    backgroundColor: Colors.border,
    borderRadius: BorderRadius.full,
    overflow: "hidden",
    marginBottom: Spacing.sm,
  },
  progressFill: { height: "100%", borderRadius: BorderRadius.full },
  adherenceHint: { ...Typography.caption, color: Colors.textSecondary },
  section: { marginBottom: Spacing.lg },
  sectionTitle: {
    ...Typography.title3,
    color: Colors.textPrimary,
    marginBottom: Spacing.sm,
  },
  trendBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    marginBottom: 8,
  },
  trendDate: { ...Typography.caption, color: Colors.textMuted, width: 36 },
  trendBarBg: {
    flex: 1,
    height: 12,
    backgroundColor: Colors.border,
    borderRadius: BorderRadius.full,
    overflow: "hidden",
  },
  trendBarFill: { height: "100%", borderRadius: BorderRadius.full },
  trendState: {
    ...Typography.caption,
    color: Colors.textSecondary,
    width: 80,
  },
  dataCard: { marginBottom: Spacing.lg },
  dataTitle: {
    ...Typography.bodyMedium,
    color: Colors.textPrimary,
    marginBottom: Spacing.sm,
  },
  dataRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  dataLabel: { ...Typography.body, color: Colors.textSecondary },
  dataValue: { ...Typography.bodyMedium, color: Colors.textPrimary },
  honestyNote: {
    backgroundColor: Colors.gray100,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
  },
  honestyText: {
    ...Typography.caption,
    color: Colors.textMuted,
    textAlign: "center",
    lineHeight: 18,
  },
  hubSection: { marginBottom: Spacing.lg },
  hubTitle: { ...Typography.title3, color: Colors.textPrimary, marginBottom: Spacing.md },
  hubGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  hubCard: {
    width: '47%', backgroundColor: Colors.surface, borderRadius: BorderRadius.lg,
    padding: Spacing.md, borderWidth: 1, borderColor: Colors.border,
  },
  hubIcon: { fontSize: 24, marginBottom: 4 },
  hubCardTitle: { ...Typography.bodyMedium, color: Colors.textPrimary },
  hubCardSubtitle: { ...Typography.caption, color: Colors.textMuted, marginTop: 2 },
});
