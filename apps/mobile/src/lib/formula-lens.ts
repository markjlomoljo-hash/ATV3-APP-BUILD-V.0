/**
 * FormulaLens — deterministic ingredient review (on-device).
 *
 * `analyzeFormula` is a faithful TypeScript mirror of the Python reference
 * engine `ml-service/acnetrex_ml/engines/formula_lens.py` (analyze_formula):
 * same alias dictionary, same normalization, same review flags, same
 * limitations. If the Python engine changes, this mirror must change with it.
 *
 * Zero-fabrication boundaries:
 * - No comedogenic, irritation, or hazard score is ever produced — the
 *   engine's own limitation says so and the UI must repeat it.
 * - Ingredients outside the alias dictionary are reported as unrecognized
 *   (no rule coverage), never guessed at.
 * - Cloud boundary: the cloud jobs contract (POST /api/ml/jobs,
 *   src/lib/acnetrex/ml-analysis-jobs.ts) does not accept a `formula_lens`
 *   engine, so this analysis runs on-device only and no cloud job is
 *   created. When that contract gains the engine, submission should follow
 *   the sleep-analysis coordinator pattern.
 */

// Alias dictionary v1 — mirrors ALIASES in formula_lens.py verbatim.
export const INGREDIENT_ALIASES: Readonly<Record<string, readonly string[]>> = {
  niacinamide: ["niacinamide", "nicotinamide", "vitamin b3"],
  salicylic_acid: ["salicylic acid", "bha", "beta hydroxy acid"],
  benzoyl_peroxide: ["benzoyl peroxide", "bpo"],
  retinoid: ["adapalene", "tretinoin", "retinol", "retinal"],
  alpha_hydroxy_acid: ["glycolic acid", "lactic acid", "mandelic acid", "aha"],
};

/** Mirrors `_normalize` in formula_lens.py. */
export function normalizeIngredient(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

/**
 * Input handling (not part of the engine): splits pasted/typed ingredient
 * text into a candidate list. Splits on newlines, commas, semicolons, and
 * bullet characters; drops empties. No spelling correction is attempted.
 */
export function parseIngredientText(text: string): string[] {
  return text
    .split(/[\n,;•·]/)
    .map((part) => part.trim())
    .filter((part) => part.length > 0);
}

export interface FormulaReviewInsufficient {
  state: "insufficient_data";
  featuresMissing: string[];
}

export interface FormulaReviewReady {
  state: "ready";
  normalizedIngredients: string[];
  recognizedActiveClasses: string[];
  /** Normalized inputs with no alias-dictionary coverage — honest unknowns. */
  unrecognizedIngredients: string[];
  allergyMatches: string[];
  routineReviewFlags: string[];
  evidenceState: "static_rule_only";
  limitations: string[];
}

export type FormulaReview = FormulaReviewInsufficient | FormulaReviewReady;

/**
 * Deterministic mirror of `analyze_formula` (formula_lens.py). The extra
 * `unrecognizedIngredients` field is a presentation of the same facts (the
 * complement of alias matches over the same dictionary), not new inference.
 */
export function analyzeFormula(input: {
  ingredients: string[];
  allergies?: string[];
}): FormulaReview {
  if (!Array.isArray(input.ingredients) || input.ingredients.length === 0) {
    return { state: "insufficient_data", featuresMissing: ["ingredients"] };
  }

  const normalized = input.ingredients
    .map((value) => normalizeIngredient(String(value)))
    .filter((value) => value.length > 0);

  const normalizedSet = new Set(normalized);
  const classes = Object.keys(INGREDIENT_ALIASES)
    .filter((canonical) =>
      INGREDIENT_ALIASES[canonical].some((alias) => normalizedSet.has(alias))
    )
    .sort();

  const aliasVocabulary = new Set(
    Object.values(INGREDIENT_ALIASES).flatMap((aliases) => [...aliases])
  );
  const unrecognized = [...new Set(normalized)].filter(
    (item) => !aliasVocabulary.has(item)
  );

  const allergySet = new Set(
    (input.allergies ?? []).map((value) => normalizeIngredient(String(value)))
  );
  const allergyMatches = [...allergySet]
    .filter((allergy) => normalizedSet.has(allergy))
    .sort();

  const conflicts: string[] = [];
  if (classes.includes("retinoid") && classes.includes("alpha_hydroxy_acid")) {
    conflicts.push(
      "retinoid_and_aha_same_product_or_routine_requires_tolerance_review"
    );
  }
  if (classes.includes("retinoid") && classes.includes("salicylic_acid")) {
    conflicts.push("retinoid_and_salicylic_acid_requires_tolerance_review");
  }

  return {
    state: "ready",
    normalizedIngredients: normalized,
    recognizedActiveClasses: classes,
    unrecognizedIngredients: unrecognized,
    allergyMatches,
    routineReviewFlags: conflicts,
    evidenceState: "static_rule_only",
    limitations: [
      "No absolute comedogenic or irritation score is produced.",
      "Ingredient parsing is limited to user-supplied text and a versioned alias dictionary.",
    ],
  };
}

/** Human-readable copy for engine flag codes. Faithful, no added claims. */
export const REVIEW_FLAG_COPY: Record<string, string> = {
  retinoid_and_aha_same_product_or_routine_requires_tolerance_review:
    "A retinoid and an alpha-hydroxy acid appear together. Using both in the same product or routine calls for a tolerance review — this is a rule-based flag, not a safety verdict.",
  retinoid_and_salicylic_acid_requires_tolerance_review:
    "A retinoid and salicylic acid appear together. Combining them calls for a tolerance review — this is a rule-based flag, not a safety verdict.",
};
