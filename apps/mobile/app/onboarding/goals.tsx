import { useState } from "react";
import { View, Text, StyleSheet, ScrollView, Pressable } from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Button } from "../../src/components/ui";
import { OnboardingProgress } from "../../src/components/ui/OnboardingProgress";
import { Colors, Spacing, Typography, BorderRadius } from "../../src/components/ui/theme";
import { useAuthStore } from "../../src/stores/auth";
import { supabase } from "../../src/lib/supabase";

const GOALS = [
  { value: "understand_triggers", label: "Understand my triggers", icon: "🔍" },
  { value: "track_treatments", label: "Track treatment effectiveness", icon: "💊" },
  { value: "monitor_progress", label: "Monitor skin progress over time", icon: "📈" },
  { value: "prepare_for_derm", label: "Prepare for dermatologist visits", icon: "🩺" },
  { value: "identify_products", label: "Identify problematic products", icon: "🧴" },
  { value: "understand_patterns", label: "Understand sleep/food/stress patterns", icon: "🧠" },
  { value: "reduce_breakouts", label: "Reduce breakout frequency", icon: "✨" },
  { value: "manage_scarring", label: "Manage post-acne marks/scarring", icon: "🌿" },
];

const MEAL_FREQUENCY = [
  { value: "1", label: "1 meal/day" },
  { value: "2", label: "2 meals/day" },
  { value: "3", label: "3 meals/day" },
  { value: "variable", label: "Variable" },
  { value: "unknown", label: "Not sure" },
];

export default function GoalsScreen() {
  const router = useRouter();
  const { user } = useAuthStore();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedGoals, setSelectedGoals] = useState<string[]>([]);
  const [mealFrequency, setMealFrequency] = useState("");

  const toggleGoal = (value: string) => {
    setSelectedGoals((prev) =>
      prev.includes(value) ? prev.filter((g) => g !== value) : [...prev, value]
    );
  };

  const isValid = selectedGoals.length >= 1 && mealFrequency;

  const handleContinue = async () => {
    if (!user || !isValid) return;
    setSaving(true);
    setError(null);
    try {
      await supabase.from("profile_sections").upsert(
        [
          {
            user_id: user.id,
            section_key: "goals",
            value_json: { goals: selectedGoals },
            version: 1,
            updated_by: "user",
          },
          {
            user_id: user.id,
            section_key: "meal_baseline",
            value_json: {
              usual_meals_per_day: mealFrequency,
              set_during_onboarding: true,
            },
            version: 1,
            updated_by: "user",
          },
        ],
        { onConflict: "user_id,section_key" }
      );
      router.push("/onboarding/consent");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <OnboardingProgress current={2} total={4} label="Step 3 of 4" />

        <View style={styles.header}>
          <Text style={styles.eyebrow}>YOUR GOALS</Text>
          <Text style={styles.title}>What Matters to You</Text>
          <Text style={styles.subtitle}>
            Select all that apply. This helps AcneTrex prioritize what to
            surface in your dashboard.
          </Text>
        </View>

        {/* Goals */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>
            My goals with AcneTrex{" "}
            <Text style={styles.hint}>(select at least one)</Text>
          </Text>
          <View style={styles.goalsGrid}>
            {GOALS.map((g) => {
              const selected = selectedGoals.includes(g.value);
              return (
                <Pressable
                  key={g.value}
                  onPress={() => toggleGoal(g.value)}
                  style={[styles.goalCard, selected && styles.goalCardSelected]}
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: selected }}
                >
                  <Text style={styles.goalIcon}>{g.icon}</Text>
                  <Text
                    style={[
                      styles.goalLabel,
                      selected && styles.goalLabelSelected,
                    ]}
                  >
                    {g.label}
                  </Text>
                  {selected && (
                    <View style={styles.checkmark}>
                      <Text style={styles.checkmarkText}>✓</Text>
                    </View>
                  )}
                </Pressable>
              );
            })}
          </View>
        </View>

        {/* Meal Frequency */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>
            How many meals do you usually eat per day?
          </Text>
          <Text style={styles.sectionHint}>
            Used to calibrate the DermDiet food logging baseline. You can
            change this anytime.
          </Text>
          <View style={styles.mealGrid}>
            {MEAL_FREQUENCY.map((m) => (
              <Pressable
                key={m.value}
                onPress={() => setMealFrequency(m.value)}
                style={[
                  styles.mealOption,
                  mealFrequency === m.value && styles.mealOptionSelected,
                ]}
                accessibilityRole="radio"
                accessibilityState={{ selected: mealFrequency === m.value }}
              >
                <Text
                  style={[
                    styles.mealLabel,
                    mealFrequency === m.value && styles.mealLabelSelected,
                  ]}
                >
                  {m.label}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>

        {error && (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        <Button
          title="Continue"
          onPress={handleContinue}
          loading={saving}
          disabled={!isValid}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  content: { padding: Spacing.lg, paddingBottom: Spacing.xxl },
  header: { marginBottom: Spacing.xl },
  eyebrow: { ...Typography.eyebrow, color: Colors.primary, letterSpacing: 2, marginBottom: 4 },
  title: { ...Typography.title1, color: Colors.textPrimary, marginBottom: Spacing.sm },
  subtitle: { ...Typography.body, color: Colors.textSecondary, lineHeight: 22 },
  section: { marginBottom: Spacing.xl },
  sectionLabel: { ...Typography.bodyMedium, color: Colors.textPrimary, marginBottom: 4 },
  sectionHint: { ...Typography.caption, color: Colors.textMuted, marginBottom: Spacing.sm },
  hint: { ...Typography.caption, color: Colors.textMuted, fontWeight: "400" },
  goalsGrid: { gap: Spacing.sm },
  goalCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    borderWidth: 1.5,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
  },
  goalCardSelected: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primaryLight,
  },
  goalIcon: { fontSize: 20 },
  goalLabel: { flex: 1, ...Typography.body, color: Colors.textSecondary },
  goalLabelSelected: { color: Colors.primary, fontWeight: "600" },
  checkmark: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: Colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  checkmarkText: { color: "#fff", fontSize: 13, fontWeight: "700" },
  mealGrid: { flexDirection: "row", flexWrap: "wrap", gap: Spacing.sm },
  mealOption: {
    paddingHorizontal: Spacing.md,
    paddingVertical: 10,
    borderRadius: BorderRadius.md,
    borderWidth: 1.5,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
  },
  mealOptionSelected: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primaryLight,
  },
  mealLabel: { ...Typography.body, color: Colors.textSecondary },
  mealLabelSelected: { color: Colors.primary, fontWeight: "700" },
  errorBox: {
    backgroundColor: "#fee2e2",
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    marginBottom: Spacing.md,
  },
  errorText: { ...Typography.body, color: Colors.error },
});
