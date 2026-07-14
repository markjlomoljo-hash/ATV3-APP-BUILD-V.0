from __future__ import annotations

from typing import Any

FORBIDDEN_PHRASES = (
    "you have acne",
    "diagnosed with",
    "will cure",
    "guaranteed outcome",
    "definitely caused by",
    "prescribe",
)


def validate_clinical_language(value: Any) -> list[str]:
    text = str(value).lower()
    return [phrase for phrase in FORBIDDEN_PHRASES if phrase in text]
