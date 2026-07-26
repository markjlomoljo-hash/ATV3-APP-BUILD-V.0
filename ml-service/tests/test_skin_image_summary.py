from __future__ import annotations

import json
from pathlib import Path
from typing import Any
from uuid import uuid4

import pytest
from fastapi.testclient import TestClient

from acnetrex_ml.engines.dispatcher import dispatch_deterministic
from acnetrex_ml.engines.skin_image_summary import (
    EXPECTED_METADATA_FIELDS,
    summarize_skin_image_metadata,
)
from acnetrex_ml.safety.output_validation import (
    UNVALIDATED_PREDICTIVE_FIELDS,
    validate_safe_output,
)
from main import app


client = TestClient(app)


def full_metadata_image(angle: str) -> dict[str, Any]:
    return {
        "angle": angle,
        "width": 1280,
        "height": 720,
        "bytes": 500_000,
        "mean_brightness": 0.52,
        "contrast": 0.2,
        "laplacian_variance": 240,
        "mean_r": 132,
        "mean_g": 110,
        "mean_b": 98,
    }


def collect_keys(value: Any) -> set[str]:
    keys: set[str] = set()
    if isinstance(value, dict):
        for key, item in value.items():
            keys.add(str(key))
            keys |= collect_keys(item)
    elif isinstance(value, list):
        for item in value:
            keys |= collect_keys(item)
    return keys


def test_full_metadata_images_produce_a_ready_descriptive_summary() -> None:
    result = summarize_skin_image_metadata(
        {"images": [full_metadata_image("front"), full_metadata_image("left_45")]}
    )

    assert result["state"] == "ready"
    assert result["redness_index"] == 0.033
    assert result["texture_contrast_index"] == 0.35
    assert result["metadata_completeness"] == 1.0
    assert result["zones_with_metadata"] == ["front", "left_45"]
    assert result["zones_missing_metadata"] == []
    assert all(
        zone["state"] == "described"
        and zone["metadata_fields_present"] == sorted(EXPECTED_METADATA_FIELDS)
        for zone in result["zone_summaries"]
    )


def test_missing_images_fail_closed_with_insufficient_data() -> None:
    result = summarize_skin_image_metadata({"images": []})

    assert result["state"] == "insufficient_data"
    assert result["features_missing"] == ["images"]
    assert result["redness_index"] is None
    assert result["texture_contrast_index"] is None
    assert result["metadata_completeness"] == 0.0
    assert result["zone_summaries"] == []


def test_metadata_free_images_fail_closed_without_substitute_indices() -> None:
    result = summarize_skin_image_metadata(
        {"images": [{"angle": "front", "width": 1280, "height": 720}]}
    )

    assert result["state"] == "insufficient_data"
    assert result["redness_index"] is None
    assert result["texture_contrast_index"] is None
    assert result["zones_missing_metadata"] == ["front"]


def test_mixed_metadata_coverage_reports_partial_state() -> None:
    result = summarize_skin_image_metadata(
        {
            "images": [
                full_metadata_image("front"),
                {"angle": "chin_lower", "width": 1280, "height": 720},
            ]
        }
    )

    assert result["state"] == "partial"
    assert result["zones_with_metadata"] == ["front"]
    assert result["zones_missing_metadata"] == ["chin_lower"]


def test_json_null_angles_render_unknown_like_the_ts_twin() -> None:
    result = summarize_skin_image_metadata(
        {
            "images": [
                {"angle": None, "width": 960, "height": 540},
                {"width": 960, "height": 540},
            ]
        }
    )

    assert [zone["angle"] for zone in result["zone_summaries"]] == [
        "unknown",
        "unknown",
    ]
    assert result["zones_missing_metadata"] == ["unknown"]


def test_non_array_images_are_rejected() -> None:
    with pytest.raises(ValueError, match="images must be an array"):
        summarize_skin_image_metadata({"images": "not-a-list"})


def test_python_engine_matches_shared_mobile_parity_fixture() -> None:
    fixture_path = (
        Path(__file__).resolve().parents[2]
        / "packages/ml-local-runtime/tests/fixtures/skin-image-parity.json"
    )
    fixture = json.loads(fixture_path.read_text(encoding="utf-8"))

    result = summarize_skin_image_metadata({"images": fixture["images"]})

    assert {key: result[key] for key in fixture["expected"]} == fixture["expected"]


@pytest.mark.parametrize(
    "inputs",
    [
        {"images": []},
        {"images": [{"angle": "front"}]},
        {"images": [full_metadata_image("front")]},
        {
            "images": [
                full_metadata_image("front"),
                {"angle": "chin_lower", "width": 1280},
            ]
        },
    ],
)
def test_engine_output_never_contains_blocklisted_predictive_fields(inputs) -> None:
    result = summarize_skin_image_metadata(inputs)

    validate_safe_output(result)
    assert collect_keys(result) & UNVALIDATED_PREDICTIVE_FIELDS == set()


def test_retired_cnn_engine_key_is_no_longer_dispatchable() -> None:
    assert (
        dispatch_deterministic(
            "skin_cnn",
            "image_severity_analysis",
            {"images": [full_metadata_image("front")]},
        )
        is None
    )


def test_service_predict_returns_validated_descriptive_summary() -> None:
    key = str(uuid4())
    body = {
        "contract_version": "1.0.0",
        "request_id": str(uuid4()),
        "idempotency_key": key,
        "module": "skin_image",
        "task": "metadata_summary",
        "runtime_preference": "auto",
        "feature_schema_version": "1.0.0",
        "input_record_refs": [],
        "inputs": {"images": [full_metadata_image("front")]},
        "context": {"timezone": "Asia/Manila", "locale": "en-PH"},
        "consent": {
            "personal_processing": True,
            "raw_image_processing": False,
            "anonymous_learning": False,
        },
    }

    response = client.post("/v1/predict", json=body, headers={"idempotency-key": key})

    assert response.status_code == 200
    payload = response.json()
    assert payload["ok"] is True
    assert payload["module"] == "skin_image"
    assert payload["task"] == "metadata_summary"
    assert payload["runtime_mode"] == "local_deterministic"
    assert payload["readiness_state"] == "ready"
    assert payload["confidence"] is None
    validate_safe_output(payload["result"])
    assert payload["result"]["state"] == "ready"
    assert payload["result"]["redness_index"] == 0.033


def test_service_predict_reports_insufficient_data_without_fabrication() -> None:
    key = str(uuid4())
    body = {
        "contract_version": "1.0.0",
        "request_id": str(uuid4()),
        "idempotency_key": key,
        "module": "skin_image",
        "task": "metadata_summary",
        "runtime_preference": "auto",
        "feature_schema_version": "1.0.0",
        "input_record_refs": [],
        "inputs": {"images": []},
        "context": {"timezone": "Asia/Manila", "locale": "en-PH"},
        "consent": {
            "personal_processing": True,
            "raw_image_processing": False,
            "anonymous_learning": False,
        },
    }

    response = client.post("/v1/predict", json=body, headers={"idempotency-key": key})

    assert response.status_code == 422
    payload = response.json()
    assert payload["ok"] is False
    assert payload["readiness_state"] == "insufficient_data"
    assert payload["result"]["redness_index"] is None
