from __future__ import annotations

from typing import Any


def analyze_climate(inputs: dict[str, Any]) -> dict[str, Any]:
    required = ("temperature_c", "humidity_percent")
    missing = [name for name in required if inputs.get(name) is None]
    if missing:
        return {"state": "insufficient_data", "features_missing": missing}
    temp = float(inputs["temperature_c"])
    humidity = float(inputs["humidity_percent"])
    uv = float(inputs["uv_index"]) if inputs.get("uv_index") is not None else None
    flags = []
    if temp >= 30:
        flags.append("high_temperature_exposure")
    if humidity >= 75:
        flags.append("high_humidity_exposure")
    if uv is not None and uv >= 6:
        flags.append("high_uv_context")
    return {
        "state": "ready",
        "context_flags": flags,
        "association": None,
        "limitations": ["Weather context alone does not establish a skin trigger."],
    }


def analyze_sweat(inputs: dict[str, Any]) -> dict[str, Any]:
    activity_minutes = inputs.get("activity_minutes")
    if activity_minutes is None:
        return {"state": "insufficient_data", "features_missing": ["activity_minutes"]}
    return {
        "state": "ready",
        "activity_minutes": max(0, int(activity_minutes)),
        "sweat_level": inputs.get("sweat_level", "unknown"),
        "post_activity_cleansing_logged": inputs.get("post_activity_cleansing")
        is not None,
        "association": None,
        "limitations": ["Activity and sweat context is observational and non-causal."],
    }


def analyze_cycle(inputs: dict[str, Any]) -> dict[str, Any]:
    if not bool(inputs.get("enabled", False)):
        return {"state": "consent_restricted", "reason": "cycle_tracking_not_enabled"}
    day = inputs.get("cycle_day")
    if day is None:
        return {"state": "insufficient_data", "features_missing": ["cycle_day"]}
    return {
        "state": "ready",
        "cycle_day": int(day),
        "association": None,
        "limitations": ["No hormonal cause, gender, or menstrual status is inferred."],
    }


def analyze_contact(inputs: dict[str, Any]) -> dict[str, Any]:
    events = inputs.get("events", [])
    if not isinstance(events, list) or not events:
        return {"state": "insufficient_data", "features_missing": ["contact_events"]}
    categories = sorted(
        {
            str(event.get("category"))
            for event in events
            if isinstance(event, dict) and event.get("category")
        }
    )
    return {
        "state": "ready",
        "event_count": len(events),
        "categories": categories,
        "association": None,
        "limitations": [
            "Logged contact is not assumed to be a trigger without longitudinal evidence."
        ],
    }
