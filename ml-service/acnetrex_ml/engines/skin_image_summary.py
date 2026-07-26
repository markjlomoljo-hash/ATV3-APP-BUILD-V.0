"""
skin_image_summary.py — Descriptive skin image metadata summary engine.

This engine summarizes supplied image metadata (channel means, contrast,
sharpness statistics) into non-clinical descriptive indices. It performs no
grading, no detection, and no clinical assessment of any kind.

Zero-fabrication contract: every value is derived from supplied inputs.
If inputs are insufficient, the engine returns an honest
insufficient_data state instead of a substitute output.
"""

from __future__ import annotations

import math
from typing import Any

EXPECTED_METADATA_FIELDS = (
    "bytes",
    "contrast",
    "height",
    "laplacian_variance",
    "mean_b",
    "mean_brightness",
    "mean_g",
    "mean_r",
    "width",
)

_LIMITATIONS = [
    "This is a descriptive summary of supplied image metadata statistics only.",
    "No skin condition is detected, graded, classified, or assessed.",
    "Indices describe channel share and metadata contrast, not clinical findings.",
]


def _round3(value: float) -> float:
    return math.floor(value * 1000 + 0.5) / 1000


def _clamp01(value: float) -> float:
    return min(1.0, max(0.0, value))


def _redness_index(item: dict[str, Any]) -> float | None:
    mean_r = item.get("mean_r")
    mean_g = item.get("mean_g")
    mean_b = item.get("mean_b")
    if mean_r is None or mean_g is None or mean_b is None:
        return None
    total = float(mean_r) + float(mean_g) + float(mean_b)
    if total <= 0:
        return None
    red_share = float(mean_r) / total
    return _round3(_clamp01((red_share - 0.38) / 0.25))


def _texture_contrast_index(item: dict[str, Any]) -> float | None:
    components: list[float] = []
    laplacian_variance = item.get("laplacian_variance")
    if laplacian_variance is not None:
        components.append(_clamp01((float(laplacian_variance) - 100) / 700))
    contrast = item.get("contrast")
    if contrast is not None:
        components.append(_clamp01((float(contrast) - 0.05) / 0.30))
    if not components:
        return None
    return _round3(sum(components) / len(components))


def summarize_skin_image_metadata(inputs: dict[str, Any]) -> dict[str, Any]:
    images = inputs.get("images", [])
    if not isinstance(images, list):
        raise ValueError("images must be an array")
    entries = [item for item in images if isinstance(item, dict)]
    if not entries:
        return {
            "state": "insufficient_data",
            "features_missing": ["images"],
            "redness_index": None,
            "texture_contrast_index": None,
            "metadata_completeness": 0.0,
            "zones_with_metadata": [],
            "zones_missing_metadata": [],
            "zone_summaries": [],
            "limitations": _LIMITATIONS,
        }

    zone_summaries: list[dict[str, Any]] = []
    completeness_values: list[float] = []
    for item in entries:
        # Parity with the TS twin (`image.angle ?? "unknown"`): a JSON-null
        # angle is treated exactly like a missing one, never rendered "None".
        raw_angle = item.get("angle")
        angle = "unknown" if raw_angle is None else str(raw_angle)
        fields_present = sorted(
            field for field in EXPECTED_METADATA_FIELDS if item.get(field) is not None
        )
        completeness_values.append(len(fields_present) / len(EXPECTED_METADATA_FIELDS))
        redness = _redness_index(item)
        texture_contrast = _texture_contrast_index(item)
        described = redness is not None or texture_contrast is not None
        zone_summaries.append(
            {
                "angle": angle,
                "state": "described" if described else "insufficient_metadata",
                "redness_index": redness,
                "texture_contrast_index": texture_contrast,
                "metadata_fields_present": fields_present,
            }
        )

    described_zones = [zone for zone in zone_summaries if zone["state"] == "described"]
    redness_values = [
        zone["redness_index"]
        for zone in described_zones
        if zone["redness_index"] is not None
    ]
    texture_values = [
        zone["texture_contrast_index"]
        for zone in described_zones
        if zone["texture_contrast_index"] is not None
    ]
    if not described_zones:
        state = "insufficient_data"
    elif len(described_zones) == len(zone_summaries):
        state = "ready"
    else:
        state = "partial"

    return {
        "state": state,
        "redness_index": (
            _round3(sum(redness_values) / len(redness_values))
            if redness_values
            else None
        ),
        "texture_contrast_index": (
            _round3(sum(texture_values) / len(texture_values))
            if texture_values
            else None
        ),
        "metadata_completeness": _round3(
            sum(completeness_values) / len(completeness_values)
        ),
        "zones_with_metadata": sorted({zone["angle"] for zone in described_zones}),
        "zones_missing_metadata": sorted(
            {
                zone["angle"]
                for zone in zone_summaries
                if zone["state"] == "insufficient_metadata"
            }
        ),
        "zone_summaries": zone_summaries,
        "limitations": _LIMITATIONS,
    }
