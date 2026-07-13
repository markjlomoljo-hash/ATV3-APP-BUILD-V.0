import { useEffect, useState } from "react";
import { ScrollView, StyleSheet, Text } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

type State = { label: string; value: string };

export default function ReadinessScreen() {
  const [states, setStates] = useState<State[]>([{ label: "Backend", value: "checking" }]);
  useEffect(() => {
    const base = process.env.EXPO_PUBLIC_API_BASE_URL?.replace(/\/+$/, "");
    if (!base) { setStates([{ label: "Backend", value: "not_configured" }]); return; }
    fetch(`${base}/api/health`).then(async (response) => {
      const body = await response.json();
      setStates([
        { label: "Backend", value: response.ok ? "ready" : "degraded" },
        { label: "Database", value: body.database?.status ?? "unavailable" },
        { label: "Cloud ML", value: body.cloudRun?.status ?? "unavailable" }
      ]);
    }).catch(() => setStates([{ label: "Backend", value: "unavailable" }]));
  }, []);
  return <SafeAreaView style={styles.safe}><ScrollView contentContainerStyle={styles.content}><Text style={styles.title}>Readiness</Text>{states.map((state) => <Text key={state.label} style={styles.row}>{state.label}: {state.value}</Text>)}</ScrollView></SafeAreaView>;
}

const styles = StyleSheet.create({ safe: { flex: 1, backgroundColor: "#f8fafc" }, content: { padding: 20, gap: 12 }, title: { fontSize: 28, fontWeight: "800", color: "#17211d" }, row: { backgroundColor: "white", borderRadius: 12, padding: 16, color: "#334155" } });
