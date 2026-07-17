"""
skin_cnn.py — Deterministic CNN-complementary skin image analysis engine.

This engine analyzes image metadata and pixel statistics to produce a
structured skin assessment. It does NOT diagnose or prescribe treatment.
It is designed to complement the faceatlas_quality engine by providing
an evidence-based severity estimate from image features.

Zero-fabrication contract: all outputs are derived from supplied inputs.
If inputs are insufficient, the engine returns insufficient_data state.
"""
from __future__ import annotations
import math
from typing import Any


# Severity thresholds based on IGA (Investigator's Global Assessment) scale
# Mapped to normalized 0-1 scores from image features
_IGA_LABELS = {
    0: "clear",
    1: "almost_clear",
    2: "mild",
    3: "moderate",
    4: "severe",
}

_IGA_DESCRIPTIONS = {
    0: "No visible lesions detected from image features.",
    1: "Very few lesions; minimal visible inflammation.",
    2: "Some lesions visible; limited inflammation.",
    3: "Multiple lesions with moderate inflammation.",
    4: "Many lesions with significant inflammation.",
}


def _estimate_redness_score(r: float, g: float, b: float) -> float:
    """
    Estimate redness from RGB channel means (0-255 range).
    Returns 0.0 (no redness) to 1.0 (high redness).
    """
    if r <= 0 and g <= 0 and b <= 0:
        return 0.0
    # Redness index: how much red dominates over green/blue
    total = r + g + b
    if total == 0:
        return 0.0
    r_norm = r / total
    # Subtract baseline skin tone redness (~0.40 for neutral skin)
    redness = max(0.0, (r_norm - 0.38) / 0.25)
    return min(1.0, redness)


def _estimate_texture_score(laplacian_variance: float | None) -> float:
    """
    Estimate skin texture irregularity from Laplacian variance.
    Higher variance = more texture = potentially more lesions.
    Returns 0.0 (smooth) to 1.0 (highly textured).
    """
    if laplacian_variance is None:
        return 0.0
    # Typical smooth skin: ~100-300, textured/lesioned: 300-800+
    normalized = min(1.0, max(0.0, (float(laplacian_variance) - 100) / 700))
    return normalized


def _estimate_contrast_score(contrast: float | None) -> float:
    """
    Estimate local contrast variation (lesions create high local contrast).
    Returns 0.0 (uniform) to 1.0 (high contrast).
    """
    if contrast is None:
        return 0.0
    # Typical range: 0.05-0.35
    normalized = min(1.0, max(0.0, (float(contrast) - 0.05) / 0.30))
    return normalized


def _iga_from_score(score: float) -> int:
    """Map 0-1 severity score to IGA grade 0-4."""
    if score < 0.10:
        return 0
    elif score < 0.25:
        return 1
    elif score < 0.45:
        return 2
    elif score < 0.70:
        return 3
    else:
        return 4


def analyze_skin_image(inputs: dict[str, Any]) -> dict[str, Any]:
    """
    Analyze skin image metadata to produce a severity estimate.

    Expected inputs:
        images: list of image metadata dicts, each with:
            - angle: str (front, left, right, chin, forehead)
            - width: int
            - height: int
            - mean_brightness: float (0-1)
            - contrast: float (0-1)
            - laplacian_variance: float (sharpness metric)
            - bytes: int
            - mean_r: float (0-255, optional)
            - mean_g: float (0-255, optional)
            - mean_b: float (0-255, optional)
        skin_tone: str (optional, for calibration)
        consent_raw_image: bool (must be True for image processing)
    """
    images = inputs.get("images", [])
    consent_raw_image = bool(inputs.get("consent_raw_image", False))
    skin_tone = str(inputs.get("skin_tone", "unknown"))

    if not isinstance(images, list) or len(images) == 0:
        return {
            "state": "insufficient_data",
            "iga_grade": None,
            "iga_label": None,
            "severity_score": None,
            "zone_analysis": [],
            "confidence": 0.0,
            "limitations": [
                "No image metadata provided. Supply image metadata to enable analysis.",
                "This engine analyzes image metadata features, not raw pixel content.",
            ],
        }

    if not consent_raw_image:
        return {
            "state": "consent_restricted",
            "iga_grade": None,
            "iga_label": None,
            "severity_score": None,
            "zone_analysis": [],
            "confidence": 0.0,
            "limitations": [
                "Raw image processing requires explicit consent (consent_raw_image=True).",
            ],
        }

    zone_scores: list[dict[str, Any]] = []
    all_severity_scores: list[float] = []

    for item in images:
        if not isinstance(item, dict):
            continue

        angle = str(item.get("angle", "unknown"))
        brightness = item.get("mean_brightness")
        contrast = item.get("contrast")
        blur = item.get("laplacian_variance")
        mean_r = item.get("mean_r")
        mean_g = item.get("mean_g")
        mean_b = item.get("mean_b")

        # Skip images with insufficient metadata
        if brightness is None and contrast is None and blur is None:
            zone_scores.append({
                "angle": angle,
                "state": "insufficient_metadata",
                "severity_score": None,
                "iga_grade": None,
                "features_used": [],
            })
            continue

        features_used: list[str] = []
        component_scores: list[float] = []

        # Texture score from sharpness
        texture = _estimate_texture_score(blur)
        if blur is not None:
            features_used.append("laplacian_variance")
            component_scores.append(texture * 0.40)

        # Contrast score
        contrast_score = _estimate_contrast_score(contrast)
        if contrast is not None:
            features_used.append("contrast")
            component_scores.append(contrast_score * 0.35)

        # Redness score from RGB (if available)
        if mean_r is not None and mean_g is not None and mean_b is not None:
            redness = _estimate_redness_score(float(mean_r), float(mean_g), float(mean_b))
            features_used.append("rgb_channels")
            component_scores.append(redness * 0.25)
        elif brightness is not None:
            # Use brightness deviation as proxy for redness
            bright_f = float(brightness)
            # Inflamed skin tends to be brighter in red channel
            bright_score = max(0.0, (bright_f - 0.55) / 0.35) if bright_f > 0.55 else 0.0
            features_used.append("mean_brightness")
            component_scores.append(bright_score * 0.15)

        if not component_scores:
            zone_scores.append({
                "angle": angle,
                "state": "insufficient_metadata",
                "severity_score": None,
                "iga_grade": None,
                "features_used": features_used,
            })
            continue

        zone_severity = sum(component_scores)
        iga = _iga_from_score(zone_severity)
        all_severity_scores.append(zone_severity)

        zone_scores.append({
            "angle": angle,
            "state": "analyzed",
            "severity_score": round(zone_severity, 3),
            "iga_grade": iga,
            "iga_label": _IGA_LABELS[iga],
            "features_used": features_used,
        })

    if not all_severity_scores:
        return {
            "state": "insufficient_data",
            "iga_grade": None,
            "iga_label": None,
            "severity_score": None,
            "zone_analysis": zone_scores,
            "confidence": 0.0,
            "limitations": [
                "Insufficient image metadata to compute severity estimate.",
                "Ensure images include contrast, laplacian_variance, and brightness fields.",
            ],
        }

    # Aggregate: use weighted average (front face gets 2x weight)
    weighted_scores: list[float] = []
    for zs in zone_scores:
        if zs.get("severity_score") is None:
            continue
        weight = 2.0 if zs.get("angle") == "front" else 1.0
        weighted_scores.extend([zs["severity_score"]] * int(weight))

    overall_severity = sum(weighted_scores) / len(weighted_scores) if weighted_scores else 0.0
    overall_iga = _iga_from_score(overall_severity)

    # Confidence: based on number of zones analyzed and features available
    analyzed_zones = sum(1 for zs in zone_scores if zs.get("state") == "analyzed")
    confidence = min(1.0, analyzed_zones / 3.0) * 0.75  # Max 0.75 without raw pixels

    # Skin tone calibration note
    calibration_note = None
    if skin_tone in ("deep", "tan"):
        calibration_note = "Redness-based features may underestimate severity for deeper skin tones. Texture and contrast features are more reliable."
    elif skin_tone in ("very_fair", "fair"):
        calibration_note = "Redness features may overestimate severity for very fair skin tones. Cross-reference with texture scores."

    return {
        "state": "ready",
        "iga_grade": overall_iga,
        "iga_label": _IGA_LABELS[overall_iga],
        "iga_description": _IGA_DESCRIPTIONS[overall_iga],
        "severity_score": round(overall_severity, 3),
        "zone_analysis": zone_scores,
        "zones_analyzed": analyzed_zones,
        "confidence": round(confidence, 3),
        "skin_tone_calibration": calibration_note,
        "limitations": [
            "This analysis uses image metadata features (contrast, texture, brightness), not raw pixel CNN inference.",
            "Results are indicative only and do not constitute a medical diagnosis.",
            "Accuracy improves with more image angles and complete metadata.",
            "Consult a dermatologist for clinical assessment.",
        ],
    }
