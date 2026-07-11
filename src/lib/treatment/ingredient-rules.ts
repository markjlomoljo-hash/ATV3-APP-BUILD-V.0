// Small, transparent, rule-based ingredient classifier used only to warn
// about *plausible* routine conflicts and stewardship reminders. This is
// not a clinical decision engine and never diagnoses or prescribes.

export type IngredientCategory = "retinoid" | "bpo" | "acid" | "antibiotic_topical" | "antibiotic_oral" | "isotretinoin" | "other";

const RULES: Array<{ category: IngredientCategory; keywords: string[] }> = [
  { category: "isotretinoin", keywords: ["isotretinoin", "accutane"] },
  { category: "retinoid", keywords: ["retinol", "retinal", "tretinoin", "adapalene", "trifarotene", "retinaldehyde"] },
  { category: "bpo", keywords: ["benzoyl peroxide"] },
  { category: "acid", keywords: ["salicylic", "glycolic", "lactic acid", "azelaic", "mandelic", "aha", "bha"] },
  { category: "antibiotic_oral", keywords: ["doxycycline", "minocycline", "sarecycline", "erythromycin", "tetracycline"] },
  { category: "antibiotic_topical", keywords: ["clindamycin", "topical erythromycin", "dapsone"] },
];

export function classifyIngredient(activeIngredient: string): IngredientCategory {
  const lower = activeIngredient.toLowerCase();
  for (const rule of RULES) {
    if (rule.keywords.some((k) => lower.includes(k))) return rule.category;
  }
  return "other";
}

export type ConflictRule = { a: IngredientCategory; b: IngredientCategory; type: string; description: string };

export const CONFLICT_RULES: ConflictRule[] = [
  {
    a: "retinoid",
    b: "bpo",
    type: "irritation_risk",
    description: "Combining retinoids with benzoyl peroxide can increase dryness and irritation. Many providers recommend using them at different times of day.",
  },
  {
    a: "retinoid",
    b: "acid",
    type: "over_exfoliation_risk",
    description: "Layering a retinoid with exfoliating acids may increase barrier irritation. Consider alternating nights.",
  },
  {
    a: "acid",
    b: "acid",
    type: "over_exfoliation_risk",
    description: "Multiple exfoliating-acid products can compound irritation and barrier disruption.",
  },
  {
    a: "antibiotic_topical",
    b: "antibiotic_oral",
    type: "stewardship",
    description: "Using topical and oral antibiotics together should be provider-directed to reduce resistance risk (antimicrobial stewardship).",
  },
  {
    a: "retinoid",
    b: "retinoid",
    type: "redundant",
    description: "Two active retinoid plans are running at once — this is usually redundant and increases irritation risk.",
  },
];

export function findConflict(catA: IngredientCategory, catB: IngredientCategory): ConflictRule | undefined {
  return CONFLICT_RULES.find((r) => (r.a === catA && r.b === catB) || (r.a === catB && r.b === catA));
}
