from __future__ import annotations

import math
from statistics import fmean
from typing import Any


def _slope(values: list[float]) -> float:
    x = list(range(len(values)))
    mean_x, mean_y = fmean(x), fmean(values)
    denominator = sum((value - mean_x) ** 2 for value in x)
    return (
        sum(
            (left - mean_x) * (right - mean_y)
            for left, right in zip(x, values, strict=True)
        )
        / denominator
    )


def analyze_forecast_readiness(inputs: dict[str, Any]) -> dict[str, Any]:
    values = [float(value) for value in inputs.get("outcomes", [])]
    horizon = int(inputs.get("horizon_days", 3))
    required = {3: 14, 7: 28, 14: 56, 30: 90}.get(horizon)
    if required is None:
        raise ValueError("horizon_days must be 3, 7, 14, or 30")
    valid = [value for value in values if math.isfinite(value)]
    coverage = len(valid) / len(values) if values else 0.0
    if len(valid) < required or coverage < 0.8:
        return {
            "state": "insufficient_data",
            "horizon_days": horizon,
            "sample_count": len(valid),
            "minimum_samples": required,
            "coverage": round(coverage, 4),
            "prediction": None,
        }
    window = min(7, len(valid))
    slope = _slope(valid[-window:])
    direction = (
        "stable" if abs(slope) < 0.05 else ("increasing" if slope > 0 else "decreasing")
    )
    return {
        "state": "ready",
        "horizon_days": horizon,
        "sample_count": len(valid),
        "coverage": round(coverage, 4),
        "deterministic_recent_direction": direction,
        "prediction": None,
        "limitations": [
            "This is a retrospective trend summary, not a forecast of future lesion counts.",
            "A validated forecasting model is not active.",
        ],
    }
