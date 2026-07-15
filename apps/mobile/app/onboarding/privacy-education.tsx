import { View, Text, StyleSheet, ScrollView } from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Button } from "../../src/components/ui";
import { OnboardingProgress } from "../../src/components/ui/OnboardingProgress";
import { Colors, Spacing, Typography, BorderRadius } from "../../src/components/ui/theme";

const points = [
  {
    icon: "🩺",
    title: "Not a Medical Device",
    text: "AcneTrex helps you track and understand your skin. It does not diagnose disease, replace a dermatologist, or provide prescriptions.",
  },
  {
    icon: "🔒",
    title: "Your Data Is Private",
    text: "Your skin data is private and user-owned. Raw face images are stored separately and controlled entirely by you.",
  },
  {
    icon: "🤝",
    title: "You Control Sharing",
    text: "Anonymous learning and research participation are opt-in only. You can revoke consent at any time from your profile.",
  },
  {
    icon: "⚠️",
    title: "Seek Professional Care",
    text: "For severe acne, allergic reactions, or medication concerns, please consult a qualified dermatologist.",
  },
  {
    icon: "🧪",
    title: "Honest Uncertainty",
    text: "When data is insufficient, AcneTrex says so. We never fabricate scores, trends, or insights.",
  },
];

export default function PrivacyEducationScreen() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <OnboardingProgress current={0} total={4} label="Step 1 of 4" />

        <View style={styles.header}>
          <Text style={styles.eyebrow}>BEFORE YOU BEGIN</Text>
          <Text style={styles.title}>What AcneTrex Is</Text>
          <Text style={styles.subtitle}>
            Please read this before creating your account. It takes 60 seconds.
          </Text>
        </View>

        <View style={styles.points}>
          {points.map((p) => (
            <View key={p.title} style={styles.point}>
              <Text style={styles.pointIcon}>{p.icon}</Text>
              <View style={styles.pointContent}>
                <Text style={styles.pointTitle}>{p.title}</Text>
                <Text style={styles.pointText}>{p.text}</Text>
              </View>
            </View>
          ))}
        </View>

        <View style={styles.acknowledgment}>
          <Text style={styles.ackText}>
            By continuing, you acknowledge that you have read and understood
            the above. You are at least 16 years of age.
          </Text>
        </View>

        <Button
          title="I Understand — Continue"
          onPress={() => router.push("/onboarding/skin-history")}
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
  points: { gap: Spacing.sm, marginBottom: Spacing.xl },
  point: {
    flexDirection: "row",
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: Spacing.md,
    alignItems: "flex-start",
  },
  pointIcon: { fontSize: 22, marginTop: 2 },
  pointContent: { flex: 1 },
  pointTitle: { ...Typography.bodyMedium, color: Colors.textPrimary, marginBottom: 4 },
  pointText: { ...Typography.caption, color: Colors.textSecondary, lineHeight: 18 },
  acknowledgment: {
    backgroundColor: Colors.primaryLight,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    marginBottom: Spacing.lg,
  },
  ackText: { ...Typography.caption, color: Colors.primaryDark, textAlign: "center", lineHeight: 18 },
});
