from __future__ import annotations

import re
from typing import Any

ALIASES = {
    "niacinamide": {"niacinamide", "nicotinamide", "vitamin b3"},
    "salicylic_acid": {"salicylic acid", "bha", "beta hydroxy acid"},
    "benzoyl_peroxide": {"benzoyl peroxide", "bpo"},
    "retinoid": {"adapalene", "tretinoin", "retinol", "retinal"},
    "alpha_hydroxy_acid": {"glycolic acid", "lactic acid", "mandelic acid", "aha"},
}


def _normalize(value: str) -> str:
    return re.sub(r"\s+", " ", value.strip().lower())


def analyze_formula(inputs: dict[str, Any]) -> dict[str, Any]:
    ingredients = inputs.get("ingredients")
    if not isinstance(ingredients, list) or not ingredients:
        return {"state": "insufficient_data", "features_missing": ["ingredients"]}
    normalized = [_normalize(str(value)) for value in ingredients if str(value).strip()]
    classes = sorted(
        canonical
        for canonical, aliases in ALIASES.items()
        if any(item in aliases for item in normalized)
    )
    allergies = {_normalize(str(value)) for value in inputs.get("allergies", [])}
    allergy_matches = sorted(allergies.intersection(normalized))
    conflicts = []
    if "retinoid" in classes and "alpha_hydroxy_acid" in classes:
        conflicts.append(
            "retinoid_and_aha_same_product_or_routine_requires_tolerance_review"
        )
    if "retinoid" in classes and "salicylic_acid" in classes:
        conflicts.append("retinoid_and_salicylic_acid_requires_tolerance_review")
    return {
        "state": "ready",
        "normalized_ingredients": normalized,
        "recognized_active_classes": classes,
        "allergy_matches": allergy_matches,
        "routine_review_flags": conflicts,
        "evidence_state": "static_rule_only",
        "limitations": [
            "No absolute comedogenic or irritation score is produced.",
            "Ingredient parsing is limited to user-supplied text and a versioned alias dictionary.",
        ],
    }
