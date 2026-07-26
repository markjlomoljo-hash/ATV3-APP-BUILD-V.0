/**
 * ClearPath — honest 7-day view.
 *
 * Renders the real forecast_readiness engine result and nothing more. Until
 * enough daily skin-outcome data exists, that result is insufficient_data
 * with true progress numbers; when ready, it is a retrospective trend
 * direction with the engine's own limitations. There is never a fabricated
 * forecast: the engine's prediction field is null by contract because no
 * validated forecasting model is active, and this screen says so verbatim.
 */
import { View, Text, StyleSheet, ScrollView, Pressable } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { useAuthStore } from "../src/stores/auth";
import { Button, Card, Badge } from "../src/components/ui";
import {
  Colors,
  Spacing,
  Typography,
  BorderRadius,
} from "../src/components/ui/theme";
import {
  CLEARPATH_HORIZON_DAYS,
  runClearPathForecast,
  WEATHER_CONTEXT,
} from "../src/lib/clearpath";
import type { CloudSubmissionState } from "../src/lib/sleep-analysis";

function submissionLabel(submission: CloudSubmissionState): string {
  switch (submission.status) {
    case "cloud_submitted":
      return `Result submitted to the cloud pipeline for tracking (job ${submission.jobId.slice(0, 8)}…).`;
    case "queued_for_cloud":
      return "Cloud sync queued — the job is stored on-device and will submit when a connection is available.";
    case "api_not_configured":
      return "Cloud API not configured (EXPO_PUBLIC_API_BASE_URL is unset) — this result was computed on-device only.";
    case "auth_required":
      return "Sign-in required before this job can be submitted to the cloud pipeline.";
    case "submit_failed":
      return `Cloud submission failed (${submission.errorCode}). The on-device result above is unaffected.`;
  }
}

const DIRECTION_LABELS: Record<string, string> = {
  stable: "Stable",
  increasing: "Increasing",
  decreasing: "Decreasing",
};

export default function ClearPathScreen() {
  const router = useRouter();
  const { user } = useAuthStore();

  const {
    data: outcome,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ["clearpath-forecast", user?.id],
    queryFn: () => runClearPathForecast(user!.id),
    enabled: !!user,
  });

  const readiness = outcome?.readiness;
  const progress =
    outcome && outcome.windowDays > 0
      ? Math.min(1, outcome.daysWithOutcome / outcome.windowDays)
      : 0;

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.headerRow}>
          <Text style={styles.title}>ClearPath</Text>
          <Pressable onPress={() => router.back()} style={styles.closeButton}>
            <Text style={styles.closeText}>✕</Text>
          </Pressable>
        </View>
        <Text style={styles.subtitle}>
          {CLEARPATH_HORIZON_DAYS}-day skin outlook — shown only when the
          readiness engine says your real data can support it.
        </Text>

        {isLoading && <Text style={styles.loadingText}>Checking your data...</Text>}

        {error != null && (
          <Card style={styles.errorCard}>
            <Text style={styles.errorText}>
              Readiness could not be checked:{" "}
              {error instanceof Error ? error.message : "unknown_error"}
            </Text>
            <Button
              title="Try again"
              variant="secondary"
              onPress={() => refetch()}
              style={{ marginTop: Spacing.sm }}
            />
          </Card>
        )}

        {readiness?.state === "insufficient_data" && outcome && (
          <>
            <Card style={styles.progressCard}>
              <Text style={styles.sectionTitle}>Not enough data yet</Text>
              <Text style={styles.progressCount}>
                {readiness.sampleCount} of {readiness.minimumSamples} outcome
                days recorded
              </Text>
              <View style={styles.progressBar}>
                <View style={[styles.progressFill, { width: `${progress * 100}%` }]} />
              </View>
              <Text style={styles.bodyText}>
                The forecast-readiness engine requires{" "}
                {readiness.minimumSamples} days with a recorded skin outcome
                inside the last {outcome.windowDays} days (and at least 80%
                coverage — currently {Math.round(readiness.coverage * 100)}%)
                before it will report on a {readiness.horizonDays}-day window.
                Until then it reports exactly this state, and AcneTrex shows
                no forecast rather than inventing one.
              </Text>
              <Text style={styles.bodyText}>
                An outcome day is a day whose latest FaceAtlas scan carries
                your own lesion count. Run guided captures and record your
                count to build the series.
              </Text>
              <Button
                title="Open FaceAtlas"
                onPress={() => router.push("/(tabs)/faceatlas" as never)}
                style={{ marginTop: Spacing.sm }}
              />
            </Card>
          </>
        )}

        {readiness?.state === "ready" && (
          <Card style={styles.readyCard}>
            <View style={styles.readyHeader}>
              <Text style={styles.sectionTitle}>Recent trend</Text>
              <Badge
                label={
                  DIRECTION_LABELS[readiness.deterministicRecentDirection] ??
                  readiness.deterministicRecentDirection
                }
              />
            </View>
            <Text style={styles.bodyText}>
              Across {readiness.sampleCount} recorded outcome days (
              {Math.round(readiness.coverage * 100)}% coverage), the recent
              deterministic trend in your recorded lesion counts is{" "}
              {readiness.deterministicRecentDirection}.
            </Text>
            <Text style={styles.bodyText}>
              Prediction: none. No validated forecasting model is active, so
              the engine returns no forecast value — only this retrospective
              summary.
            </Text>
            {readiness.limitations.map((limitation) => (
              <Text key={limitation} style={styles.limitation}>
                {limitation}
              </Text>
            ))}
            {outcome?.submission && (
              <Text style={styles.submission}>
                {submissionLabel(outcome.submission)}
              </Text>
            )}
          </Card>
        )}

        {/* Weather boundary — no fake weather, ever */}
        <Card style={styles.weatherCard}>
          <Text style={styles.sectionTitle}>🌤 Weather context</Text>
          <Text style={styles.bodyText}>{WEATHER_CONTEXT.detail}</Text>
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  content: { padding: Spacing.lg, paddingBottom: Spacing.xxl },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  title: { ...Typography.title2, color: Colors.textPrimary },
  closeButton: { padding: Spacing.sm },
  closeText: { fontSize: 18, color: Colors.textSecondary },
  subtitle: {
    ...Typography.body,
    color: Colors.textSecondary,
    marginTop: 4,
    marginBottom: Spacing.lg,
  },
  loadingText: {
    ...Typography.body,
    color: Colors.textMuted,
    textAlign: "center",
    padding: Spacing.xl,
  },
  errorCard: { borderColor: "#fecaca", backgroundColor: "#fef2f2" },
  errorText: { ...Typography.caption, color: Colors.error, lineHeight: 18 },
  progressCard: { gap: Spacing.sm },
  sectionTitle: { ...Typography.bodyMedium, color: Colors.textPrimary },
  progressCount: { ...Typography.title3, color: Colors.primary },
  progressBar: {
    height: 8,
    backgroundColor: Colors.border,
    borderRadius: BorderRadius.full,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.full,
  },
  bodyText: { ...Typography.caption, color: Colors.textSecondary, lineHeight: 18 },
  readyCard: { gap: Spacing.sm },
  readyHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: Spacing.sm,
  },
  limitation: {
    ...Typography.caption,
    color: Colors.textMuted,
    fontStyle: "italic",
    lineHeight: 16,
  },
  submission: { ...Typography.caption, color: Colors.textSecondary, lineHeight: 18 },
  weatherCard: {
    marginTop: Spacing.lg,
    backgroundColor: Colors.gray100,
    borderColor: Colors.borderLight,
    gap: 6,
  },
});
