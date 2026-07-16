import { View, Text, StyleSheet } from "react-native";
import { Colors, Spacing, BorderRadius } from "./theme";

interface OnboardingProgressProps {
  current: number;
  total: number;
  label: string;
}

export function OnboardingProgress({ current, total, label }: OnboardingProgressProps) {
  const percentComplete = Math.round(((current + 1) / total) * 100);

  return (
    <View style={styles.container}>
      <View style={styles.dots}>
        {Array.from({ length: total }).map((_, i) => (
          <View
            key={i}
            style={[
              styles.dot,
              i < current ? styles.dotCompleted : i === current ? styles.dotActive : styles.dotPending,
            ]}
          />
        ))}
      </View>
      <Text style={styles.label}>{label} · {percentComplete}% complete</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { alignItems: "center", marginBottom: Spacing.lg },
  dots: { flexDirection: "row", gap: 8, marginBottom: 8 },
  dot: {
    width: 8,
    height: 8,
    borderRadius: BorderRadius.full,
  },
  dotCompleted: { backgroundColor: Colors.primary, width: 24 },
  dotActive: { backgroundColor: Colors.primary },
  dotPending: { backgroundColor: Colors.border },
  label: {
    fontSize: 12,
    fontWeight: "600",
    color: Colors.textMuted,
    letterSpacing: 1,
    textTransform: "uppercase",
  },
});
