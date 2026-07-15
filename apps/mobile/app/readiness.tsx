/**
 * Developer Readiness Console
 * Internal tool for checking backend connectivity and ML runtime status.
 * Not part of the user-facing app flow.
 */
import { useEffect, useState } from "react";
import * as Crypto from "expo-crypto";
import { AppState, Pressable, ScrollView, StyleSheet, Text } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { evaluateReadiness } from "../packages/ml-local-runtime/src/deterministic/readiness";
import type { MobileMlJobStatusResponse } from "../packages/ml-local-runtime/src/mobile-job-coordinator";
import {
  loadLatestCachedMlResult,
  loadSleepDermInputs,
  mobileMlCoordinator,
  replayPendingMlOperations,
  resumePendingMlJobs,
} from "../src/lib/ml";
import {
  getCanonicalConsent,
  updateCanonicalConsent,
  type CanonicalConsent,
} from "../src/lib/consent";
import { presentForecastOutput, presentSleepDermOutput } from "../src/lib/ml-result-presentation";

type State = { label: string; value: string };

function scalar(analysis: Readonly<Record<string, unknown>> | null | undefined, key: string) {
  const value = analysis?.[key];
  return typeof value === "string" || typeof value === "number" ? String(value) : "not_available";
}

function list(analysis: Readonly<Record<string, unknown>> | null | undefined, key: string) {
  const value = analysis?.[key];
  return Array.isArray(value) && value.every((item) => typeof item === "string")
    ? value.join(", ") || "none"
    : "not_available";
}

export default function ReadinessScreen() {
  const [states, setStates] = useState<State[]>([{ label: "Backend", value: "checking" }]);
  const [networkAvailable, setNetworkAvailable] = useState(false);
  const [jobState, setJobState] = useState("not_requested");
  const [latestResult, setLatestResult] = useState<MobileMlJobStatusResponse | null>(null);
  const [consent, setConsent] = useState<CanonicalConsent | null>(null);
  const [consentState, setConsentState] = useState("checking");

  useEffect(() => {
    const base = process.env.EXPO_PUBLIC_API_BASE_URL?.replace(/\/+$/, "");
    if (!base) {
      setNetworkAvailable(false);
      setStates([{ label: "Backend", value: "not_configured" }]);
      return;
    }
    let mounted = true;
    let probing = false;
    const probeHealth = async () => {
      if (probing) return;
      probing = true;
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 8_000);
      try {
        const response = await fetch(`${base}/api/health`, { signal: controller.signal });
        const body = await response.json().catch(() => ({}));
        if (!mounted) return;
        setNetworkAvailable(response.ok);
        setStates([
          { label: "Backend", value: response.ok ? "ready" : "degraded" },
          { label: "Database", value: body.database?.status ?? "unavailable" },
          { label: "Cloud ML", value: body.cloudRun?.status ?? "unavailable" },
        ]);
      } catch {
        if (!mounted) return;
        setNetworkAvailable(false);
        setStates([{ label: "Backend", value: "unavailable" }]);
      } finally {
        clearTimeout(timeout);
        probing = false;
      }
    };
    void probeHealth();
    const interval = setInterval(() => void probeHealth(), 15_000);
    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "active") void probeHealth();
    });
    return () => {
      mounted = false;
      clearInterval(interval);
      subscription.remove();
    };
  }, []);

  useEffect(() => {
    void getCanonicalConsent().then((response) => {
      setConsent(response.consent);
      setConsentState("ready");
    }).catch((error) => {
      setConsentState(error instanceof Error ? error.message : "unavailable");
    });
    void loadLatestCachedMlResult().then(setLatestResult).catch(() => undefined);
  }, []);

  useEffect(() => {
    if (!networkAvailable) return;
    const syncPending = async () => {
      await replayPendingMlOperations();
      const completed = await resumePendingMlJobs();
      const latest = completed.at(-1) ?? await loadLatestCachedMlResult();
      if (latest) setLatestResult(latest);
    };
    void syncPending().catch(() => undefined);
    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "active") void syncPending().catch(() => undefined);
    });
    return () => subscription.remove();
  }, [networkAvailable]);

  const local = evaluateReadiness({
    required: { consent: null, timezone: "Asia/Manila" },
    optional: { history: null },
    sampleCount: 0,
    minimumSamples: 7,
  });

  const requestAnalysis = async () => {
    setJobState("submitting");
    try {
      const sleep = await loadSleepDermInputs();
      const result = await mobileMlCoordinator.execute({
        engine: "sleepderm",
        operation: "sleep_pattern_analysis",
        inputRecordRefs: sleep.inputRecordRefs,
        features: sleep.features,
        metadata: {
          featureSchemaVersion: "1.0.0",
          appVersion: "0.1.0",
          clientRequestId: Crypto.randomUUID(),
        },
      }, { networkAvailable });
      if (result.mode !== "cloud") {
        setJobState(result.errorCode ? `${result.mode}:${result.errorCode}` : result.mode);
        return;
      }
      setJobState("processing");
      const completed = await mobileMlCoordinator.waitForResult(result.jobId);
      setLatestResult(completed);
      const readiness = completed.job.analysis?.readinessState;
      setJobState(readiness ? `${completed.job.status}:${String(readiness)}` : completed.job.status);
    } catch (error) {
      setJobState(error instanceof Error ? error.message : "error_retryable");
    }
  };

  const requestForecast = async () => {
    setJobState("submitting");
    try {
      const result = await mobileMlCoordinator.execute({
        engine: "forecast",
        operation: "flare_direction",
        inputRecordRefs: [],
        // The worker derives predictive features from owner-scoped server rows.
        features: {},
        metadata: {
          featureSchemaVersion: "1.0.0",
          appVersion: "0.1.0",
          clientRequestId: Crypto.randomUUID(),
        },
      }, { networkAvailable });
      if (result.mode !== "cloud") {
        setJobState(result.errorCode ? `${result.mode}:${result.errorCode}` : result.mode);
        return;
      }
      setJobState("processing");
      const completed = await mobileMlCoordinator.waitForResult(result.jobId);
      setLatestResult(completed);
      const readiness = completed.job.analysis?.readinessState;
      setJobState(readiness ? `${completed.job.status}:${String(readiness)}` : completed.job.status);
    } catch (error) {
      setJobState(error instanceof Error ? error.message : "error_retryable");
    }
  };

  const togglePersonalProcessing = async () => {
    setConsentState("updating");
    try {
      const response = await updateCanonicalConsent({
        personalProcessing: !(consent?.personalProcessing ?? false),
      });
      setConsent(response.consent);
      setConsentState("ready");
    } catch (error) {
      setConsentState(error instanceof Error ? error.message : "unavailable");
    }
  };

  const analysis = latestResult?.job.analysis;
  const output = analysis && typeof analysis.output === "object" && analysis.output !== null
    ? analysis.output
    : null;
  const outputRows = analysis?.resultType === "calibrated_predictive_ensemble"
    ? presentForecastOutput(output)
    : presentSleepDermOutput(output);
  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>Readiness</Text>
        {states.map((state) => <Text key={state.label} style={styles.row}>{state.label}: {state.value}</Text>)}
        <Text style={styles.row}>Personal ML processing: {consent?.personalProcessing ? "allowed" : "not allowed"} ({consentState})</Text>
        <Text style={styles.row}>Personal learning: {consent?.personalLearning ? "allowed" : "not allowed"} (separate purpose)</Text>
        <Text style={styles.row}>Raw image processing: {consent?.rawImageProcessing ? "allowed" : "not allowed"}</Text>
        <Text style={styles.row}>Raw image retention: {consent?.rawImageRetention ? "allowed" : "not allowed"} (separate purpose)</Text>
        <Pressable accessibilityRole="button" onPress={togglePersonalProcessing} style={styles.secondaryButton}>
          <Text style={styles.secondaryButtonText}>{consent?.personalProcessing ? "Withdraw personal ML processing" : "Allow personal ML processing"}</Text>
        </Pressable>
        <Text style={styles.row}>Local deterministic readiness: {local.state} ({Math.round(local.coverage * 100)}% coverage)</Text>
        <Pressable accessibilityRole="button" onPress={requestAnalysis} style={styles.button}>
          <Text style={styles.buttonText}>Request SleepDerm cloud analysis</Text>
        </Pressable>
        <Pressable accessibilityRole="button" onPress={requestForecast} style={styles.button}>
          <Text style={styles.buttonText}>Request calibrated flare-direction estimate</Text>
        </Pressable>
        <Text style={styles.row}>ML job: {jobState}</Text>
        {latestResult ? (
          <>
            <Text style={styles.sectionTitle}>Latest durable result</Text>
            <Text style={styles.row}>Status: {latestResult.job.status}</Text>
            <Text style={styles.row}>Readiness: {scalar(analysis, "readinessState")}</Text>
            <Text style={styles.row}>Coverage: {scalar(analysis, "coverage")}</Text>
            <Text style={styles.row}>Missing inputs: {list(analysis, "featuresMissing")}</Text>
            <Text style={styles.row}>Confidence: {scalar(analysis, "confidence")} ({scalar(analysis, "confidenceLabel")})</Text>
            <Text style={styles.row}>Uncertainty: {list(analysis, "uncertainty")}</Text>
            <Text style={styles.row}>Limitations: {list(analysis, "limitations")}</Text>
            <Text style={styles.row}>Runtime: {scalar(analysis, "runtimeMode")}</Text>
            <Text style={styles.row}>Model: {scalar(analysis, "modelName")} / {scalar(analysis, "modelVersion")}</Text>
            {outputRows.map((row) => (
              <Text key={row.label} style={styles.row}>{row.label}: {row.value}</Text>
            ))}
          </>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#f8fafc" },
  content: { padding: 20, gap: 12 },
  title: { fontSize: 28, fontWeight: "800", color: "#17211d" },
  sectionTitle: { fontSize: 20, fontWeight: "700", color: "#17211d", marginTop: 8 },
  row: { backgroundColor: "white", borderRadius: 12, padding: 16, color: "#334155" },
  button: { backgroundColor: "#047857", borderRadius: 12, padding: 16 },
  buttonText: { color: "white", fontWeight: "700", textAlign: "center" },
  secondaryButton: { backgroundColor: "#e2e8f0", borderRadius: 12, padding: 16 },
  secondaryButtonText: { color: "#17211d", fontWeight: "700", textAlign: "center" },
});
