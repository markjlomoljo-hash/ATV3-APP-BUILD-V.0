from __future__ import annotations

from datetime import datetime
from statistics import fmean, pstdev
from typing import Any


def _clock_minutes(value: str) -> int:
    if "T" in value:
        parsed = datetime.fromisoformat(value.replace("Z", "+00:00"))
        return parsed.hour * 60 + parsed.minute
    hour, minute = (int(part) for part in value.split(":")[:2])
    if not (0 <= hour <= 23 and 0 <= minute <= 59):
        raise ValueError("time must be HH:MM")
    return hour * 60 + minute


def _circular_diff(a: float, b: float) -> float:
    return abs((a - b + 720) % 1440 - 720)


def analyze_sleep(
    records: list[dict[str, Any]], target_hours: float = 8.0
) -> dict[str, Any]:
    if not records:
        return {
            "state": "insufficient_data",
            "sample_count": 0,
            "features_missing": ["bedtime", "wake_time"],
        }
    nights: list[dict[str, float | str]] = []
    invalid = 0
    for row in records:
        try:
            bed = _clock_minutes(str(row["bedtime"]))
            wake = _clock_minutes(str(row["wake_time"]))
        except (KeyError, TypeError, ValueError):
            invalid += 1
            continue
        duration_minutes = (wake - bed) % 1440
        if duration_minutes == 0:
            invalid += 1
            continue
        duration_hours = duration_minutes / 60
        midpoint = (bed + duration_minutes / 2) % 1440
        nights.append(
            {
                "date": str(row.get("date", ""))[:10],
                "duration_hours": round(duration_hours, 3),
                "midpoint_minutes": midpoint,
                "bedtime_minutes": float(bed),
                "wake_minutes": float(wake),
            }
        )
    if not nights:
        return {
            "state": "insufficient_data",
            "sample_count": 0,
            "features_missing": ["valid_bedtime_wake_time"],
            "invalid_records": invalid,
        }
    durations = [float(n["duration_hours"]) for n in nights]
    beds = [float(n["bedtime_minutes"]) for n in nights]
    wakes = [float(n["wake_minutes"]) for n in nights]
    mean_bed = fmean(beds)
    mean_wake = fmean(wakes)
    sleep_debt: dict[str, float | None] = {}
    for window in (3, 7, 14, 30):
        values = durations[-window:]
        sleep_debt[f"{window}d"] = (
            round(sum(max(0.0, target_hours - value) for value in values), 3)
            if len(values) >= min(window, 3)
            else None
        )
    bedtime_drift = fmean(_circular_diff(value, mean_bed) for value in beds)
    wake_drift = fmean(_circular_diff(value, mean_wake) for value in wakes)
    regularity = max(0.0, 1.0 - (bedtime_drift + wake_drift) / (2 * 240))
    return {
        "state": "ready" if len(nights) >= 7 else "partial",
        "sample_count": len(nights),
        "invalid_records": invalid,
        "average_duration_hours": round(fmean(durations), 3),
        "duration_variability_hours": round(pstdev(durations), 3)
        if len(nights) > 1
        else 0.0,
        "latest_midpoint_minutes": round(float(nights[-1]["midpoint_minutes"]), 1),
        "bedtime_drift_minutes": round(bedtime_drift, 1),
        "wake_time_drift_minutes": round(wake_drift, 1),
        "regularity_index": round(regularity, 4),
        "sleep_debt_hours": sleep_debt,
        "circadian_disruption_indicator": "elevated"
        if bedtime_drift > 120
        else "not_elevated",
        "nocturnal_recovery_opportunity": "review_sleep_schedule"
        if fmean(durations) < target_hours
        else "maintain",
        "limitations": [
            "Sleep calculations describe logged patterns and do not establish an acne cause.",
            "Chronotype requires longer longitudinal history and is not inferred here.",
        ],
    }
