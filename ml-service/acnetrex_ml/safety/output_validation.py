from typing import Any

from .clinical_language import validate_clinical_language


UNVALIDATED_PREDICTIVE_FIELDS = {
    "confidence",
    "future_image",
    "future_image_url",
    "lesion_count",
    "prediction",
    "probability",
    "risk_score",
    "severity_score",
}


def _present_predictive_fields(value: Any) -> list[str]:
    found: list[str] = []
    if isinstance(value, dict):
        for key, item in value.items():
            if key in UNVALIDATED_PREDICTIVE_FIELDS and item is not None:
                found.append(key)
            found.extend(_present_predictive_fields(item))
    elif isinstance(value, list):
        for item in value:
            found.extend(_present_predictive_fields(item))
    return found


def validate_safe_output(result: dict[str, Any]) -> None:
    violations = validate_clinical_language(result)
    if violations:
        raise ValueError(f"unsafe clinical wording: {', '.join(violations)}")
    predictive_fields = sorted(set(_present_predictive_fields(result)))
    if predictive_fields:
        raise ValueError(
            f"unvalidated predictive field: {', '.join(predictive_fields)}"
        )
    if (
        result.get("state") in {"insufficient_data", "model_unavailable"}
        and result.get("prediction") is not None
    ):
        raise ValueError("unavailable results cannot contain a prediction")
