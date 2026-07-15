import { useState } from "react";
import { View, Text, StyleSheet, ScrollView, Switch } from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Button } from "../../src/components/ui";
import { OnboardingProgress } from "../../src/components/ui/OnboardingProgress";
import {
  Colors,
  Spacing,
  Typography,
  BorderRadius,
} from "../../src/components/ui/theme";
import { useAuthStore } from "../../src/stores/auth";
import { useProfileStore } from "../../src/stores/profile";
import {
  upsertConsents,
  markOnboardingComplete,
} from "../../src/lib/profile-service";

interface ConsentItemDef {
  key: string;
  title: string;
  description: string;
  defaultValue: boolean;
}

const CONSENT_ITEMS: ConsentItemDef[] = [
  {
    key: "anonymous_learning",
    title: "Anonymous Learning Network",
    description:
      "Contribute anonymized, de-identified pattern data to improve AcneTrex's models for everyone. No raw images or identifiable data are shared.",
    defaultValue: false,
  },
  {
    key: "raw_image_learning",
    title: "Raw Image Learning",
    description:
      "Allow AcneTrex to use your FaceAtlas images to improve skin analysis models. Images are processed privately and never shared.",
    defaultValue: false,
  },
  {
    key: "include_faceatlas_photos_in_reports",
    title: "Include Photos in Reports",
    description:
      "Include FaceAtlas photos in your generated skin reports for your dermatologist.",
    defaultValue: false,
  },
  {
    key: "include_treatment_details_in_reports",
    title: "Include Treatment Details in Reports",
    description:
      "Include your treatment history and check-ins in generated reports.",
    defaultValue: true,
  },
  {
    key: "marketing_notifications",
    title: "Product Updates & Tips",
    description:
      "Receive occasional notifications about new AcneTrex features and evidence-based skin care tips.",
    defaultValue: false,
  },
  {
    key: "product_analysis_notifications",
    title: "Product Analysis Alerts",
    description:
      "Get notified when AcneTrex detects potential product-skin interactions in your logs.",
    defaultValue: true,
  },
  {
    key: "report_ready_notifications",
    title: "Report Ready Notifications",
    description:
      "Get notified when your weekly or monthly skin report is ready to view.",
    defaultValue: true,
  },
  {
    key: "streak_risk_notifications",
    title: "Streak Risk Reminders",
    description:
      "Get reminded when you are at risk of breaking your logging streak.",
    defaultValue: true,
  },
];

type ConsentState = Record<string, boolean>;

export default function ConsentScreen() {
  const router = useRouter();
  const { user, setStatus, setOnboardingCompleted } = useAuthStore();
  const { setConsents } = useProfileStore();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [consents, setConsentState] = useState<ConsentState>(
    Object.fromEntries(CONSENT_ITEMS.map((i) => [i.key, i.defaultValue]))
  );

  const toggle = (key: string) => {
    setConsentState((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleComplete = async () => {
    if (!user) return;
    setSaving(true);
    setError(null);
    try {
      const savedConsents = await upsertConsents(user.id, consents);
      await markOnboardingComplete(user.id);
      setConsents(savedConsents);
      setOnboardingCompleted(true);
      setStatus("authenticated");
      // Navigation handled by AuthGate in _layout.tsx
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Failed to save. Please try again."
      );
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
        <OnboardingProgress current={3} total={4} label="Step 4 of 4" />

        <View style={styles.header}>
          <Text style={styles.eyebrow}>YOUR CHOICES</Text>
          <Text style={styles.title}>Privacy & Notifications</Text>
          <Text style={styles.subtitle}>
            All settings are optional and can be changed at any time in your
            Profile. None of these affect your core AcneTrex experience.
          </Text>
        </View>

        <View style={styles.items}>
          {CONSENT_ITEMS.map((item) => (
            <View key={item.key} style={styles.consentItem}>
              <View style={styles.consentHeader}>
                <Text style={styles.consentTitle}>{item.title}</Text>
                <Switch
                  value={consents[item.key] ?? false}
                  onValueChange={() => toggle(item.key)}
                  trackColor={{ false: Colors.border, true: Colors.primary }}
                  thumbColor="#fff"
                  accessibilityLabel={item.title}
                />
              </View>
              <Text style={styles.consentDesc}>{item.description}</Text>
            </View>
          ))}
        </View>

        <View style={styles.legalNote}>
          <Text style={styles.legalText}>
            By completing setup, you confirm you are at least 16 years old and
            agree to AcneTrex's Terms of Service and Privacy Policy. You can
            request full data deletion at any time from Profile → Privacy.
          </Text>
        </View>

        {error && (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        <Button
          title="Complete Setup"
          onPress={handleComplete}
          loading={saving}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  content: { padding: Spacing.lg, paddingBottom: Spacing.xxl },
  header: { marginBottom: Spacing.xl },
  eyebrow: {
    ...Typography.eyebrow,
    color: Colors.primary,
    letterSpacing: 2,
    marginBottom: 4,
  },
  title: {
    ...Typography.title1,
    color: Colors.textPrimary,
    marginBottom: Spacing.sm,
  },
  subtitle: {
    ...Typography.body,
    color: Colors.textSecondary,
    lineHeight: 22,
  },
  items: { gap: Spacing.sm, marginBottom: Spacing.xl },
  consentItem: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  consentHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: Spacing.sm,
  },
  consentTitle: {
    ...Typography.bodyMedium,
    color: Colors.textPrimary,
    flex: 1,
    marginRight: Spacing.sm,
  },
  consentDesc: {
    ...Typography.caption,
    color: Colors.textSecondary,
    lineHeight: 18,
  },
  legalNote: {
    backgroundColor: Colors.gray100,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    marginBottom: Spacing.lg,
  },
  legalText: {
    ...Typography.caption,
    color: Colors.textMuted,
    textAlign: "center",
    lineHeight: 18,
  },
  errorBox: {
    backgroundColor: "#fee2e2",
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    marginBottom: Spacing.md,
  },
  errorText: { ...Typography.body, color: Colors.error },
});
