from __future__ import annotations

from collections.abc import Mapping, Sequence
from typing import Any


def assess_readiness(
    records: Sequence[Mapping[str, Any]],
    *,
    required_fields: Sequence[str],
    minimum_samples: int,
    minimum_span_days: int = 0,
) -> dict[str, Any]:
    sample_count = len(records)
    present = 0
    possible = sample_count * len(required_fields)
    missing: set[str] = set()
    for record in records:
        for field in required_fields:
            if record.get(field) is None:
                missing.add(field)
            else:
                present += 1
    coverage = present / possible if possible else 0.0
    dates = sorted(str(r["date"])[:10] for r in records if r.get("date"))
    span_days = 0
    if len(dates) >= 2:
        from datetime import date

        span_days = (
            date.fromisoformat(dates[-1]) - date.fromisoformat(dates[0])
        ).days + 1
    enough_samples = sample_count >= minimum_samples
    enough_span = span_days >= minimum_span_days if minimum_span_days else True
    ready = enough_samples and enough_span and coverage == 1.0
    state = "ready" if ready else ("partial" if sample_count else "insufficient_data")
    return {
        "state": state,
        "sample_count": sample_count,
        "coverage": round(coverage, 4),
        "features_missing": sorted(missing),
        "usable_span_days": span_days,
        "minimum_samples": minimum_samples,
        "minimum_span_days": minimum_span_days,
        "confidence_ceiling": "moderate" if ready else "low",
    }
