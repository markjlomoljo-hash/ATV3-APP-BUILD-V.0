from __future__ import annotations

from typing import Any

REQUIRED_ANGLES = {"front", "left_45", "right_45", "forehead_upper", "chin_lower"}


def assess_faceatlas_quality(inputs: dict[str, Any]) -> dict[str, Any]:
    images = inputs.get("images", [])
    if not isinstance(images, list):
        raise ValueError("images must be an array")
    angles = {str(item.get("angle")) for item in images if isinstance(item, dict)}
    missing_angles = sorted(REQUIRED_ANGLES - angles)
    duplicate_angles = sorted(
        angle
        for angle in REQUIRED_ANGLES
        if sum(item.get("angle") == angle for item in images if isinstance(item, dict))
        > 1
    )
    checks: list[dict[str, Any]] = []
    for item in images:
        if not isinstance(item, dict):
            continue
        width = int(item.get("width", 0))
        height = int(item.get("height", 0))
        brightness = item.get("mean_brightness")
        contrast = item.get("contrast")
        blur = item.get("laplacian_variance")
        size_bytes = int(item.get("bytes", 0))
        issues = []
        if width < 640 or height < 480:
            issues.append("resolution_low")
        if size_bytes <= 0 or size_bytes > 4 * 1024 * 1024:
            issues.append("file_size_invalid")
        if brightness is not None and not 0.18 <= float(brightness) <= 0.90:
            issues.append("lighting_out_of_range")
        if contrast is not None and float(contrast) < 0.08:
            issues.append("contrast_low")
        if blur is not None and float(blur) < 50:
            issues.append("blur_risk")
        checks.append(
            {"angle": item.get("angle"), "ready": not issues, "issues": issues}
        )
    ready = (
        bool(checks)
        and not missing_angles
        and not duplicate_angles
        and all(item["ready"] for item in checks)
    )
    annotations = inputs.get("annotations", [])
    if not isinstance(annotations, list):
        annotations = []
    by_lesion_type: dict[str, int] = {}
    by_zone: dict[str, int] = {}
    annotation_count = 0
    for annotation in annotations:
        if not isinstance(annotation, dict):
            continue
        annotation_count += 1
        lesion_type = annotation.get("lesion_type")
        zone = annotation.get("zone")
        if isinstance(lesion_type, str) and lesion_type:
            by_lesion_type[lesion_type] = by_lesion_type.get(lesion_type, 0) + 1
        if isinstance(zone, str) and zone:
            by_zone[zone] = by_zone.get(zone, 0) + 1
    return {
        "state": "ready" if ready else ("partial" if checks else "insufficient_data"),
        "capture_complete": not missing_angles,
        "missing_angles": missing_angles,
        "duplicate_angles": duplicate_angles,
        "quality_checks": checks,
        "annotation_count": annotation_count,
        "annotation_summary": {
            "by_lesion_type": dict(sorted(by_lesion_type.items())),
            "by_zone": dict(sorted(by_zone.items())),
        },
        "lesion_analysis": None,
        "limitations": [
            "Quality checks use stored capture metadata and do not detect or diagnose lesions.",
            "Annotation summaries reflect owner-scoped, user-provided labels and are not model diagnoses.",
            "Face presence and angle pose require a separately validated detector.",
        ],
    }
