from __future__ import annotations

import hashlib
import json
from pathlib import Path

import pytest

from acnetrex_ml.contracts.requests import InferenceRequest
from acnetrex_ml.predictive.artifact import (
    ArtifactRejected,
    PredictiveArtifact,
    load_approved_artifact,
)
from acnetrex_ml.service.app import _predict_core


def _artifact_payload() -> dict:
    return {
        "artifact_format": "acnetrex_predictive_ensemble_v1",
        "model_name": "flare_direction_ensemble_v1",
        "model_version": "1.0.0-test",
        "task": "flare_direction",
        "dataset_version": "governed-fixture-v1",
        "feature_schema_version": "1.0.0",
        "feature_names": ["sleep_hours", "stress_score"],
        "normalization": {"mean": [7.0, 5.0], "scale": [1.0, 2.0]},
        "structured_model": {"weights": [0.8, -0.4], "bias": 0.1},
        "residual_mlp": {
            "input_weights": [[0.5, 0.1], [-0.2, 0.4]],
            "input_bias": [0.0, 0.0],
            "output_weights": [0.6, -0.3],
            "output_bias": -0.1,
        },
        "ensemble": {
            "structured_weight": 0.4,
            "ann_weight": 0.6,
            "calibration_slope": 1.1,
            "calibration_intercept": -0.05,
            "threshold": 0.5,
        },
        "evaluation": {
            "holdout_kind": "participant_grouped_temporal",
            "calibration_state": "calibrated",
        },
        "limitations": ["Test artifact; not approved for production use."],
    }


def _write_registry(tmp_path: Path, *, status: str = "active") -> tuple[Path, Path]:
    artifact_path = tmp_path / "artifacts" / "flare.json"
    artifact_path.parent.mkdir(exist_ok=True)
    artifact_path.write_text(json.dumps(_artifact_payload()), encoding="utf-8")
    digest = hashlib.sha256(artifact_path.read_bytes()).hexdigest()
    registry_path = tmp_path / "model-registry.json"
    registry_path.write_text(
        json.dumps(
            {
                "models": [
                    {
                        "model_name": "flare_direction_ensemble_v1",
                        "model_version": "1.0.0-test",
                        "status": status,
                        "task": "flare_direction",
                        "runtime_targets": ["cloud_run"],
                        "artifact_uri": "artifacts/flare.json",
                        "artifact_hash": digest,
                        "dataset_version": "governed-fixture-v1",
                        "feature_schema_version": "1.0.0",
                        "label_schema_version": "1.0.0",
                        "training_run_id": "fixture-only",
                        "evaluation_report": "reports/fixture.md",
                        "model_card": "reports/fixture-card.md",
                        "created_at": "2026-07-15T00:00:00Z",
                        "approved_at": "2026-07-15T00:00:00Z",
                        "approval_state": "manually_approved",
                        "limitations": ["Fixture only"],
                    }
                ]
            }
        ),
        encoding="utf-8",
    )
    return registry_path, artifact_path


def test_residual_mlp_ensemble_returns_calibrated_probability() -> None:
    artifact = PredictiveArtifact.model_validate(_artifact_payload())

    prediction = artifact.predict({"sleep_hours": 8.0, "stress_score": 3.0})

    assert 0.0 < prediction.probability < 1.0
    assert prediction.label in {"lower_or_stable", "higher"}
    assert prediction.calibration_state == "calibrated"
    assert prediction.component_probabilities.keys() == {"structured", "residual_mlp"}
    assert prediction.features_used == ["sleep_hours", "stress_score"]


@pytest.mark.parametrize(
    "inputs",
    [
        {"sleep_hours": 8.0},
        {"sleep_hours": "8", "stress_score": 3.0},
        {"sleep_hours": float("nan"), "stress_score": 3.0},
    ],
)
def test_prediction_rejects_missing_non_numeric_or_non_finite_features(inputs) -> None:
    artifact = PredictiveArtifact.model_validate(_artifact_payload())

    with pytest.raises(ArtifactRejected, match="invalid_features"):
        artifact.predict(inputs)


def test_loader_requires_active_or_approved_checksum_verified_artifact(
    tmp_path,
) -> None:
    registry_path, _ = _write_registry(tmp_path)

    loaded = load_approved_artifact(registry_path, task="flare_direction")

    assert loaded.model_name == "flare_direction_ensemble_v1"


def test_loader_fails_closed_for_rejected_or_tampered_artifact(tmp_path) -> None:
    rejected_registry, artifact_path = _write_registry(tmp_path, status="rejected")
    with pytest.raises(ArtifactRejected, match="no_approved_model"):
        load_approved_artifact(rejected_registry, task="flare_direction")

    active_registry, artifact_path = _write_registry(tmp_path, status="active")
    artifact_path.write_text("{}", encoding="utf-8")
    with pytest.raises(ArtifactRejected, match="artifact_checksum_mismatch"):
        load_approved_artifact(active_registry, task="flare_direction")


def test_loader_rejects_artifact_path_outside_registry_root(tmp_path) -> None:
    registry_path, _ = _write_registry(tmp_path)
    outside = tmp_path.parent / "outside-artifact.json"
    outside.write_text(json.dumps(_artifact_payload()), encoding="utf-8")
    payload = json.loads(registry_path.read_text(encoding="utf-8"))
    payload["models"][0]["artifact_uri"] = "../outside-artifact.json"
    payload["models"][0]["artifact_hash"] = hashlib.sha256(
        outside.read_bytes()
    ).hexdigest()
    registry_path.write_text(json.dumps(payload), encoding="utf-8")

    with pytest.raises(ArtifactRejected, match="artifact_path_outside_registry_root"):
        load_approved_artifact(registry_path, task="flare_direction")


def test_service_executes_only_checksum_verified_active_predictive_model(
    tmp_path, monkeypatch
) -> None:
    registry_path, _ = _write_registry(tmp_path)
    monkeypatch.setenv("MODEL_REGISTRY_PATH", str(registry_path))
    request = InferenceRequest.model_validate(
        {
            "contract_version": "1.0.0",
            "request_id": "11111111-1111-4111-8111-111111111111",
            "idempotency_key": "22222222-2222-4222-8222-222222222222",
            "module": "forecast",
            "task": "flare_direction",
            "runtime_preference": "auto",
            "feature_schema_version": "1.0.0",
            "input_record_refs": [],
            "inputs": {"sleep_hours": 8.0, "stress_score": 3.0},
            "context": {"timezone": "UTC", "locale": "en"},
            "consent": {
                "personal_processing": True,
                "raw_image_processing": False,
                "anonymous_learning": False,
            },
        }
    )

    response = _predict_core(request)

    assert response.ok is True
    assert response.result_type == "calibrated_predictive_ensemble"
    assert response.runtime_mode == "cloud_run"
    assert response.model_name == "flare_direction_ensemble_v1"
    assert response.training_data_version == "governed-fixture-v1"
    assert response.calibration_state == "calibrated"
    assert response.confidence == response.result["direction_probability"]
    assert response.result["component_models"].keys() == {
        "structured",
        "residual_mlp",
    }


def test_service_remains_unavailable_when_active_artifact_is_tampered(
    tmp_path, monkeypatch
) -> None:
    registry_path, artifact_path = _write_registry(tmp_path)
    artifact_path.write_text("{}", encoding="utf-8")
    monkeypatch.setenv("MODEL_REGISTRY_PATH", str(registry_path))
    request = InferenceRequest.model_validate(
        {
            "contract_version": "1.0.0",
            "request_id": "11111111-1111-4111-8111-111111111111",
            "idempotency_key": "22222222-2222-4222-8222-222222222222",
            "module": "forecast",
            "task": "flare_direction",
            "runtime_preference": "auto",
            "feature_schema_version": "1.0.0",
            "input_record_refs": [],
            "inputs": {"sleep_hours": 8.0, "stress_score": 3.0},
            "context": {"timezone": "UTC", "locale": "en"},
            "consent": {
                "personal_processing": True,
                "raw_image_processing": False,
                "anonymous_learning": False,
            },
        }
    )

    response = _predict_core(request)

    assert response.ok is False
    assert response.readiness_state == "model_unavailable"
    assert response.result is None


def test_service_reports_insufficient_data_when_server_features_are_missing(
    tmp_path, monkeypatch
) -> None:
    registry_path, _ = _write_registry(tmp_path)
    monkeypatch.setenv("MODEL_REGISTRY_PATH", str(registry_path))
    request = InferenceRequest.model_validate(
        {
            "contract_version": "1.0.0",
            "request_id": "11111111-1111-4111-8111-111111111111",
            "idempotency_key": "22222222-2222-4222-8222-222222222222",
            "module": "forecast",
            "task": "flare_direction",
            "runtime_preference": "auto",
            "feature_schema_version": "1.0.0",
            "input_record_refs": [],
            "inputs": {"sleep_hours": 8.0},
            "context": {"timezone": "UTC", "locale": "en"},
            "consent": {
                "personal_processing": True,
                "raw_image_processing": False,
                "anonymous_learning": False,
            },
        }
    )

    response = _predict_core(request)

    assert response.ok is False
    assert response.readiness_state == "insufficient_data"
    assert response.features_missing == ["stress_score"]
    assert response.result is None
