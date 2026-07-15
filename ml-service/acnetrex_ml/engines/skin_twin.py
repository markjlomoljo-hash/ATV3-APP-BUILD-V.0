from __future__ import annotations

from typing import Any

ALLOWED_SCENARIOS = {
    "better_sleep",
    "reduced_sleep_debt",
    "circadian_improvement",
    "lower_stress",
    "reduced_dairy",
    "reduced_high_glycemic",
    "reduced_sugary_processed_snacks",
    "hydration_improvement",
    "meal_timing_consistency",
    "routine_consistency",
    "product_removal",
    "product_replacement",
    "active_ingredient_pause",
    "active_ingredient_introduction_provider_review",
    "sunscreen_consistency",
    "treatment_adherence",
    "missed_dose_reduction",
    "weather_exposure_change",
    "reduced_contact_occlusion",
    "reduced_picking_touching",
    "cycle_context_confounder",
}


def validate_skin_twin(inputs: dict[str, Any]) -> dict[str, Any]:
    baseline = inputs.get("baseline")
    changes = inputs.get("changes", {})
    horizon = inputs.get("horizon_days")
    if not isinstance(baseline, dict) or not baseline:
        return {"state": "insufficient_data", "features_missing": ["baseline"]}
    if not isinstance(changes, dict) or not changes:
        return {"state": "insufficient_data", "features_missing": ["changes"]}
    unsupported = sorted(set(changes) - ALLOWED_SCENARIOS)
    if horizon not in (3, 7, 14, 30):
        return {
            "state": "insufficient_data",
            "features_missing": ["horizon_days_3_7_14_30"],
        }
    if unsupported:
        return {"state": "unsupported_offline", "unsupported_changes": unsupported}
    return {
        "state": "ready",
        "horizon_days": horizon,
        "validated_changes": sorted(changes),
        "scenario_result": None,
        "next_data_actions": [
            "Continue logging outcomes during and after the scenario window."
        ],
        "limitations": [
            "Scenario inputs are validated, but no outcome is generated without a validated model.",
            "Skin Twin scenarios are not treatment guarantees.",
        ],
    }
