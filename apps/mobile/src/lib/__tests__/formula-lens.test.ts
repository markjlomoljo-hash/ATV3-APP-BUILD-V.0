import { describe, expect, it } from "vitest";

import {
  analyzeFormula,
  normalizeIngredient,
  parseIngredientText,
} from "../formula-lens";

describe("parseIngredientText", () => {
  it("splits on commas, newlines, semicolons, and bullets", () => {
    expect(
      parseIngredientText("Niacinamide, Glycolic Acid\nAdapalene; Water • Squalane")
    ).toEqual(["Niacinamide", "Glycolic Acid", "Adapalene", "Water", "Squalane"]);
  });

  it("drops empty fragments", () => {
    expect(parseIngredientText(" , ,\n\n;")).toEqual([]);
  });
});

describe("analyzeFormula (mirror of formula_lens.py)", () => {
  it("fails closed with insufficient_data when no ingredients are given", () => {
    expect(analyzeFormula({ ingredients: [] })).toEqual({
      state: "insufficient_data",
      featuresMissing: ["ingredients"],
    });
  });

  it("normalizes like the Python engine (trim, lowercase, collapse spaces)", () => {
    expect(normalizeIngredient("  Salicylic   ACID ")).toBe("salicylic acid");
  });

  it("recognizes active classes through aliases and sorts them", () => {
    const review = analyzeFormula({
      ingredients: ["Vitamin B3", "BPO", "tretinoin"],
    });
    expect(review.state).toBe("ready");
    if (review.state !== "ready") return;
    expect(review.recognizedActiveClasses).toEqual([
      "benzoyl_peroxide",
      "niacinamide",
      "retinoid",
    ]);
  });

  it("flags retinoid+AHA and retinoid+BHA combinations exactly like the reference", () => {
    const review = analyzeFormula({
      ingredients: ["adapalene", "glycolic acid", "salicylic acid"],
    });
    if (review.state !== "ready") throw new Error("expected ready");
    expect(review.routineReviewFlags).toEqual([
      "retinoid_and_aha_same_product_or_routine_requires_tolerance_review",
      "retinoid_and_salicylic_acid_requires_tolerance_review",
    ]);
  });

  it("reports no flags without a retinoid pairing", () => {
    const review = analyzeFormula({ ingredients: ["niacinamide", "aha"] });
    if (review.state !== "ready") throw new Error("expected ready");
    expect(review.routineReviewFlags).toEqual([]);
  });

  it("matches allergies verbatim after normalization", () => {
    const review = analyzeFormula({
      ingredients: ["Lactic Acid", "water"],
      allergies: ["LACTIC  ACID", "peanut oil"],
    });
    if (review.state !== "ready") throw new Error("expected ready");
    expect(review.allergyMatches).toEqual(["lactic acid"]);
  });

  it("lists unrecognized ingredients as unknowns instead of scoring them", () => {
    const review = analyzeFormula({
      ingredients: ["water", "squalane", "niacinamide"],
    });
    if (review.state !== "ready") throw new Error("expected ready");
    expect(review.unrecognizedIngredients).toEqual(["water", "squalane"]);
    // No score fields exist anywhere on the result.
    expect(Object.keys(review)).not.toContain("hazardScore");
    expect(review.evidenceState).toBe("static_rule_only");
  });

  it("carries the reference engine's limitations verbatim", () => {
    const review = analyzeFormula({ ingredients: ["water"] });
    if (review.state !== "ready") throw new Error("expected ready");
    expect(review.limitations).toEqual([
      "No absolute comedogenic or irritation score is produced.",
      "Ingredient parsing is limited to user-supplied text and a versioned alias dictionary.",
    ]);
  });
});
