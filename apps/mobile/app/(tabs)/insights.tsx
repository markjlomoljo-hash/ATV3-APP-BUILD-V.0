import { useState } from "react";
import { View, Text, StyleSheet, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { useAuthStore } from "../../src/stores/auth";
import {
  fetchInsightsData,
  InsightsSummary,
} from "../../src/lib/daily-logs-service";
import {
  runSleepAnalysis,
  type SleepAnalysisOutcome,
  type CloudSubmissionState,
} from "../../src/lib/sleep-analysis";
import { buildInsightWithUncertainty } from "../../src/lib/insight-uncertainty";
import type { UncertaintyMarker } from "../../src/lib/contracts";
import { Button, Card, EmptyState } from "../../src/components/ui";
import {
  Colors,
  Spacing,
  Typography,
  BorderRadius,
} from "../../src/components/ui/theme";

const MIN_LOGS_FOR_INSIGHTS = 5;
const INSIGHTS_WINDOW_DAYS = 30;
// Same threshold the render gate below already applies to the sleep pattern.
const SLEEP_INSIGHT_MIN_LOGS = 3;
// A week of daily check-ins before the adherence ratio counts as reliable.
const ADHERENCE_MIN_CHECKINS = 7;

// ─── Uncertainty marker rendering (contracts.ts UncertaintyMarker) ───────────

const CONFIDENCE_COLORS: Record<UncertaintyMarker["confidence"], string> = {
  high: Colors.success,
  medium: Colors.warning,
  low: Colors.textMuted,
};

/**
 * Renders the InsightWithUncertainty contract fields for an insight card:
 * confidence pill, basis, real data-point coverage, and the coverage-derived
 * caveat — replacing the old static caveat sentence.
 */
function UncertaintyRow({
  marker,
  dataPointCount,
  minDataPointsRequired,
}: {
  marker: UncertaintyMarker;
  dataPointCount: number;
  minDataPointsRequired: number;
}) {
  return (
    <View style={styles.uncertaintyRow}>
      <View style={styles.uncertaintyBadges}>
        <View
          style={[
            styles.confidencePill,
            { borderColor: CONFIDENCE_COLORS[marker.confidence] },
          ]}
        >
          <Text
            style={[
              styles.confidencePillText,
              { color: CONFIDENCE_COLORS[marker.confidence] },
            ]}
          >
            {marker.confidence} confidence
          </Text>
        </View>
        <Text style={styles.uncertaintyMeta}>
          {marker.basis} · {dataPointCount}/{minDataPointsRequired} data points
        </Text>
      </View>
      {marker.caveat && <Text style={styles.uncertaintyCaveat}>{marker.caveat}</Text>}
    </View>
  );
}

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

function AdherenceCard({
  rate,
  checkinCount,
}: {
  rate: number;
  checkinCount: number;
}) {
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

  // Marker derived from real coverage: how many check-ins actually back the
  // ratio, against the documented minimum for a reliable pattern.
  const insight = buildInsightWithUncertainty(rate, {
    dataPointCount: checkinCount,
    minDataPointsRequired: ADHERENCE_MIN_CHECKINS,
    windowDays: INSIGHTS_WINDOW_DAYS,
    dataPointLabel: "treatment check-ins",
  });

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
      <UncertaintyRow
        marker={insight.uncertainty}
        dataPointCount={insight.dataPointCount}
        minDataPointsRequired={insight.minDataPointsRequired}
      />
    </Card>
  );
}

function SleepInsightCard({ summary }: { summary: InsightsSummary }) {
  const { avgSleepQuality, sleepLogs } = summary;
  const ratedLogs = sleepLogs.filter((l) => l.quality !== null);
  if (!avgSleepQuality || ratedLogs.length < SLEEP_INSIGHT_MIN_LOGS) return null;

  const qualityLabel =
    avgSleepQuality >= 4.5
      ? "Excellent"
      : avgSleepQuality >= 3.5
      ? "Good"
      : avgSleepQuality >= 2.5
      ? "Fair"
      : "Poor";

  const poorNights = ratedLogs.filter((l) => (l.quality ?? 3) <= 2).length;
  const poorPct = Math.round((poorNights / ratedLogs.length) * 100);

  // Marker derived from the real number of rated sleep logs in the window.
  const insight = buildInsightWithUncertainty(avgSleepQuality, {
    dataPointCount: ratedLogs.length,
    minDataPointsRequired: SLEEP_INSIGHT_MIN_LOGS,
    windowDays: INSIGHTS_WINDOW_DAYS,
    dataPointLabel: "rated sleep logs",
  });

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
      <UncertaintyRow
        marker={insight.uncertainty}
        dataPointCount={insight.dataPointCount}
        minDataPointsRequired={insight.minDataPointsRequired}
      />
    </Card>
  );
}

function formatMinutes(minutes: number | null): string {
  if (minutes === null) return "not enough data";
  const hours = Math.floor(minutes / 60);
  const rest = Math.round(minutes % 60);
  return `${hours}h ${rest}m`;
}

function submissionLabel(submission: CloudSubmissionState): string {
  switch (submission.status) {
    case "cloud_submitted":
      return `Submitted to the cloud pipeline (job ${submission.jobId.slice(0, 8)}…).`;
    case "queued_for_cloud":
      return "Cloud sync queued — the job is stored on-device and will submit when a connection is available.";
    case "api_not_configured":
      return "Cloud API not configured (EXPO_PUBLIC_API_BASE_URL is unset) — this result was computed on-device only and was not submitted anywhere.";
    case "auth_required":
      return "Sign-in required before this job can be submitted to the cloud pipeline.";
    case "submit_failed":
      return `Cloud submission failed (${submission.errorCode}). The on-device result above is unaffected.`;
  }
}

const READINESS_LABELS: Record<string, { label: string; color: string }> = {
  ready: { label: "Ready", color: Colors.success },
  partial: { label: "Partial data", color: Colors.warning },
  insufficient_data: { label: "Insufficient data", color: Colors.textMuted },
};

/**
 * SleepDerm deterministic analysis. Every state below is honest:
 * - a real on-device result computed from logged bed/wake times,
 * - queued_for_cloud / api_not_configured / auth_required for submission,
 * - insufficient_data when the logs cannot support the analysis,
 * - model_unavailable when the engine refused the data.
 */
function SleepDermCard({ userId }: { userId: string }) {
  const [running, setRunning] = useState(false);
  const [outcome, setOutcome] = useState<SleepAnalysisOutcome | null>(null);
  const [error, setError] = useState<string | null>(null);

  const run = async () => {
    setRunning(true);
    setError(null);
    try {
      setOutcome(await runSleepAnalysis(userId));
    } catch (e) {
      setOutcome(null);
      setError(e instanceof Error ? e.message : "sleep_analysis_failed");
    } finally {
      setRunning(false);
    }
  };

  return (
    <Card style={styles.sleepDermCard}>
      <Text style={styles.sleepDermTitle}>😴 SleepDerm Analysis</Text>
      <Text style={styles.sleepDermSubtitle}>
        Deterministic on-device analysis of your logged sleep times from the
        last 14 days. Nothing is estimated or invented.
      </Text>

      {outcome === null && !error && (
        <Button
          title={running ? "Analyzing..." : "Run Sleep Analysis"}
          onPress={run}
          loading={running}
          style={{ marginTop: Spacing.sm }}
        />
      )}

      {error && (
        <View style={styles.sleepDermStateBox}>
          <Text style={styles.sleepDermStateTitle}>Analysis failed</Text>
          <Text style={styles.sleepDermStateText}>
            {error}. No result was generated.
          </Text>
        </View>
      )}

      {outcome?.status === "insufficient_data" && (
        <View style={styles.sleepDermStateBox}>
          <Text style={styles.sleepDermStateTitle}>Insufficient data</Text>
          <Text style={styles.sleepDermStateText}>
            {outcome.totalSleepLogs} sleep log
            {outcome.totalSleepLogs === 1 ? "" : "s"} found in the last 14 days,
            but only {outcome.usableNights} include
            {outcome.usableNights === 1 ? "s" : ""} both bed and wake times. The
            engine needs at least {outcome.requiredNights} nights with both
            times. No analysis was generated. To unlock it, add bed and wake
            times when logging sleep in the Logs tab.
          </Text>
        </View>
      )}

      {outcome?.status === "model_unavailable" && (
        <View style={styles.sleepDermStateBox}>
          <Text style={styles.sleepDermStateTitle}>Model unavailable</Text>
          <Text style={styles.sleepDermStateText}>
            The on-device sleep engine could not analyze your logged data (
            {outcome.errorCode}). No result was generated.
          </Text>
        </View>
      )}

      {outcome?.status === "analyzed" && (
        <View style={styles.sleepDermResult}>
          <View style={styles.sleepDermRow}>
            <Text style={styles.sleepDermLabel}>Nights analyzed</Text>
            <Text style={styles.sleepDermValue}>{outcome.analysis.nights}</Text>
          </View>
          <View style={styles.sleepDermRow}>
            <Text style={styles.sleepDermLabel}>Average duration</Text>
            <Text style={styles.sleepDermValue}>
              {formatMinutes(outcome.analysis.averageDurationMinutes)}
            </Text>
          </View>
          <View style={styles.sleepDermRow}>
            <Text style={styles.sleepDermLabel}>Schedule regularity</Text>
            <Text style={styles.sleepDermValue}>
              {outcome.analysis.regularityMinutes === null
                ? "not enough data"
                : `±${Math.round(outcome.analysis.regularityMinutes)} min drift`}
            </Text>
          </View>
          <View style={styles.sleepDermRow}>
            <Text style={styles.sleepDermLabel}>Readiness</Text>
            <Text
              style={[
                styles.sleepDermValue,
                {
                  color:
                    READINESS_LABELS[outcome.analysis.readiness]?.color ??
                    Colors.textPrimary,
                },
              ]}
            >
              {READINESS_LABELS[outcome.analysis.readiness]?.label ??
                outcome.analysis.readiness}
            </Text>
          </View>

          <Text style={styles.sleepDermSubmission}>
            {submissionLabel(outcome.submission)}
          </Text>

          {outcome.analysis.limitations.map((limitation) => (
            <Text key={limitation} style={styles.sleepDermCaveat}>
              {limitation}
            </Text>
          ))}
        </View>
      )}

      {(outcome !== null || error !== null) && (
        <Button
          title={running ? "Analyzing..." : "Run Again"}
          onPress={run}
          loading={running}
          variant="ghost"
          style={{ marginTop: Spacing.sm }}
        />
      )}
    </Card>
  );
}

function ToolLink({
  icon,
  title,
  description,
  onPress,
}: {
  icon: string;
  title: string;
  description: string;
  onPress: () => void;
}) {
  return (
    <Card style={styles.toolCard} onPress={onPress}>
      <View style={styles.toolRow}>
        <Text style={styles.toolIcon}>{icon}</Text>
        <View style={{ flex: 1 }}>
          <Text style={styles.toolTitle}>{title}</Text>
          <Text style={styles.toolDesc}>{description}</Text>
        </View>
        <Text style={styles.toolArrow}>›</Text>
      </View>
    </Card>
  );
}

export default function InsightsScreen() {
  const { user } = useAuthStore();
  const router = useRouter();

  const { data: summary, isLoading } = useQuery({
    queryKey: ["insights-data", user?.id],
    queryFn: () => fetchInsightsData(user!.id, INSIGHTS_WINDOW_DAYS),
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

        {/* Tools — each opens its own honest, readiness-gated screen. */}
        <View style={styles.section}>
          <ToolLink
            icon="📅"
            title="ClearPath 7-day view"
            description="Forecast readiness from your real outcome history — no invented forecasts."
            onPress={() => router.push("/clearpath" as never)}
          />
          <ToolLink
            icon="🧪"
            title="FormulaLens"
            description="Deterministic on-device ingredient review from a pasted ingredient list."
            onPress={() => router.push("/formula-lens" as never)}
          />
          <ToolLink
            icon="💊"
            title="Treatment protocol"
            description="Your recorded AM/PM regimen, plan check-ins, and adherence from real history."
            onPress={() => router.push("/treatment" as never)}
          />
        </View>

        {/* SleepDerm deterministic analysis — always available; fails closed
            with honest states when data or infrastructure is missing. */}
        {user && <SleepDermCard userId={user.id} />}

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
              <AdherenceCard
                rate={summary.treatmentAdherence}
                checkinCount={summary.treatmentCheckins.length}
              />
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
  sleepDermCard: { marginBottom: Spacing.lg },
  sleepDermTitle: {
    ...Typography.bodyMedium,
    color: Colors.textPrimary,
    marginBottom: 4,
  },
  sleepDermSubtitle: {
    ...Typography.caption,
    color: Colors.textSecondary,
    lineHeight: 18,
    marginBottom: Spacing.sm,
  },
  sleepDermStateBox: {
    backgroundColor: Colors.gray100,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    marginTop: Spacing.sm,
  },
  sleepDermStateTitle: {
    ...Typography.bodyMedium,
    color: Colors.textPrimary,
    marginBottom: 4,
  },
  sleepDermStateText: {
    ...Typography.caption,
    color: Colors.textSecondary,
    lineHeight: 18,
  },
  sleepDermResult: { marginTop: Spacing.sm },
  sleepDermRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  sleepDermLabel: { ...Typography.body, color: Colors.textSecondary },
  sleepDermValue: { ...Typography.bodyMedium, color: Colors.textPrimary },
  sleepDermSubmission: {
    ...Typography.caption,
    color: Colors.textSecondary,
    lineHeight: 18,
    marginTop: Spacing.sm,
  },
  sleepDermCaveat: {
    ...Typography.caption,
    color: Colors.textMuted,
    fontStyle: "italic",
    lineHeight: 16,
    marginTop: 6,
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
  uncertaintyRow: { marginTop: 4, gap: 4 },
  uncertaintyBadges: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    flexWrap: "wrap",
  },
  confidencePill: {
    borderWidth: 1.5,
    borderRadius: BorderRadius.full,
    paddingHorizontal: 10,
    paddingVertical: 2,
  },
  confidencePillText: { fontSize: 11, fontWeight: "700" },
  uncertaintyMeta: { ...Typography.caption, color: Colors.textMuted },
  uncertaintyCaveat: {
    ...Typography.caption,
    color: Colors.textMuted,
    fontStyle: "italic",
    lineHeight: 16,
  },
  toolCard: { marginBottom: Spacing.sm },
  toolRow: { flexDirection: "row", alignItems: "center", gap: Spacing.md },
  toolIcon: { fontSize: 24 },
  toolTitle: { ...Typography.bodyMedium, color: Colors.textPrimary },
  toolDesc: {
    ...Typography.caption,
    color: Colors.textSecondary,
    marginTop: 2,
    lineHeight: 16,
  },
  toolArrow: { fontSize: 22, color: Colors.textMuted, fontWeight: "300" },
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
});
