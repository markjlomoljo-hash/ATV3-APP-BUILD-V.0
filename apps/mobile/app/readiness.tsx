import { useEffect, useState } from "react";
import * as Crypto from "expo-crypto";
import { ScrollView, StyleSheet, Text, Pressable } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { evaluateReadiness } from "../../../packages/ml-local-runtime/src/deterministic/readiness";
import { mobileMlCoordinator } from "../src/lib/ml";

type State = { label: string; value: string };

export default function ReadinessScreen() {
  const [states, setStates] = useState<State[]>([{ label: "Backend", value: "checking" }]);
  const [networkAvailable, setNetworkAvailable] = useState(false);
  const [jobState, setJobState] = useState("not_requested");
  useEffect(() => {
    const base = process.env.EXPO_PUBLIC_API_BASE_URL?.replace(/\/+$/, "");
    if (!base) { setStates([{ label: "Backend", value: "not_configured" }]); return; }
    fetch(`${base}/api/health`).then(async (response) => {
      const body = await response.json();
      setNetworkAvailable(response.ok);
      setStates([
        { label: "Backend", value: response.ok ? "ready" : "degraded" },
        { label: "Database", value: body.database?.status ?? "unavailable" },
        { label: "Cloud ML", value: body.cloudRun?.status ?? "unavailable" }
      ]);
    }).catch(() => { setNetworkAvailable(false); setStates([{ label: "Backend", value: "unavailable" }]); });
  }, []);
  const local = evaluateReadiness({ required: { consent: null, timezone: "Asia/Manila" }, optional: { history: null }, sampleCount: 0, minimumSamples: 7 });
  const requestAnalysis = async () => {
    setJobState("submitting");
    try {
      const result = await mobileMlCoordinator.execute({
        engine: "sleepderm",
        operation: "sleep_pattern_analysis",
        inputRecordRefs: [],
        features: { sampleCount: local.sampleCount, coverage: local.coverage },
        metadata: { featureSchemaVersion: "1.0.0", appVersion: "0.1.0", clientRequestId: Crypto.randomUUID() },
      }, { networkAvailable });
      setJobState(result.mode);
    } catch (error) {
      setJobState(error instanceof Error ? error.message : "error_retryable");
    }
  };
  return <SafeAreaView style={styles.safe}><ScrollView contentContainerStyle={styles.content}><Text style={styles.title}>Readiness</Text>{states.map((state) => <Text key={state.label} style={styles.row}>{state.label}: {state.value}</Text>)}<Text style={styles.row}>Local deterministic readiness: {local.state} ({Math.round(local.coverage * 100)}% coverage)</Text><Pressable accessibilityRole="button" onPress={requestAnalysis} style={styles.button}><Text style={styles.buttonText}>Request SleepDerm cloud analysis</Text></Pressable><Text style={styles.row}>ML job: {jobState}</Text></ScrollView></SafeAreaView>;
}

const styles = StyleSheet.create({ safe: { flex: 1, backgroundColor: "#f8fafc" }, content: { padding: 20, gap: 12 }, title: { fontSize: 28, fontWeight: "800", color: "#17211d" }, row: { backgroundColor: "white", borderRadius: 12, padding: 16, color: "#334155" }, button: { backgroundColor: "#047857", borderRadius: 12, padding: 16 }, buttonText: { color: "white", fontWeight: "700", textAlign: "center" } });
