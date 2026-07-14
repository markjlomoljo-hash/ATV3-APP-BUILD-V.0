from __future__ import annotations

import math
from statistics import fmean
from typing import Any


def _correlation(x: list[float], y: list[float]) -> float:
    mean_x, mean_y = fmean(x), fmean(y)
    numerator = sum(
        (left - mean_x) * (right - mean_y) for left, right in zip(x, y, strict=True)
    )
    denominator = math.sqrt(
        sum((value - mean_x) ** 2 for value in x)
        * sum((value - mean_y) ** 2 for value in y)
    )
    if denominator == 0:
        raise ValueError("correlation requires variable inputs")
    return numerator / denominator


def _ranks(values: list[float]) -> list[float]:
    ordered = sorted(enumerate(values), key=lambda item: item[1])
    ranks = [0.0] * len(values)
    index = 0
    while index < len(ordered):
        end = index + 1
        while end < len(ordered) and ordered[end][1] == ordered[index][1]:
            end += 1
        average_rank = (index + 1 + end) / 2
        for original_index, _value in ordered[index:end]:
            ranks[original_index] = average_rank
        index = end
    return ranks


def analyze_trigger(inputs: dict[str, Any]) -> dict[str, Any]:
    exposures = [float(value) for value in inputs.get("exposures", [])]
    outcomes = [float(value) for value in inputs.get("outcomes", [])]
    lag_days = int(inputs.get("lag_days", 0))
    minimum = max(8, int(inputs.get("minimum_samples", 14)))
    if len(exposures) != len(outcomes) or len(exposures) < minimum:
        return {
            "state": "insufficient_data",
            "sample_count": min(len(exposures), len(outcomes)),
            "minimum_samples": minimum,
            "features_missing": ["aligned_exposure_outcome_history"],
        }
    if lag_days < 0 or lag_days >= len(exposures) - 2:
        raise ValueError("lag_days is outside the usable range")
    if lag_days:
        x, y = exposures[:-lag_days], outcomes[lag_days:]
    else:
        x, y = exposures, outcomes
    valid_pairs = [
        (left, right)
        for left, right in zip(x, y, strict=True)
        if math.isfinite(left) and math.isfinite(right)
    ]
    x = [left for left, _right in valid_pairs]
    y = [right for _left, right in valid_pairs]
    if len(x) < minimum or len(set(x)) < 2 or len(set(y)) < 2:
        return {
            "state": "insufficient_data",
            "sample_count": len(x),
            "minimum_samples": minimum,
            "features_missing": ["variable_aligned_values"],
        }
    pearson = _correlation(x, y)
    spearman = _correlation(_ranks(x), _ranks(y))
    strength = max(abs(pearson), abs(spearman))
    evidence = "observed_association" if strength >= 0.3 else "insufficient_evidence"
    confounders = [str(value) for value in inputs.get("confounders", [])]
    return {
        "state": "ready",
        "sample_count": len(x),
        "lag_days": lag_days,
        "pearson_r": round(pearson, 5),
        "pearson_p": None,
        "spearman_rho": round(spearman, 5),
        "spearman_p": None,
        "direction": "positive" if pearson > 0 else "negative",
        "evidence_state": evidence,
        "confounders": confounders,
        "limitations": [
            "An observed association does not establish causation.",
            "Multiple testing and unmeasured confounders can produce misleading associations.",
            "P-values are not emitted by the lightweight deterministic engine; "
            "use the governed statistical pipeline for inferential testing.",
        ],
    }
