import { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  TextInput,
} from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Button } from "../../src/components/ui";
import { OnboardingProgress } from "../../src/components/ui/OnboardingProgress";
import { Colors, Spacing, Typography, BorderRadius } from "../../src/components/ui/theme";
import { useAuthStore } from "../../src/stores/auth";
import { upsertProfile } from "../../src/lib/profile-service";
import { supabase } from "../../src/lib/supabase";

const SKIN_TONES = [
  { value: "very_fair", label: "Very Fair", color: "#FDDBB4" },
  { value: "fair", label: "Fair", color: "#F5C5A3" },
  { value: "medium", label: "Medium", color: "#D4956A" },
  { value: "olive", label: "Olive", color: "#B87A50" },
  { value: "tan", label: "Tan", color: "#8B5E3C" },
  { value: "deep", label: "Deep", color: "#4A2C17" },
];

const ACNE_ONSET = [
  { value: "childhood", label: "Childhood (before 12)" },
  { value: "early_teen", label: "Early teens (12–14)" },
  { value: "teen", label: "Teens (15–19)" },
  { value: "early_adult", label: "Early adulthood (20–25)" },
  { value: "adult", label: "Adulthood (26+)" },
  { value: "unsure", label: "Not sure" },
];

const SEX_OPTIONS = [
  { value: "female", label: "Female" },
  { value: "male", label: "Male" },
  { value: "nonbinary", label: "Non-binary" },
  { value: "prefer_not_to_say", label: "Prefer not to say" },
];

interface SkinHistoryData {
  displayName: string;
  skinTone: string;
  sex: string;
  acneOnset: string;
  currentSeverity: string;
}

function OptionButton({
  label,
  selected,
  onPress,
  color,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
  color?: string;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.optionButton,
        selected && styles.optionButtonSelected,
      ]}
      accessibilityRole="radio"
      accessibilityState={{ selected }}
    >
      {color && (
        <View style={[styles.colorSwatch, { backgroundColor: color }]} />
      )}
      <Text
        style={[
          styles.optionLabel,
          selected && styles.optionLabelSelected,
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

export default function SkinHistoryScreen() {
  const router = useRouter();
  const { user } = useAuthStore();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [data, setData] = useState<SkinHistoryData>({
    displayName: "",
    skinTone: "",
    sex: "",
    acneOnset: "",
    currentSeverity: "",
  });

  const isValid =
    data.displayName.trim().length >= 2 &&
    data.skinTone &&
    data.sex &&
    data.acneOnset;

  const handleContinue = async () => {
    if (!user || !isValid) return;
    setSaving(true);
    setError(null);
    try {
      // Get timezone
      const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;

      await upsertProfile(user.id, {
        display_name: data.displayName.trim(),
        skin_tone: data.skinTone,
        sex: data.sex,
        timezone,
      });

      // Save acne history section
      await supabase.from("profile_sections").upsert(
        {
          user_id: user.id,
          section_key: "acne_history",
          value_json: {
            onset: data.acneOnset,
            current_severity: data.currentSeverity || "not_specified",
          },
          version: 1,
          updated_by: "user",
        },
        { onConflict: "user_id,section_key" }
      );

      router.push("/onboarding/goals");
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
        keyboardShouldPersistTaps="handled"
      >
        <OnboardingProgress current={1} total={4} label="Step 2 of 4" />

        <View style={styles.header}>
          <Text style={styles.eyebrow}>ABOUT YOU</Text>
          <Text style={styles.title}>Your Skin Story</Text>
          <Text style={styles.subtitle}>
            This helps AcneTrex personalize your experience. You can update
            everything later in your profile.
          </Text>
        </View>

        {/* Display Name */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>What should we call you?</Text>
          <TextInput
            style={styles.textInput}
            placeholder="Your name or nickname"
            placeholderTextColor={Colors.textMuted}
            value={data.displayName}
            onChangeText={(v) => setData((d) => ({ ...d, displayName: v }))}
            maxLength={50}
            autoCapitalize="words"
          />
        </View>

        {/* Sex */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Sex</Text>
          <Text style={styles.sectionHint}>Used for hormonal context in skin analysis.</Text>
          <View style={styles.optionGrid}>
            {SEX_OPTIONS.map((o) => (
              <OptionButton
                key={o.value}
                label={o.label}
                selected={data.sex === o.value}
                onPress={() => setData((d) => ({ ...d, sex: o.value }))}
              />
            ))}
          </View>
        </View>

        {/* Skin Tone */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Skin Tone</Text>
          <Text style={styles.sectionHint}>Helps calibrate FaceAtlas analysis.</Text>
          <View style={styles.optionGrid}>
            {SKIN_TONES.map((t) => (
              <OptionButton
                key={t.value}
                label={t.label}
                selected={data.skinTone === t.value}
                onPress={() => setData((d) => ({ ...d, skinTone: t.value }))}
                color={t.color}
              />
            ))}
          </View>
        </View>

        {/* Acne Onset */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>When did your acne start?</Text>
          <View style={styles.optionList}>
            {ACNE_ONSET.map((o) => (
              <OptionButton
                key={o.value}
                label={o.label}
                selected={data.acneOnset === o.value}
                onPress={() => setData((d) => ({ ...d, acneOnset: o.value }))}
              />
            ))}
          </View>
        </View>

        {/* Current Severity */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>
            Current severity{" "}
            <Text style={styles.optional}>(optional)</Text>
          </Text>
          <View style={styles.optionList}>
            {[
              { value: "mild", label: "Mild — occasional breakouts" },
              { value: "moderate", label: "Moderate — regular breakouts" },
              { value: "severe", label: "Severe — persistent, painful" },
              { value: "in_remission", label: "In remission / clear" },
              { value: "unsure", label: "Not sure" },
            ].map((o) => (
              <OptionButton
                key={o.value}
                label={o.label}
                selected={data.currentSeverity === o.value}
                onPress={() =>
                  setData((d) => ({ ...d, currentSeverity: o.value }))
                }
              />
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
  optional: { ...Typography.caption, color: Colors.textMuted, fontWeight: "400" },
  textInput: {
    height: 52,
    backgroundColor: Colors.surface,
    borderWidth: 1.5,
    borderColor: Colors.border,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    fontSize: 16,
    color: Colors.textPrimary,
  },
  optionGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.sm,
  },
  optionList: { gap: Spacing.sm },
  optionButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: Spacing.md,
    paddingVertical: 10,
    borderRadius: BorderRadius.md,
    borderWidth: 1.5,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
  },
  optionButtonSelected: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primaryLight,
  },
  optionLabel: { ...Typography.body, color: Colors.textSecondary },
  optionLabelSelected: { color: Colors.primary, fontWeight: "700" },
  colorSwatch: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.1)",
  },
  errorBox: {
    backgroundColor: "#fee2e2",
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    marginBottom: Spacing.md,
  },
  errorText: { ...Typography.body, color: Colors.error },
});
