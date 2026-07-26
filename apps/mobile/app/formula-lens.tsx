/**
 * FormulaLens — deterministic ingredient review.
 *
 * Renders the honest output of the on-device rule engine (formula-lens.ts, a
 * mirror of the Python reference engine): recognized active classes, routine
 * review flags, sensitivity matches, and — just as prominently — what the
 * engine could NOT recognize. No hazard, comedogenic, or irritation scores
 * exist anywhere in the engine and none are invented here.
 */
import { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  Pressable,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Button, Card, Badge } from "../src/components/ui";
import {
  Colors,
  Spacing,
  Typography,
  BorderRadius,
} from "../src/components/ui/theme";
import {
  analyzeFormula,
  parseIngredientText,
  REVIEW_FLAG_COPY,
  type FormulaReview,
} from "../src/lib/formula-lens";

const CLASS_LABELS: Record<string, string> = {
  niacinamide: "Niacinamide",
  salicylic_acid: "Salicylic acid (BHA)",
  benzoyl_peroxide: "Benzoyl peroxide",
  retinoid: "Retinoid",
  alpha_hydroxy_acid: "Alpha-hydroxy acid (AHA)",
};

export default function FormulaLensScreen() {
  const router = useRouter();
  const [ingredientText, setIngredientText] = useState("");
  const [sensitivityText, setSensitivityText] = useState("");
  const [review, setReview] = useState<FormulaReview | null>(null);

  const analyze = () => {
    setReview(
      analyzeFormula({
        ingredients: parseIngredientText(ingredientText),
        allergies: parseIngredientText(sensitivityText),
      })
    );
  };

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.headerRow}>
          <Text style={styles.title}>FormulaLens</Text>
          <Pressable onPress={() => router.back()} style={styles.closeButton}>
            <Text style={styles.closeText}>✕</Text>
          </Pressable>
        </View>
        <Text style={styles.subtitle}>
          Paste a product&apos;s ingredient list for a deterministic, rule-based
          review. Runs fully on-device against a versioned alias dictionary.
        </Text>

        <Text style={styles.label}>Ingredient list</Text>
        <TextInput
          style={[styles.textInput, styles.textArea]}
          placeholder={"Paste or type ingredients, separated by commas or new lines\ne.g. niacinamide, glycolic acid, adapalene"}
          multiline
          numberOfLines={5}
          value={ingredientText}
          onChangeText={setIngredientText}
          autoCapitalize="none"
          placeholderTextColor={Colors.textMuted}
        />

        <Text style={styles.label}>Your known sensitivities (optional)</Text>
        <TextInput
          style={styles.textInput}
          placeholder="e.g. lactic acid, bpo — matched verbatim against the list"
          value={sensitivityText}
          onChangeText={setSensitivityText}
          autoCapitalize="none"
          placeholderTextColor={Colors.textMuted}
        />

        <Button title="Analyze ingredients" onPress={analyze} />

        {review?.state === "insufficient_data" && (
          <Card style={styles.stateCard}>
            <Text style={styles.stateTitle}>Insufficient data</Text>
            <Text style={styles.stateText}>
              No ingredients were provided, so no review was generated. Paste
              or type the product&apos;s ingredient list above.
            </Text>
          </Card>
        )}

        {review?.state === "ready" && (
          <>
            <Card style={styles.resultCard}>
              <Text style={styles.sectionTitle}>Recognized active classes</Text>
              {review.recognizedActiveClasses.length === 0 ? (
                <Text style={styles.stateText}>
                  None of the {review.normalizedIngredients.length} ingredients
                  matched the alias dictionary&apos;s active classes. That is a
                  dictionary-coverage statement, not a safety verdict.
                </Text>
              ) : (
                <View style={styles.chipRow}>
                  {review.recognizedActiveClasses.map((activeClass) => (
                    <Badge
                      key={activeClass}
                      label={CLASS_LABELS[activeClass] ?? activeClass}
                    />
                  ))}
                </View>
              )}
            </Card>

            {review.routineReviewFlags.length > 0 && (
              <Card style={styles.flagCard}>
                <Text style={styles.flagTitle}>Routine review flags</Text>
                {review.routineReviewFlags.map((flag) => (
                  <Text key={flag} style={styles.flagText}>
                    • {REVIEW_FLAG_COPY[flag] ?? flag}
                  </Text>
                ))}
              </Card>
            )}

            {review.allergyMatches.length > 0 && (
              <Card style={styles.flagCard}>
                <Text style={styles.flagTitle}>Sensitivity matches</Text>
                <Text style={styles.flagText}>
                  These entries from your sensitivity list appear verbatim in
                  the ingredients: {review.allergyMatches.join(", ")}.
                </Text>
              </Card>
            )}

            {review.unrecognizedIngredients.length > 0 && (
              <Card style={styles.resultCard}>
                <Text style={styles.sectionTitle}>
                  Not recognized ({review.unrecognizedIngredients.length})
                </Text>
                <Text style={styles.stateText}>
                  {review.unrecognizedIngredients.join(", ")}
                </Text>
                <Text style={styles.limitation}>
                  These ingredients have no rule coverage in dictionary v1, so
                  the engine says nothing about them — unknown means unknown.
                </Text>
              </Card>
            )}

            <Card style={styles.boundaryCard}>
              <Text style={styles.boundaryTitle}>What this review is</Text>
              {review.limitations.map((limitation) => (
                <Text key={limitation} style={styles.limitation}>
                  • {limitation}
                </Text>
              ))}
              <Text style={styles.limitation}>
                • Evidence state: {review.evidenceState} — static rules only,
                no model inference.
              </Text>
              <Text style={styles.limitation}>
                • Computed on-device. The cloud ML jobs contract does not
                accept the formula_lens engine yet, so no cloud job was
                created.
              </Text>
            </Card>
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
  textArea: { height: 120, textAlignVertical: "top" },
  stateCard: { marginTop: Spacing.lg },
  stateTitle: { ...Typography.bodyMedium, color: Colors.textPrimary, marginBottom: 4 },
  stateText: { ...Typography.caption, color: Colors.textSecondary, lineHeight: 18 },
  resultCard: { marginTop: Spacing.lg, gap: 6 },
  sectionTitle: { ...Typography.bodyMedium, color: Colors.textPrimary },
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: Spacing.sm },
  flagCard: {
    marginTop: Spacing.lg,
    backgroundColor: "#fffbeb",
    borderColor: "#fcd34d",
    gap: 6,
  },
  flagTitle: { ...Typography.bodyMedium, color: "#92400e" },
  flagText: { ...Typography.caption, color: "#92400e", lineHeight: 18 },
  boundaryCard: {
    marginTop: Spacing.lg,
    backgroundColor: Colors.gray100,
    borderColor: Colors.borderLight,
    gap: 4,
  },
  boundaryTitle: { ...Typography.bodyMedium, color: Colors.textPrimary },
  limitation: {
    ...Typography.caption,
    color: Colors.textMuted,
    lineHeight: 18,
  },
});
