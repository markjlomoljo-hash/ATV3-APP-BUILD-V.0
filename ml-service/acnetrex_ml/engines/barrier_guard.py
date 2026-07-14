from __future__ import annotations

from typing import Any

SYMPTOMS = ("dryness", "tightness", "stinging", "redness", "flaking", "burning")


def analyze_barrier(inputs: dict[str, Any]) -> dict[str, Any]:
    observed = {
        name: inputs.get(name) for name in SYMPTOMS if inputs.get(name) is not None
    }
    if len(observed) < 3:
        return {
            "state": "insufficient_data",
            "features_missing": sorted(set(SYMPTOMS) - set(observed)),
        }
    values = {
        name: max(0.0, min(4.0, float(value)))
        for name, value in observed.items()
        if value is not None
    }
    active_load = max(0, int(inputs.get("active_ingredient_count", 0)))
    cleansing = max(0, int(inputs.get("cleansing_events", 0)))
    symptom_burden = sum(values.values()) / (4 * len(values))
    flags = []
    if active_load >= 3:
        flags.append("multiple_active_ingredients")
    if cleansing >= 3:
        flags.append("high_logged_cleansing_frequency")
    if symptom_burden >= 0.5:
        flags.append("elevated_logged_symptom_burden")
    return {
        "state": "ready",
        "symptom_burden": round(symptom_burden, 4),
        "observed_flags": flags,
        "assessment": "review_routine_and_tolerance"
        if flags
        else "no_elevated_logged_pattern",
        "limitations": [
            "This describes logged symptoms and does not diagnose a damaged skin barrier."
        ],
    }
