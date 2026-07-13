from __future__ import annotations

from typing import Any


def analyze_diet_day(inputs: dict[str, Any]) -> dict[str, Any]:
    baseline = inputs.get("expected_meals")
    if baseline not in (1, 2, 3):
        return {
            "state": "insufficient_data",
            "features_missing": ["expected_meals_1_2_or_3"],
        }
    meals = inputs.get("meals", [])
    snacks = inputs.get("snacks", [])
    if not isinstance(meals, list) or not isinstance(snacks, list):
        raise ValueError("meals and snacks must be arrays")
    unique_meals = {
        str(item.get("event_id"))
        for item in meals
        if isinstance(item, dict) and item.get("event_id")
    }
    unique_snacks = {
        str(item.get("event_id"))
        for item in snacks
        if isinstance(item, dict) and item.get("event_id")
    }
    logged_meals = len(unique_meals)
    completion = min(1.0, logged_meals / baseline)
    categories = sorted(
        {
            str(category)
            for item in [*meals, *snacks]
            if isinstance(item, dict)
            for category in item.get("categories", [])
        }
    )
    marked_complete = bool(inputs.get("marked_complete", False))
    return {
        "state": "ready" if marked_complete else "partial",
        "expected_meals": baseline,
        "logged_meal_events": logged_meals,
        "logged_snack_events": len(unique_snacks),
        "meal_completion_ratio": round(completion, 4),
        "marked_complete": marked_complete,
        "category_exposures": categories,
        "missingness_state": "user_marked_complete"
        if marked_complete
        else "logging_open",
        "limitations": [
            "Unlogged meals are unknown rather than confirmed intake omissions.",
            "Category exposures are observations, not evidence that food caused a skin change.",
        ],
    }
