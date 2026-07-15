import { View, Text, StyleSheet, ScrollView } from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Button } from "../../src/components/ui";
import { Colors, Spacing, Typography, BorderRadius } from "../../src/components/ui/theme";

const features = [
  { icon: "🔬", title: "Evidence-Based Tracking", desc: "Log skin, sleep, food, and treatments with scientific precision." },
  { icon: "🧠", title: "AI-Powered Insights", desc: "CutisAI surfaces patterns from your personal data — never fabricated." },
  { icon: "📊", title: "Longitudinal Intelligence", desc: "Understand your acne triggers over weeks and months." },
  { icon: "🔒", title: "Your Data, Your Control", desc: "Private by default. You decide what is shared and what is not." },
];

export default function WelcomeScreen() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.logoContainer}>
            <Text style={styles.logoIcon}>✦</Text>
          </View>
          <Text style={styles.eyebrow}>PRIVATE SKIN INTELLIGENCE</Text>
          <Text style={styles.title}>AcneTrex</Text>
          <Text style={styles.version}>V3</Text>
          <Text style={styles.tagline}>
            Understand your acne. Track what matters.{"\n"}
            Build a clearer picture of your skin.
          </Text>
        </View>

        {/* Feature cards */}
        <View style={styles.features}>
          {features.map((f) => (
            <View key={f.title} style={styles.featureCard}>
              <Text style={styles.featureIcon}>{f.icon}</Text>
              <View style={styles.featureText}>
                <Text style={styles.featureTitle}>{f.title}</Text>
                <Text style={styles.featureDesc}>{f.desc}</Text>
              </View>
            </View>
          ))}
        </View>

        {/* Disclaimer */}
        <View style={styles.disclaimer}>
          <Text style={styles.disclaimerText}>
            AcneTrex is not a replacement for a dermatologist and does not
            diagnose disease. It helps you understand and track your skin.
          </Text>
        </View>

        {/* Actions */}
        <View style={styles.actions}>
          <Button
            title="Create Account"
            onPress={() => router.push("/auth/sign-up")}
          />
          <Button
            title="Sign In"
            onPress={() => router.push("/auth/sign-in")}
            variant="secondary"
            style={{ marginTop: Spacing.sm }}
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  content: { padding: Spacing.lg, paddingBottom: Spacing.xxl },
  header: { alignItems: "center", paddingVertical: Spacing.xl },
  logoContainer: {
    width: 72,
    height: 72,
    borderRadius: BorderRadius.xl,
    backgroundColor: Colors.primary,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: Spacing.md,
  },
  logoIcon: { fontSize: 32, color: "#fff" },
  eyebrow: {
    ...Typography.eyebrow,
    color: Colors.primary,
    letterSpacing: 2,
    marginBottom: 4,
  },
  title: {
    fontSize: 42,
    fontWeight: "900",
    color: Colors.textPrimary,
    letterSpacing: -1,
  },
  version: {
    fontSize: 16,
    fontWeight: "700",
    color: Colors.primary,
    marginTop: -4,
    marginBottom: Spacing.md,
  },
  tagline: {
    ...Typography.body,
    color: Colors.textSecondary,
    textAlign: "center",
    lineHeight: 24,
  },
  features: { gap: Spacing.sm, marginVertical: Spacing.md },
  featureCard: {
    flexDirection: "row",
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: Spacing.md,
    alignItems: "flex-start",
  },
  featureIcon: { fontSize: 24, marginTop: 2 },
  featureText: { flex: 1 },
  featureTitle: {
    ...Typography.bodyMedium,
    color: Colors.textPrimary,
    marginBottom: 2,
  },
  featureDesc: {
    ...Typography.caption,
    color: Colors.textSecondary,
    lineHeight: 18,
  },
  disclaimer: {
    backgroundColor: Colors.primaryLight,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    marginVertical: Spacing.md,
  },
  disclaimerText: {
    ...Typography.caption,
    color: Colors.primaryDark,
    textAlign: "center",
    lineHeight: 18,
  },
  actions: { gap: 0, marginTop: Spacing.sm },
});
