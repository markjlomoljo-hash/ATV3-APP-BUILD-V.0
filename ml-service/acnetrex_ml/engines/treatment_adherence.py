from __future__ import annotations

from typing import Any


def analyze_adherence(inputs: dict[str, Any]) -> dict[str, Any]:
    scheduled = inputs.get("scheduled_count")
    completed = inputs.get("completed_count")
    if scheduled is None or completed is None or int(scheduled) <= 0:
        return {
            "state": "insufficient_data",
            "features_missing": ["scheduled_count", "completed_count"],
        }
    ratio = max(0.0, min(1.0, int(completed) / int(scheduled)))
    return {
        "state": "ready",
        "adherence_ratio": round(ratio, 4),
        "support_state": "review_schedule_support" if ratio < 0.7 else "maintain",
        "limitations": [
            "This is a behavioral consistency summary, not medical advice."
        ],
    }
