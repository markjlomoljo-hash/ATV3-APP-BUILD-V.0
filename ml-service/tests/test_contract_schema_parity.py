from __future__ import annotations

import json
from pathlib import Path

import pytest
from pydantic import ValidationError

from acnetrex_ml.contracts.requests import InferenceRequest
from acnetrex_ml.contracts.responses import InferenceResponse


SCHEMA_ROOT = Path(__file__).resolve().parents[1] / "schemas"
UUID = "11111111-1111-4111-8111-111111111111"


def valid_request() -> dict:
    return {
        "contract_version": "1.0.0",
        "request_id": UUID,
        "idempotency_key": UUID,
        "module": "sleepderm",
        "task": "sleep_pattern_analysis",
        "runtime_preference": "cloud",
        "feature_schema_version": "1.0.0",
        "input_record_refs": ["sleep_logs:11111111-1111-4111-8111-111111111112"],
        "inputs": {},
        "context": {"timezone": "Asia/Manila", "locale": "en-PH"},
        "consent": {
            "personal_processing": True,
            "raw_image_processing": False,
            "anonymous_learning": False,
        },
    }


def test_request_pydantic_and_json_schema_publish_the_zod_v1_constraints() -> None:
    schema = json.loads(
        (SCHEMA_ROOT / "inference-request.schema.json").read_text(encoding="utf-8")
    )
    properties = schema["properties"]

    assert set(schema["required"]) == set(valid_request())
    assert properties["module"] == {
        "type": "string",
        "minLength": 2,
        "maxLength": 64,
        "pattern": "^[a-z0-9_-]+$",
    }
    assert properties["task"] == {
        "type": "string",
        "minLength": 2,
        "maxLength": 96,
        "pattern": "^[a-z0-9_-]+$",
    }
    assert properties["input_record_refs"] == {
        "type": "array",
        "maxItems": 500,
        "items": {
            "type": "string",
            "minLength": 3,
            "maxLength": 241,
            "pattern": "^[a-z][a-z0-9_]{0,79}:[A-Za-z0-9-]{1,160}$",
        },
    }
    assert schema["properties"]["context"]["required"] == ["timezone", "locale"]

    InferenceRequest.model_validate(valid_request())
    invalid_cases = [
        {key: value for key, value in valid_request().items() if key != "context"},
        {**valid_request(), "module": "SLEEP DERM"},
        {**valid_request(), "input_record_refs": ["not-an-owner-record-reference"]},
    ]
    for invalid in invalid_cases:
        with pytest.raises(ValidationError):
            InferenceRequest.model_validate(invalid)


def test_response_identity_types_and_feature_version_match_zod_v1() -> None:
    schema = json.loads(
        (SCHEMA_ROOT / "inference-response.schema.json").read_text(encoding="utf-8")
    )

    assert schema["properties"]["request_id"] == {
        "type": "string",
        "format": "uuid",
    }
    assert schema["properties"]["job_id"] == {
        "type": ["string", "null"],
        "format": "uuid",
    }
    assert schema["properties"]["feature_schema_version"] == {"const": "1.0.0"}
    assert "job_id" in schema["required"]
    assert schema["properties"]["module"] == {
        "type": "string",
        "minLength": 2,
        "maxLength": 64,
    }
    assert schema["properties"]["runtime_provider"] == {
        "type": "string",
        "minLength": 1,
        "maxLength": 96,
    }
    assert schema["properties"]["features_used"]["maxItems"] == 500
    assert schema["properties"]["features_used"]["items"]["maxLength"] == 160
    assert schema["properties"]["limitations"]["maxItems"] == 100
    assert "minItems" not in schema["properties"]["limitations"]

    generated = InferenceResponse.model_json_schema()["properties"]
    assert generated["request_id"]["format"] == "uuid"
    assert generated["job_id"]["format"] == "uuid"
    assert any(
        candidate.get("type") == "string" for candidate in generated["job_id"]["anyOf"]
    )
    assert generated["feature_schema_version"]["const"] == "1.0.0"

    with pytest.raises(ValidationError):
        InferenceResponse.model_validate(
            {
                "ok": False,
                "request_id": UUID,
                "job_id": None,
                "module": "sleepderm",
                "task": "sleep_pattern_analysis",
                "result_type": "model_unavailable",
                "result": None,
                "runtime_mode": "unavailable",
                "runtime_provider": "x" * 97,
                "readiness_state": "model_unavailable",
                "limitations": [],
                "safety_state": "model_unavailable",
            }
        )
