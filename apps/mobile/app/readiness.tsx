/**
 * Developer Readiness Console
 * Internal tool for checking backend connectivity and ML runtime status.
 * Not part of the user-facing app flow.
 */
import { useEffect, useState } from "react";
import { ScrollView, StyleSheet, Text, Pressable } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { supabase } from "../src/lib/supabase";

type State = { label: string; value: string };

export default function ReadinessScreen() {
  const [states, setStates] = useState<State[]>([
    { label: "Supabase", value: "checking" },
    { label: "Auth", value: "checking" },
  ]);

  useEffect(() => {
    const run = async () => {
      const results: State[] = [];

      // Check Supabase connectivity
      try {
        const { error } = await supabase.from("profiles").select("id").limit(1);
        if (error && error.code !== "42501") {
          results.push({ label: "Supabase DB", value: `error: ${error.code}` });
        } else {
          results.push({ label: "Supabase DB", value: "connected" });
        }
      } catch (e) {
        results.push({ label: "Supabase DB", value: "unreachable" });
      }

      // Check auth session
      const { data: { session } } = await supabase.auth.getSession();
      results.push({
        label: "Auth Session",
        value: session ? `active (${session.user.email})` : "none",
      });

      // Check env vars
      results.push({
        label: "SUPABASE_URL",
        value: process.env.EXPO_PUBLIC_SUPABASE_URL ? "set" : "MISSING",
      });
      results.push({
        label: "SUPABASE_KEY",
        value: process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY ? "set" : "MISSING",
      });
      results.push({
        label: "API_BASE",
        value: process.env.EXPO_PUBLIC_API_BASE_URL ?? "not set",
      });

      setStates(results);
    };
    run();
  }, []);

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>🔬 Readiness Console</Text>
        <Text style={styles.subtitle}>AcneTrex v3 — Phase 1 Debug</Text>
        {states.map((s) => (
          <View key={s.label} style={styles.row}>
            <Text style={styles.label}>{s.label}</Text>
            <Text
              style={[
                styles.value,
                s.value === "connected" || s.value === "set" || s.value.startsWith("active")
                  ? styles.ok
                  : s.value === "checking"
                  ? styles.pending
                  : styles.error,
              ]}
            >
              {s.value}
            </Text>
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

import { View } from "react-native";

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#f5faf8" },
  content: { padding: 20, gap: 12 },
  title: { fontSize: 22, fontWeight: "800", color: "#17211d" },
  subtitle: { fontSize: 14, color: "#475569", marginBottom: 16 },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    backgroundColor: "#fff",
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#dbe7e2",
  },
  label: { fontSize: 14, fontWeight: "600", color: "#17211d" },
  value: { fontSize: 14, color: "#475569" },
  ok: { color: "#047857", fontWeight: "700" },
  pending: { color: "#d97706" },
  error: { color: "#dc2626", fontWeight: "700" },
});
