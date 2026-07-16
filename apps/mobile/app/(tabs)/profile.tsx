import { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Alert,
  Pressable,
  Modal,
  TextInput,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Constants from "expo-constants";
import { router } from "expo-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuthStore } from "../../src/stores/auth";
import { useProfileStore } from "../../src/stores/profile";
import {
  fetchProfile,
  fetchProfessionalProfile,
  updateProfessionalProfileSection,
} from "../../src/lib/profile-service";
import {
  ACNE_ONSET_OPTIONS,
  MEAL_FREQUENCY_OPTIONS,
  type AcneOnsetValue,
  type MealFrequencyValue,
} from "../../src/lib/onboarding-contracts";
import {
  buildAcneHistoryEdit,
  buildLifestyleBaselineEdit,
} from "../../src/lib/profile-baseline-editor";
import { supabase } from "../../src/lib/supabase";
import { Button, Card, Divider } from "../../src/components/ui";
import {
  Colors,
  Spacing,
  Typography,
  BorderRadius,
} from "../../src/components/ui/theme";

function ProfileRow({
  label,
  value,
}: {
  label: string;
  value: string | null;
}) {
  return (
    <View style={styles.profileRow}>
      <Text style={styles.profileRowLabel}>{label}</Text>
      <Text style={styles.profileRowValue}>{value ?? "Not set"}</Text>
    </View>
  );
}

export default function ProfileScreen() {
  const { user, reset: resetAuth } = useAuthStore();
  const { reset: resetProfile } = useProfileStore();
  const queryClient = useQueryClient();
  const [signingOut, setSigningOut] = useState(false);
  const [baselineEditor, setBaselineEditor] = useState<"acne_history" | "lifestyle_baseline" | null>(null);
  const [selectedOnset, setSelectedOnset] = useState<AcneOnsetValue | null>(null);
  const [onsetDetail, setOnsetDetail] = useState("");
  const [selectedMealFrequency, setSelectedMealFrequency] = useState<MealFrequencyValue | null>(null);
  const [savingBaseline, setSavingBaseline] = useState(false);

  const { data: profile } = useQuery({
    queryKey: ["profile", user?.id],
    queryFn: () => fetchProfile(user!.id),
    enabled: !!user,
  });

  const { data: professionalProfile } = useQuery({
    queryKey: ["professional-profile", user?.id],
    queryFn: fetchProfessionalProfile,
    enabled: !!user,
  });

  const acneHistory = professionalProfile?.sections.find(
    (section) => section.sectionKey === "acne_history",
  )?.value ?? {};
  const lifestyleBaseline = professionalProfile?.sections.find(
    (section) => section.sectionKey === "lifestyle_baseline",
  )?.value ?? {};
  const persistedOnset = typeof acneHistory.onset_pattern === "string"
    ? acneHistory.onset_pattern as AcneOnsetValue
    : null;
  const persistedMealFrequency = typeof lifestyleBaseline.meal_frequency_baseline === "string"
    ? lifestyleBaseline.meal_frequency_baseline as MealFrequencyValue
    : null;

  const handleSignOut = async () => {
    Alert.alert("Sign Out", "Are you sure you want to sign out?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Sign Out",
        style: "destructive",
        onPress: async () => {
          setSigningOut(true);
          await supabase.auth.signOut();
          queryClient.clear();
          resetAuth();
          resetProfile();
          setSigningOut(false);
        },
      },
    ]);
  };

  const handleDeleteAccount = () => {
    router.push("/modules/privacy");
  };

  const openAcneHistoryEditor = () => {
    setSelectedOnset(persistedOnset);
    setOnsetDetail(typeof acneHistory.onset_detail === "string" ? acneHistory.onset_detail : "");
    setBaselineEditor("acne_history");
  };

  const openLifestyleEditor = () => {
    setSelectedMealFrequency(persistedMealFrequency);
    setBaselineEditor("lifestyle_baseline");
  };

  const saveBaselineEdit = async () => {
    setSavingBaseline(true);
    try {
      if (baselineEditor === "acne_history" && selectedOnset) {
        await updateProfessionalProfileSection(
          "acne_history",
          buildAcneHistoryEdit(acneHistory, selectedOnset, onsetDetail),
          "profile_acne_history_edit",
        );
      } else if (baselineEditor === "lifestyle_baseline" && selectedMealFrequency) {
        await updateProfessionalProfileSection(
          "lifestyle_baseline",
          buildLifestyleBaselineEdit(lifestyleBaseline, selectedMealFrequency),
          "profile_lifestyle_baseline_edit",
        );
      } else {
        Alert.alert("Selection required", "Choose an option before saving.");
        return;
      }
      await queryClient.invalidateQueries({ queryKey: ["professional-profile", user?.id] });
      await queryClient.invalidateQueries({ queryKey: ["food"] });
      setBaselineEditor(null);
      Alert.alert(
        "Baseline updated",
        "The versioned Profile section was updated. Meal baseline changes apply to future food-log days; historical snapshots are unchanged.",
      );
    } catch (error) {
      Alert.alert("Update failed", error instanceof Error ? error.message.replace(/_/g, " ") : "Please retry.");
    } finally {
      setSavingBaseline(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {profile?.display_name?.[0]?.toUpperCase() ??
                user?.email?.[0]?.toUpperCase() ??
                "?"}
            </Text>
          </View>
          <Text style={styles.displayName}>
            {profile?.display_name ?? "Your Profile"}
          </Text>
          <Text style={styles.email}>{user?.email}</Text>
        </View>

        {/* Profile details */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Profile</Text>
          <Card>
            <ProfileRow
              label="Display Name"
              value={profile?.display_name ?? null}
            />
            <Divider style={{ marginVertical: 0 }} />
            <ProfileRow label="Sex" value={profile?.sex ?? null} />
            <Divider style={{ marginVertical: 0 }} />
            <ProfileRow
              label="Skin Tone"
              value={
                profile?.skin_tone?.replace(/_/g, " ") ?? null
              }
            />
            <Divider style={{ marginVertical: 0 }} />
            <ProfileRow
              label="Timezone"
              value={profile?.timezone ?? null}
            />
          </Card>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Acne History</Text>
          <Text style={styles.sectionSubtitle}>Versioned history used by reports and readiness checks.</Text>
          <Card>
            <ProfileRow
              label="When did it start?"
              value={ACNE_ONSET_OPTIONS.find((option) => option.value === persistedOnset)?.label ?? null}
            />
            <Divider style={{ marginVertical: 0 }} />
            <Pressable style={styles.editRow} onPress={openAcneHistoryEditor} accessibilityLabel="Edit acne history onset">
              <Text style={styles.editText}>Edit Acne History</Text>
              <Text style={styles.aboutLink}>Edit →</Text>
            </Pressable>
          </Card>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Lifestyle Baseline</Text>
          <Text style={styles.sectionSubtitle}>Future DermDiet days adapt to this baseline; historical days retain their saved snapshot.</Text>
          <Card>
            <ProfileRow
              label="Usual meal frequency"
              value={MEAL_FREQUENCY_OPTIONS.find((option) => option.value === persistedMealFrequency)?.label ?? null}
            />
            <Divider style={{ marginVertical: 0 }} />
            <Pressable style={styles.editRow} onPress={openLifestyleEditor} accessibilityLabel="Edit meal frequency baseline">
              <Text style={styles.editText}>Edit Lifestyle Baseline</Text>
              <Text style={styles.aboutLink}>Edit →</Text>
            </Pressable>
          </Card>
        </View>

        {/* Privacy and consent use one authenticated, audited API source. */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Privacy & Consent</Text>
          <Text style={styles.sectionSubtitle}>
            Review the consent values currently stored for your account. A change is shown only after the server confirms it.
          </Text>
          <Card>
            <Pressable
              style={styles.editRow}
              onPress={() => router.push("/modules/privacy")}
              accessibilityLabel="Open privacy and consent center"
            >
              <Text style={styles.editText}>Open Privacy & Consent Center</Text>
              <Text style={styles.aboutLink}>Open</Text>
            </Pressable>
          </Card>
        </View>

        {/* App info */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>About</Text>
          <Card>
            <View style={styles.aboutRow}>
              <Text style={styles.aboutLabel}>Version</Text>
              <Text style={styles.aboutValue}>{Constants.expoConfig?.version ?? "Unavailable"}</Text>
            </View>
            <Divider style={{ marginVertical: 0 }} />
            <View style={styles.aboutRow}>
              <Text style={styles.aboutLabel}>Build</Text>
              <Text style={styles.aboutValue}>{Constants.expoConfig?.android?.versionCode ?? "Unavailable"}</Text>
            </View>
            <Divider style={{ marginVertical: 0 }} />
            <Pressable style={styles.aboutRow} onPress={() => router.push("/modules/privacy")}>
              <Text style={styles.aboutLabel}>Privacy & data controls</Text>
              <Text style={styles.aboutLink}>Open →</Text>
            </Pressable>
          </Card>
        </View>

        {/* Medical disclaimer */}
        <View style={styles.disclaimer}>
          <Text style={styles.disclaimerText}>
            AcneTrex is not a medical device and does not diagnose, treat, or
            prevent any disease. Always consult a qualified dermatologist for
            medical advice.
          </Text>
        </View>

        {/* Actions */}
        <View style={styles.actions}>
          <Button
            title="Sign Out"
            onPress={handleSignOut}
            variant="secondary"
            loading={signingOut}
          />
          <Pressable onPress={handleDeleteAccount} style={styles.deleteButton}>
            <Text style={styles.deleteText}>Request Account Deletion</Text>
          </Pressable>
        </View>
      </ScrollView>
      <Modal visible={baselineEditor !== null} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={styles.safe}>
          <View style={styles.modalHeader}>
            <Pressable onPress={() => setBaselineEditor(null)} disabled={savingBaseline}>
              <Text style={styles.aboutLink}>Cancel</Text>
            </Pressable>
            <Text style={styles.modalTitle}>
              {baselineEditor === "acne_history" ? "Edit Acne History" : "Edit Lifestyle Baseline"}
            </Text>
            <Pressable onPress={() => void saveBaselineEdit()} disabled={savingBaseline}>
              {savingBaseline ? <ActivityIndicator color={Colors.primary} /> : <Text style={styles.aboutLink}>Save</Text>}
            </Pressable>
          </View>
          <ScrollView contentContainerStyle={styles.modalContent}>
            {baselineEditor === "acne_history" ? (
              <>
                <Text style={styles.modalQuestion}>When did it start?</Text>
                <Text style={styles.sectionSubtitle}>This correction creates a new version; it does not erase the prior answer.</Text>
                {ACNE_ONSET_OPTIONS.map((option) => (
                  <Pressable
                    key={option.value}
                    style={[styles.optionRow, selectedOnset === option.value && styles.optionRowSelected]}
                    onPress={() => setSelectedOnset(option.value)}
                    accessibilityRole="radio"
                    accessibilityState={{ selected: selectedOnset === option.value }}
                  >
                    <Text style={[styles.optionText, selectedOnset === option.value && styles.optionTextSelected]}>{option.label}</Text>
                  </Pressable>
                ))}
                <Text style={styles.modalQuestion}>Additional detail (optional)</Text>
                <TextInput
                  style={styles.detailInput}
                  value={onsetDetail}
                  onChangeText={setOnsetDetail}
                  multiline
                  maxLength={500}
                  accessibilityLabel="Acne onset additional detail"
                />
              </>
            ) : (
              <>
                <Text style={styles.modalQuestion}>How many meals do you usually have in a day?</Text>
                <Text style={styles.sectionSubtitle}>This changes future completion logic only. Existing food-log snapshots remain unchanged.</Text>
                {MEAL_FREQUENCY_OPTIONS.map((option) => (
                  <Pressable
                    key={option.value}
                    style={[styles.optionRow, selectedMealFrequency === option.value && styles.optionRowSelected]}
                    onPress={() => setSelectedMealFrequency(option.value)}
                    accessibilityRole="radio"
                    accessibilityState={{ selected: selectedMealFrequency === option.value }}
                  >
                    <Text style={[styles.optionText, selectedMealFrequency === option.value && styles.optionTextSelected]}>{option.label}</Text>
                  </Pressable>
                ))}
              </>
            )}
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  content: { padding: Spacing.lg, paddingBottom: Spacing.xxl },
  header: {
    alignItems: "center",
    paddingVertical: Spacing.xl,
    marginBottom: Spacing.lg,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.primary,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: Spacing.md,
  },
  avatarText: { fontSize: 32, fontWeight: "800", color: "#fff" },
  displayName: {
    ...Typography.title2,
    color: Colors.textPrimary,
    textAlign: "center",
  },
  email: { ...Typography.body, color: Colors.textSecondary, marginTop: 4 },
  section: { marginBottom: Spacing.xl },
  sectionTitle: {
    ...Typography.title3,
    color: Colors.textPrimary,
    marginBottom: 4,
  },
  sectionSubtitle: {
    ...Typography.caption,
    color: Colors.textSecondary,
    marginBottom: Spacing.sm,
  },
  profileRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: Spacing.md,
  },
  profileRowLabel: { ...Typography.body, color: Colors.textSecondary },
  profileRowValue: { ...Typography.bodyMedium, color: Colors.textPrimary },
  editRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: Spacing.md,
  },
  editText: { ...Typography.bodyMedium, color: Colors.textPrimary },
  aboutRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: Spacing.md,
  },
  aboutLabel: { ...Typography.body, color: Colors.textSecondary },
  aboutValue: { ...Typography.bodyMedium, color: Colors.textPrimary },
  aboutLink: { ...Typography.bodyMedium, color: Colors.primary },
  disclaimer: {
    backgroundColor: Colors.gray100,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    marginBottom: Spacing.xl,
  },
  disclaimerText: {
    ...Typography.caption,
    color: Colors.textMuted,
    textAlign: "center",
    lineHeight: 18,
  },
  actions: { gap: Spacing.sm },
  deleteButton: { alignItems: "center", paddingVertical: Spacing.md },
  deleteText: { ...Typography.body, color: Colors.error },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  modalTitle: { ...Typography.title3, color: Colors.textPrimary },
  modalContent: { padding: Spacing.lg, paddingBottom: Spacing.xxl },
  modalQuestion: { ...Typography.bodyMedium, color: Colors.textPrimary, marginTop: Spacing.md, marginBottom: Spacing.sm },
  optionRow: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
    backgroundColor: Colors.surface,
  },
  optionRowSelected: { borderColor: Colors.primary, backgroundColor: Colors.primaryLight },
  optionText: { ...Typography.body, color: Colors.textSecondary },
  optionTextSelected: { ...Typography.bodyMedium, color: Colors.primaryDark },
  detailInput: {
    minHeight: 100,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    color: Colors.textPrimary,
    backgroundColor: Colors.surface,
    textAlignVertical: "top",
  },
});
