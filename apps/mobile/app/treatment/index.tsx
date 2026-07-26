/**
 * Treatment Protocol — plan overview, plan-aware check-in, adherence.
 *
 * Everything rendered comes from real persisted rows (treatment_plans /
 * treatment_checkins) or the deterministic adherence engine mirror over
 * them. Check-ins go through the backend contract so plan_id is real.
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
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format, parseISO } from "date-fns";
import { useAuthStore } from "../../src/stores/auth";
import { Button, Card, EmptyState, Badge } from "../../src/components/ui";
import {
  Colors,
  Spacing,
  Typography,
  BorderRadius,
} from "../../src/components/ui/theme";
import {
  ADHERENCE_CLOUD_BOUNDARY,
  PLAN_CHECKIN_STATUSES,
  activePlanFrom,
  analyzeTreatmentAdherence,
  createPlanCheckin,
  deriveAdherenceInputs,
  fetchPlanCheckins,
  fetchTreatmentPlans,
  stepsForTime,
  type PlanCheckinStatus,
  type TreatmentPlan,
} from "../../src/lib/treatment-service";
import type { TreatmentCheckin } from "../../src/lib/daily-logs-service";

const STATUS_LABELS: Record<PlanCheckinStatus, string> = {
  used: "✓ Used as planned",
  partial: "~ Partially used",
  skipped: "✗ Skipped",
  delayed: "⏱ Delayed",
  stopped: "⛔ Stopped",
};

const ADHERENCE_WINDOW_DAYS = 14;

function PlanCard({ plan }: { plan: TreatmentPlan }) {
  const amSteps = stepsForTime(plan.steps, "am");
  const pmSteps = stepsForTime(plan.steps, "pm");
  return (
    <Card style={styles.planCard}>
      <View style={styles.planHeader}>
        <Text style={styles.planTitle}>{plan.title}</Text>
        <Badge
          label={plan.status}
          color={plan.status === "active" ? Colors.primaryLight : Colors.gray100}
          textColor={plan.status === "active" ? Colors.primary : Colors.textSecondary}
        />
      </View>
      {plan.activeIngredient && (
        <Text style={styles.planDetail}>Active ingredient: {plan.activeIngredient}</Text>
      )}
      {plan.started_at && (
        <Text style={styles.planDetail}>
          Started {format(parseISO(plan.started_at), "MMM d, yyyy")}
        </Text>
      )}
      {plan.reviewDate && (
        <Text style={styles.planDetail}>Provider review due {plan.reviewDate}</Text>
      )}
      {plan.providerDirected && (
        <Text style={styles.planDetail}>
          Recorded as supplied or reviewed by a healthcare professional.
        </Text>
      )}

      <View style={styles.regimenRow}>
        <View style={styles.regimenColumn}>
          <Text style={styles.regimenTitle}>☀️ AM</Text>
          {amSteps.length === 0 && (
            <Text style={styles.regimenEmpty}>No morning steps</Text>
          )}
          {amSteps.map((step, index) => (
            <Text key={`am-${index}`} style={styles.regimenStep}>
              {index + 1}. {step.name}
            </Text>
          ))}
        </View>
        <View style={styles.regimenColumn}>
          <Text style={styles.regimenTitle}>🌙 PM</Text>
          {pmSteps.length === 0 && (
            <Text style={styles.regimenEmpty}>No evening steps</Text>
          )}
          {pmSteps.map((step, index) => (
            <Text key={`pm-${index}`} style={styles.regimenStep}>
              {index + 1}. {step.name}
            </Text>
          ))}
        </View>
      </View>

      {plan.description && (
        <Text style={styles.planInstructions}>{plan.description}</Text>
      )}
    </Card>
  );
}

/**
 * Adherence from real history via the deterministic engine mirror. The
 * derivation rule is documented in treatment-service.deriveAdherenceInputs;
 * insufficient data renders as exactly that.
 */
function AdherenceCard({
  plan,
  checkins,
}: {
  plan: TreatmentPlan;
  checkins: TreatmentCheckin[];
}) {
  const inputs = deriveAdherenceInputs(plan, checkins, {
    windowDays: ADHERENCE_WINDOW_DAYS,
  });
  const result = analyzeTreatmentAdherence({
    scheduledCount: inputs.scheduledCount,
    completedCount: inputs.completedCount,
  });

  return (
    <Card style={styles.adherenceCard}>
      <Text style={styles.sectionTitle}>Adherence ({ADHERENCE_WINDOW_DAYS} days)</Text>
      {result.state === "insufficient_data" ? (
        <Text style={styles.adherenceInsufficient}>
          Not enough scheduled history to compute adherence yet
          {plan.started_at ? "" : " — the plan has no recorded start date"}.
          Missing: {result.featuresMissing.join(", ")}.
        </Text>
      ) : (
        <>
          <View style={styles.adherenceRow}>
            <Text style={styles.adherencePct}>
              {Math.round(result.adherenceRatio * 100)}%
            </Text>
            <Text style={styles.adherenceLabel}>
              {result.supportState === "maintain"
                ? "Maintaining consistency"
                : "Consistency below 70% — worth reviewing your schedule"}
            </Text>
          </View>
          <Text style={styles.adherenceDetail}>
            {inputs.completedCount} of {inputs.scheduledCount} plan-active days
            ({inputs.windowStart} → {inputs.windowEnd}) have a &quot;used&quot;
            check-in. Partial, skipped, delayed, and stopped days are recorded
            but do not count as completed.
          </Text>
          {result.limitations.map((limitation) => (
            <Text key={limitation} style={styles.limitation}>
              {limitation}
            </Text>
          ))}
        </>
      )}
      <Text style={styles.limitation}>{ADHERENCE_CLOUD_BOUNDARY}</Text>
    </Card>
  );
}

function CheckinHistory({ checkins }: { checkins: TreatmentCheckin[] }) {
  if (checkins.length === 0) return null;
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Recent Check-ins</Text>
      <Card style={{ padding: 0, overflow: "hidden" }}>
        {checkins.slice(0, 10).map((checkin, index) => (
          <View key={checkin.id}>
            <View style={styles.historyRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.historyStatus}>
                  {STATUS_LABELS[checkin.status as PlanCheckinStatus] ?? checkin.status}
                </Text>
                {checkin.irritation !== null && (
                  <Text style={styles.historyDetail}>
                    Irritation {checkin.irritation}/10
                  </Text>
                )}
                {checkin.notes && (
                  <Text style={styles.historyNotes}>{checkin.notes}</Text>
                )}
              </View>
              <Text style={styles.historyDate}>{checkin.checkin_date}</Text>
            </View>
            {index < Math.min(checkins.length, 10) - 1 && <View style={styles.divider} />}
          </View>
        ))}
      </Card>
    </View>
  );
}

export default function TreatmentScreen() {
  const router = useRouter();
  const { user } = useAuthStore();
  const queryClient = useQueryClient();

  const [checkinStatus, setCheckinStatus] = useState<PlanCheckinStatus | "">("");
  const [irritation, setIrritation] = useState("");
  const [notes, setNotes] = useState("");

  const {
    data: plans = [],
    isLoading: plansLoading,
    error: plansError,
  } = useQuery({
    queryKey: ["treatment-plans", user?.id],
    queryFn: () => fetchTreatmentPlans(user!.id),
    enabled: !!user,
  });

  const activePlan = activePlanFrom(plans);

  const { data: checkins = [] } = useQuery({
    queryKey: ["plan-checkins", user?.id, activePlan?.id],
    queryFn: () =>
      fetchPlanCheckins(user!.id, { planId: activePlan!.id, days: 30 }),
    enabled: !!user && !!activePlan,
  });

  const today = new Date().toISOString().split("T")[0];
  const todaysCheckin = checkins.find((checkin) => checkin.checkin_date === today);

  const { mutate: saveCheckin, isPending: savingCheckin } = useMutation({
    mutationFn: (input: {
      planId: string;
      status: PlanCheckinStatus;
      irritation?: number;
      notes?: string;
    }) => createPlanCheckin(input),
    onSuccess: (outcome) => {
      queryClient.invalidateQueries({ queryKey: ["plan-checkins", user?.id] });
      queryClient.invalidateQueries({ queryKey: ["treatment-checkins", user?.id] });
      queryClient.invalidateQueries({ queryKey: ["today-logs", user?.id] });
      setCheckinStatus("");
      setIrritation("");
      setNotes("");
      if (outcome.status === "queued_offline") {
        Alert.alert(
          "Saved on Device",
          "You're offline, so this check-in is stored securely on your device and will submit automatically when you're back online."
        );
      }
    },
    onError: (error) => {
      const message = error instanceof Error ? error.message : "unknown_error";
      Alert.alert(
        "Check-in Failed",
        message === "api_not_configured"
          ? "The cloud API is not configured (EXPO_PUBLIC_API_BASE_URL is unset), so check-ins cannot be recorded. Nothing was saved."
          : message === "auth_required"
            ? "Your session expired — sign in again to record check-ins. Nothing was saved."
            : `${message}. Nothing was saved.`
      );
    },
  });

  const submitCheckin = () => {
    if (!activePlan || !checkinStatus) {
      Alert.alert("Select a status", "Choose how today's treatment went first.");
      return;
    }
    const irritationNum = irritation.trim() ? parseInt(irritation, 10) : undefined;
    if (
      irritationNum !== undefined &&
      (Number.isNaN(irritationNum) || irritationNum < 0 || irritationNum > 10)
    ) {
      Alert.alert("Check irritation", "Irritation must be a number from 0 to 10.");
      return;
    }
    saveCheckin({
      planId: activePlan.id,
      status: checkinStatus,
      irritation: irritationNum,
      notes: notes.trim() ? notes.trim() : undefined,
    });
  };

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.headerRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.title}>Treatment</Text>
            <Text style={styles.subtitle}>
              Your recorded regimen and real check-in history.
            </Text>
          </View>
          <Pressable onPress={() => router.back()} style={styles.closeButton}>
            <Text style={styles.closeText}>✕</Text>
          </Pressable>
        </View>

        {plansLoading && <Text style={styles.loadingText}>Loading plans...</Text>}

        {plansError != null && (
          <Card style={styles.errorCard}>
            <Text style={styles.errorText}>
              Treatment plans could not be loaded:{" "}
              {plansError instanceof Error ? plansError.message : "unknown_error"}
            </Text>
          </Card>
        )}

        {!plansLoading && !plansError && !activePlan && (
          <EmptyState
            title="No active treatment plan"
            message="Record a provider-directed treatment plan to unlock the AM/PM regimen view, plan check-ins, and adherence tracking. AcneTrex does not prescribe or recommend treatment — only plans supplied or reviewed by a healthcare professional can be recorded."
            action={{
              label: "Record a plan",
              onPress: () => router.push("/treatment/new" as never),
            }}
          />
        )}

        {activePlan && (
          <>
            <PlanCard plan={activePlan} />

            {/* Plan-aware check-in */}
            <Card style={styles.checkinCard}>
              <Text style={styles.sectionTitle}>Today&apos;s Check-in</Text>
              {todaysCheckin ? (
                <Text style={styles.checkinDone}>
                  Recorded today:{" "}
                  {STATUS_LABELS[todaysCheckin.status as PlanCheckinStatus] ??
                    todaysCheckin.status}
                  . You can record another entry if something changed.
                </Text>
              ) : (
                <Text style={styles.checkinHint}>
                  No check-in recorded for today yet.
                </Text>
              )}
              {PLAN_CHECKIN_STATUSES.map((status) => (
                <Pressable
                  key={status}
                  onPress={() => setCheckinStatus(status)}
                  style={[
                    styles.option,
                    checkinStatus === status && styles.optionSelected,
                  ]}
                >
                  <Text
                    style={[
                      styles.optionText,
                      checkinStatus === status && styles.optionTextSelected,
                    ]}
                  >
                    {STATUS_LABELS[status]}
                  </Text>
                </Pressable>
              ))}
              <Text style={styles.inputLabel}>Skin irritation (0–10, optional)</Text>
              <TextInput
                style={styles.textInput}
                placeholder="e.g. 3"
                keyboardType="number-pad"
                value={irritation}
                onChangeText={setIrritation}
                placeholderTextColor={Colors.textMuted}
                maxLength={2}
              />
              <Text style={styles.inputLabel}>Notes (optional)</Text>
              <TextInput
                style={[styles.textInput, styles.textArea]}
                placeholder="Any observations..."
                multiline
                numberOfLines={3}
                value={notes}
                onChangeText={setNotes}
                placeholderTextColor={Colors.textMuted}
              />
              <Button
                title="Save Check-in"
                onPress={submitCheckin}
                loading={savingCheckin}
                style={{ marginTop: Spacing.sm }}
              />
            </Card>

            <AdherenceCard plan={activePlan} checkins={checkins} />
            <CheckinHistory checkins={checkins} />

            <Button
              title="Record another plan"
              variant="secondary"
              onPress={() => router.push("/treatment/new" as never)}
              style={{ marginTop: Spacing.sm }}
            />
            <Text style={styles.editBoundary}>
              Editing an existing plan is not available yet — the backend
              contract only supports creating and listing plans. Record a new
              plan version if your regimen changed.
            </Text>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  content: { padding: Spacing.lg, paddingBottom: Spacing.xxl },
  headerRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: Spacing.lg,
  },
  title: { ...Typography.largeTitle, color: Colors.textPrimary },
  subtitle: { ...Typography.body, color: Colors.textSecondary, marginTop: 4 },
  closeButton: { padding: Spacing.sm },
  closeText: { fontSize: 18, color: Colors.textSecondary },
  loadingText: {
    ...Typography.body,
    color: Colors.textMuted,
    textAlign: "center",
    padding: Spacing.xl,
  },
  errorCard: { marginBottom: Spacing.md, borderColor: "#fecaca", backgroundColor: "#fef2f2" },
  errorText: { ...Typography.caption, color: Colors.error, lineHeight: 18 },
  planCard: { marginBottom: Spacing.lg, gap: 4 },
  planHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: Spacing.sm,
    marginBottom: 4,
  },
  planTitle: { ...Typography.title3, color: Colors.textPrimary, flex: 1 },
  planDetail: { ...Typography.caption, color: Colors.textSecondary, lineHeight: 18 },
  regimenRow: {
    flexDirection: "row",
    gap: Spacing.md,
    marginTop: Spacing.md,
  },
  regimenColumn: {
    flex: 1,
    backgroundColor: Colors.surfaceAlt,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    gap: 4,
  },
  regimenTitle: { ...Typography.bodyMedium, color: Colors.textPrimary },
  regimenEmpty: { ...Typography.caption, color: Colors.textMuted },
  regimenStep: { ...Typography.caption, color: Colors.textSecondary, lineHeight: 18 },
  planInstructions: {
    ...Typography.caption,
    color: Colors.textSecondary,
    lineHeight: 18,
    marginTop: Spacing.md,
    fontStyle: "italic",
  },
  section: { marginBottom: Spacing.lg },
  sectionTitle: {
    ...Typography.bodyMedium,
    color: Colors.textPrimary,
    marginBottom: Spacing.sm,
  },
  checkinCard: { marginBottom: Spacing.lg },
  checkinDone: {
    ...Typography.caption,
    color: Colors.primaryDark,
    lineHeight: 18,
    marginBottom: Spacing.sm,
  },
  checkinHint: {
    ...Typography.caption,
    color: Colors.textSecondary,
    lineHeight: 18,
    marginBottom: Spacing.sm,
  },
  option: {
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1.5,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
    marginBottom: Spacing.sm,
  },
  optionSelected: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primaryLight,
  },
  optionText: { ...Typography.body, color: Colors.textSecondary },
  optionTextSelected: { color: Colors.primary, fontWeight: "700" },
  inputLabel: {
    ...Typography.bodyMedium,
    color: Colors.textPrimary,
    marginTop: Spacing.sm,
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
  },
  textArea: { height: 90, textAlignVertical: "top" },
  adherenceCard: { marginBottom: Spacing.lg },
  adherenceInsufficient: {
    ...Typography.caption,
    color: Colors.textSecondary,
    lineHeight: 18,
  },
  adherenceRow: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  adherencePct: { fontSize: 32, fontWeight: "800", color: Colors.textPrimary },
  adherenceLabel: { ...Typography.caption, color: Colors.textSecondary, flex: 1 },
  adherenceDetail: {
    ...Typography.caption,
    color: Colors.textSecondary,
    lineHeight: 18,
  },
  limitation: {
    ...Typography.caption,
    color: Colors.textMuted,
    fontStyle: "italic",
    lineHeight: 16,
    marginTop: 6,
  },
  historyRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    padding: Spacing.md,
    gap: Spacing.md,
  },
  historyStatus: { ...Typography.bodyMedium, color: Colors.textPrimary },
  historyDetail: { ...Typography.caption, color: Colors.textSecondary, marginTop: 2 },
  historyNotes: {
    ...Typography.caption,
    color: Colors.textMuted,
    marginTop: 4,
    fontStyle: "italic",
  },
  historyDate: { ...Typography.caption, color: Colors.textMuted },
  divider: { height: 1, backgroundColor: Colors.border, marginHorizontal: Spacing.md },
  editBoundary: {
    ...Typography.caption,
    color: Colors.textMuted,
    lineHeight: 18,
    marginTop: Spacing.sm,
    textAlign: "center",
  },
});
