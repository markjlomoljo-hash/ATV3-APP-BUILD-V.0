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
    by_date: dict[str, dict[str, Any]] = {}
    invalid = 0
    for index, row in enumerate(records):
        date = str(row.get("date", ""))[:10]
        key = date or f"__undated_{index}"
        by_date[key] = row
    nights: list[dict[str, float | str]] = []
    for key in sorted(by_date):
        row = by_date[key]
        try:
            bed = _clock_minutes(str(row["bedtime"]))
            wake = _clock_minutes(str(row["wake_time"]))
            computed_minutes = (wake - bed) % 1440
            manual_minutes = row.get("manual_duration_minutes")
            if manual_minutes is not None:
                if not str(row.get("manual_override_reason", "")).strip():
                    raise ValueError("manual_override_reason_required")
                duration_minutes = int(manual_minutes)
            else:
                duration_minutes = computed_minutes
            if not 60 <= duration_minutes <= 16 * 60:
                raise ValueError("sleep_duration_out_of_range")
        except (KeyError, TypeError, ValueError):
            invalid += 1
            continue
        duration_hours = duration_minutes / 60
        midpoint = (bed + (duration_minutes + 1) // 2) % 1440
        nights.append(
            {
                "date": str(row.get("date", ""))[:10],
                "duration_minutes": float(duration_minutes),
                "duration_hours": round(duration_hours, 3),
                "midpoint_minutes": midpoint,
                "bedtime_minutes": float(bed),
                "wake_minutes": float(wake),
                "target_minutes": float(
                    row.get("target_minutes", round(target_hours * 60))
                ),
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
    duration_minutes_values = [int(n["duration_minutes"]) for n in nights]
    midpoint_values = [int(n["midpoint_minutes"]) for n in nights]
    beds = [float(n["bedtime_minutes"]) for n in nights]
    wakes = [float(n["wake_minutes"]) for n in nights]
    bedtime_drift = (
        fmean(_circular_diff(value, beds[index]) for index, value in enumerate(beds[1:]))
        if len(beds) > 1
        else None
    )
    wake_drift = (
        fmean(
            _circular_diff(value, wakes[index])
            for index, value in enumerate(wakes[1:])
        )
        if len(wakes) > 1
        else None
    )
    sleep_debt_minutes: dict[str, int | None] = {}
    for window in (3, 7, 14, 30):
        if len(nights) < window:
            sleep_debt_minutes[f"{window}d"] = None
            continue
        selected = nights[-window:]
        sleep_debt_minutes[f"{window}d"] = sum(
            max(0, int(item["target_minutes"]) - int(item["duration_minutes"]))
            for item in selected
        )
    regularity_minutes = (
        (bedtime_drift + wake_drift) / 2
        if bedtime_drift is not None and wake_drift is not None
        else None
    )
    regularity = (
        max(0.0, 1.0 - regularity_minutes / 240)
        if regularity_minutes is not None
        else 0.0
    )
    state = (
        "ready"
        if len(nights) >= 7
        else "partial"
        if len(nights) >= 2
        else "insufficient_data"
    )
    return {
        "state": state,
        "sample_count": len(nights),
        "invalid_records": invalid,
        "durations_minutes": duration_minutes_values,
        "midpoints_minutes": midpoint_values,
        "average_duration_minutes": fmean(duration_minutes_values),
        "average_duration_hours": round(fmean(durations), 3),
        "duration_variability_hours": round(pstdev(durations), 3)
        if len(nights) > 1
        else 0.0,
        "latest_midpoint_minutes": round(float(nights[-1]["midpoint_minutes"]), 1),
        "bedtime_drift_minutes": round(bedtime_drift, 1)
        if bedtime_drift is not None
        else None,
        "wake_time_drift_minutes": round(wake_drift, 1)
        if wake_drift is not None
        else None,
        "regularity_minutes": regularity_minutes,
        "regularity_index": round(regularity, 4),
        "sleep_debt_minutes": sleep_debt_minutes,
        "sleep_debt_hours": {
            key: round(value / 60, 3) if value is not None else None
            for key, value in sleep_debt_minutes.items()
        },
        "circadian_disruption_indicator": "elevated"
        if bedtime_drift is not None and bedtime_drift > 120
        else "not_elevated",
        "nocturnal_recovery_opportunity": "review_sleep_schedule"
        if fmean(durations) < target_hours
        else "maintain",
        "limitations": [
            "Sleep calculations describe logged patterns and do not establish an acne cause.",
            "Chronotype requires longer longitudinal history and is not inferred here.",
        ],
    }
