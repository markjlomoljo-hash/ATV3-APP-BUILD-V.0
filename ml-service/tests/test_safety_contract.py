from __future__ import annotations

import pytest

from acnetrex_ml.safety.output_validation import validate_safe_output


@pytest.mark.parametrize(
    "forbidden",
    [
        {"lesion_count": 7},
        {"confidence": 0.91},
        {"risk_score": 0.73},
        {"future_image_url": "https://example.invalid/fake.jpg"},
        {"nested": {"severity_score": 4}},
    ],
)
def test_deterministic_outputs_reject_unvalidated_predictive_fields(forbidden) -> None:
    with pytest.raises(ValueError, match="unvalidated predictive field"):
        validate_safe_output({"state": "ready", **forbidden})


def test_deterministic_outputs_reject_diagnosis_and_causation() -> None:
    with pytest.raises(ValueError, match="unsafe clinical wording"):
        validate_safe_output(
            {"state": "ready", "summary": "You have acne definitely caused by sleep."}
        )
