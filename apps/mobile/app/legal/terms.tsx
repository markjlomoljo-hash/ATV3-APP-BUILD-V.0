import { View, Text, StyleSheet, ScrollView, Pressable } from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  Colors,
  Spacing,
  Typography,
  BorderRadius,
} from "../../src/components/ui/theme";
import {
  TERMS_POINTS,
  LEGAL_STATUS_NOTE,
  SUPPORT_EMAIL,
} from "../../src/lib/legal-content";

export default function TermsScreen() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.headerRow}>
          <Pressable
            onPress={() => router.back()}
            style={styles.backButton}
            accessibilityRole="button"
            accessibilityLabel="Go back"
          >
            <Text style={styles.backText}>‹ Back</Text>
          </Pressable>
        </View>

        <View style={styles.header}>
          <Text style={styles.eyebrow}>TERMS OF USE</Text>
          <Text style={styles.title}>What You Agreed To</Text>
        </View>

        <View style={styles.statusNote}>
          <Text style={styles.statusText}>{LEGAL_STATUS_NOTE}</Text>
        </View>

        <View style={styles.points}>
          {TERMS_POINTS.map((p) => (
            <View key={p.title} style={styles.point}>
              <Text style={styles.pointIcon}>{p.icon}</Text>
              <View style={styles.pointContent}>
                <Text style={styles.pointTitle}>{p.title}</Text>
                <Text style={styles.pointText}>{p.text}</Text>
              </View>
            </View>
          ))}
        </View>

        <View style={styles.contactNote}>
          <Text style={styles.contactText}>
            Questions about these commitments? Contact {SUPPORT_EMAIL}.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  content: { padding: Spacing.lg, paddingBottom: Spacing.xxl },
  headerRow: { marginBottom: Spacing.sm },
  backButton: { alignSelf: "flex-start", paddingVertical: Spacing.sm },
  backText: { ...Typography.bodyMedium, color: Colors.primary },
  header: { marginBottom: Spacing.lg },
  eyebrow: {
    ...Typography.eyebrow,
    color: Colors.primary,
    letterSpacing: 2,
    marginBottom: 4,
  },
  title: { ...Typography.title1, color: Colors.textPrimary },
  statusNote: {
    backgroundColor: Colors.gray100,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    marginBottom: Spacing.lg,
  },
  statusText: {
    ...Typography.caption,
    color: Colors.textMuted,
    lineHeight: 18,
  },
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
  pointTitle: {
    ...Typography.bodyMedium,
    color: Colors.textPrimary,
    marginBottom: 4,
  },
  pointText: { ...Typography.caption, color: Colors.textSecondary, lineHeight: 18 },
  contactNote: {
    backgroundColor: Colors.primaryLight,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
  },
  contactText: {
    ...Typography.caption,
    color: Colors.primaryDark,
    textAlign: "center",
    lineHeight: 18,
  },
});
