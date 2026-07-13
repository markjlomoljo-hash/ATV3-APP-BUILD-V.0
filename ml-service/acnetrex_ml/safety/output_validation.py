from typing import Any

from .clinical_language import validate_clinical_language


def validate_safe_output(result: dict[str, Any]) -> None:
    violations = validate_clinical_language(result)
    if violations:
        raise ValueError(f"unsafe clinical wording: {', '.join(violations)}")
    if (
        result.get("state") in {"insufficient_data", "model_unavailable"}
        and result.get("prediction") is not None
    ):
        raise ValueError("unavailable results cannot contain a prediction")
