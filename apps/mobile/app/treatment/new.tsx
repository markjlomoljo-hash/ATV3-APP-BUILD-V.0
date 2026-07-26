/**
 * Treatment plan builder (AM/PM regimen).
 *
 * Mirrors the backend safety contract exactly: only plans attested by the
 * user as supplied or reviewed by a healthcare professional are accepted
 * (the server rejects everything else with
 * provider_directed_treatment_required). Steps follow the shared
 * treatmentPlanStepSchema: a name plus an explicit am | pm | both cadence —
 * no cadence is ever inferred.
 */
import { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  TextInput,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuthStore } from "../../src/stores/auth";
import { Button, Card } from "../../src/components/ui";
import {
  Colors,
  Spacing,
  Typography,
  BorderRadius,
} from "../../src/components/ui/theme";
import {
  createTreatmentPlan,
  type PlanStepTime,
  type TreatmentPlanStep,
} from "../../src/lib/treatment-service";

const STEP_TIME_OPTIONS: { value: PlanStepTime; label: string }[] = [
  { value: "am", label: "AM" },
  { value: "pm", label: "PM" },
  { value: "both", label: "AM + PM" },
];

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export default function NewTreatmentPlanScreen() {
  const router = useRouter();
  const { user } = useAuthStore();
  const queryClient = useQueryClient();

  const [name, setName] = useState("");
  const [activeIngredient, setActiveIngredient] = useState("");
  const [startDate, setStartDate] = useState(new Date().toISOString().split("T")[0]);
  const [reviewDate, setReviewDate] = useState("");
  const [instructions, setInstructions] = useState("");
  const [providerDirected, setProviderDirected] = useState(false);
  const [steps, setSteps] = useState<TreatmentPlanStep[]>([]);
  const [stepName, setStepName] = useState("");
  const [stepTime, setStepTime] = useState<PlanStepTime>("am");

  const addStep = () => {
    if (!stepName.trim()) {
      Alert.alert("Step name required", "Enter the product or step name first.");
      return;
    }
    if (steps.length >= 20) {
      Alert.alert("Step limit", "A plan can hold at most 20 steps.");
      return;
    }
    setSteps([...steps, { name: stepName.trim(), timeOfDay: stepTime }]);
    setStepName("");
  };

  const removeStep = (index: number) => {
    setSteps(steps.filter((_, stepIndex) => stepIndex !== index));
  };

  const { mutate: savePlan, isPending: saving } = useMutation({
    mutationFn: createTreatmentPlan,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["treatment-plans", user?.id] });
      Alert.alert("Plan Recorded", "Your treatment plan was saved.", [
        { text: "OK", onPress: () => router.back() },
      ]);
    },
    onError: (error) => {
      const message = error instanceof Error ? error.message : "unknown_error";
      Alert.alert(
        "Plan Not Saved",
        message === "provider_directed_treatment_required"
          ? "Only treatment plans supplied or reviewed by a healthcare professional can be recorded. AcneTrex does not prescribe or recommend treatment."
          : message === "api_not_configured"
            ? "The cloud API is not configured (EXPO_PUBLIC_API_BASE_URL is unset), so plans cannot be recorded. Nothing was saved."
            : message === "auth_required"
              ? "Your session expired — sign in again to record a plan. Nothing was saved."
              : `${message}. Nothing was saved.`
      );
    },
  });

  const submit = () => {
    if (!name.trim()) {
      Alert.alert("Plan name required", "Give the plan a name.");
      return;
    }
    if (!DATE_PATTERN.test(startDate)) {
      Alert.alert("Check the start date", "Use the YYYY-MM-DD format.");
      return;
    }
    if (reviewDate && !DATE_PATTERN.test(reviewDate)) {
      Alert.alert("Check the review date", "Use the YYYY-MM-DD format or leave it blank.");
      return;
    }
    if (!providerDirected) {
      // Same safety block as the web panel: never send providerDirected: true
      // on the user's behalf.
      Alert.alert(
        "Provider attestation required",
        "Only plans supplied or reviewed by a healthcare professional can be recorded. Tick the attestation if that applies to this plan."
      );
      return;
    }
    savePlan({
      name,
      activeIngredient: activeIngredient || undefined,
      startDate,
      reviewDate: reviewDate || undefined,
      instructions: instructions || undefined,
      providerDirected,
      steps,
    });
  };

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.headerRow}>
          <Text style={styles.title}>Record a Plan</Text>
          <Pressable onPress={() => router.back()} style={styles.closeButton}>
            <Text style={styles.closeText}>✕</Text>
          </Pressable>
        </View>
        <Text style={styles.subtitle}>
          Record a treatment plan from your clinician, then build the AM/PM
          regimen the Task Board and reminders work from.
        </Text>

        <Text style={styles.label}>Plan name</Text>
        <TextInput
          style={styles.textInput}
          placeholder="e.g. Adapalene evening routine"
          value={name}
          onChangeText={setName}
          maxLength={120}
          placeholderTextColor={Colors.textMuted}
        />

        <Text style={styles.label}>Active ingredient or product label (optional)</Text>
        <TextInput
          style={styles.textInput}
          placeholder="e.g. adapalene 0.1%"
          value={activeIngredient}
          onChangeText={setActiveIngredient}
          maxLength={120}
          placeholderTextColor={Colors.textMuted}
        />

        <View style={styles.dateRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.label}>Start date</Text>
            <TextInput
              style={styles.textInput}
              placeholder="YYYY-MM-DD"
              value={startDate}
              onChangeText={setStartDate}
              maxLength={10}
              autoCapitalize="none"
              placeholderTextColor={Colors.textMuted}
            />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.label}>Review date (optional)</Text>
            <TextInput
              style={styles.textInput}
              placeholder="YYYY-MM-DD"
              value={reviewDate}
              onChangeText={setReviewDate}
              maxLength={10}
              autoCapitalize="none"
              placeholderTextColor={Colors.textMuted}
            />
          </View>
        </View>

        <Text style={styles.label}>Provider instructions (optional)</Text>
        <TextInput
          style={[styles.textInput, styles.textArea]}
          placeholder="Apply a pea-sized amount to the whole face..."
          multiline
          numberOfLines={3}
          value={instructions}
          onChangeText={setInstructions}
          maxLength={2000}
          placeholderTextColor={Colors.textMuted}
        />

        {/* Regimen steps */}
        <Text style={styles.sectionTitle}>Regimen steps</Text>
        <Text style={styles.hint}>
          Each step is a product or action with an explicit AM/PM cadence.
          Reminders and check-ins are built only from steps you add here —
          nothing is generated for you.
        </Text>

        {steps.map((step, index) => (
          <Card key={`${step.name}-${index}`} style={styles.stepCard}>
            <View style={styles.stepRow}>
              <Text style={styles.stepText}>
                {step.name}{" "}
                <Text style={styles.stepTime}>
                  ({STEP_TIME_OPTIONS.find((o) => o.value === step.timeOfDay)?.label})
                </Text>
              </Text>
              <Pressable onPress={() => removeStep(index)} style={styles.stepRemove}>
                <Text style={styles.stepRemoveText}>Remove</Text>
              </Pressable>
            </View>
          </Card>
        ))}

        <View style={styles.addStepRow}>
          <TextInput
            style={[styles.textInput, { flex: 1, marginBottom: 0 }]}
            placeholder="Step name, e.g. Gentle cleanser"
            value={stepName}
            onChangeText={setStepName}
            maxLength={200}
            placeholderTextColor={Colors.textMuted}
          />
        </View>
        <View style={styles.timeChips}>
          {STEP_TIME_OPTIONS.map((option) => (
            <Pressable
              key={option.value}
              onPress={() => setStepTime(option.value)}
              style={[styles.chip, stepTime === option.value && styles.chipSelected]}
            >
              <Text
                style={[
                  styles.chipText,
                  stepTime === option.value && styles.chipTextSelected,
                ]}
              >
                {option.label}
              </Text>
            </Pressable>
          ))}
          <Button
            title="Add step"
            variant="secondary"
            onPress={addStep}
            style={styles.addButton}
          />
        </View>

        {/* Safety attestation — mirrors the server contract */}
        <Card
          style={{
            ...styles.attestCard,
            ...(providerDirected ? styles.attestCardActive : {}),
          }}
          onPress={() => setProviderDirected((value) => !value)}
        >
          <Text style={styles.attestText}>
            {providerDirected ? "☑" : "☐"} This plan was supplied or reviewed
            by a healthcare professional.
          </Text>
        </Card>
        <Text style={styles.hint}>
          The server only records provider-directed plans; without this
          attestation nothing is saved. AcneTrex never prescribes or
          recommends treatment.
        </Text>

        <Button
          title="Save treatment plan"
          onPress={submit}
          loading={saving}
          style={{ marginTop: Spacing.md }}
        />
        <Button
          title="Cancel"
          variant="ghost"
          onPress={() => router.back()}
          style={{ marginTop: Spacing.sm }}
        />
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
  label: {
    ...Typography.bodyMedium,
    color: Colors.textPrimary,
    marginBottom: 6,
  },
  textInput: {
    backgroundColor: Colors.surface,
    borderWidth: 1.5,
    borderColor: Colors.border,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: 12,
    fontSize: 16,
    color: Colors.textPrimary,
    marginBottom: Spacing.md,
  },
  textArea: { height: 90, textAlignVertical: "top" },
  dateRow: { flexDirection: "row", gap: Spacing.sm },
  sectionTitle: {
    ...Typography.title3,
    color: Colors.textPrimary,
    marginTop: Spacing.sm,
    marginBottom: 4,
  },
  hint: {
    ...Typography.caption,
    color: Colors.textMuted,
    lineHeight: 18,
    marginBottom: Spacing.md,
  },
  stepCard: { marginBottom: Spacing.sm, paddingVertical: Spacing.sm },
  stepRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: Spacing.sm,
  },
  stepText: { ...Typography.body, color: Colors.textPrimary, flex: 1 },
  stepTime: { ...Typography.caption, color: Colors.textSecondary },
  stepRemove: { padding: 4 },
  stepRemoveText: { ...Typography.caption, color: Colors.error },
  addStepRow: { marginBottom: Spacing.sm },
  timeChips: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  chip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: 8,
    borderRadius: BorderRadius.md,
    borderWidth: 1.5,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
  },
  chipSelected: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primaryLight,
  },
  chipText: { ...Typography.body, color: Colors.textSecondary },
  chipTextSelected: { color: Colors.primary, fontWeight: "700" },
  addButton: { height: 40, paddingHorizontal: Spacing.md },
  attestCard: { marginTop: Spacing.sm, marginBottom: Spacing.sm },
  attestCardActive: { borderColor: Colors.primary },
  attestText: { ...Typography.body, color: Colors.textPrimary, lineHeight: 20 },
});
