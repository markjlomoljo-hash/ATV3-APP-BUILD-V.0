import json
from pathlib import Path
from uuid import uuid4

from fastapi.testclient import TestClient

from main import app
from acnetrex_ml.engines.sleepderm import analyze_sleep


client = TestClient(app)


def test_python_sleep_engine_matches_shared_mobile_parity_fixture() -> None:
    fixture_path = (
        Path(__file__).resolve().parents[2]
        / "packages/ml-local-runtime/tests/fixtures/sleep-parity.json"
    )
    fixture = json.loads(fixture_path.read_text(encoding="utf-8"))

    result = analyze_sleep(fixture["records"])

    assert {key: result[key] for key in fixture["expected"]} == fixture["expected"]


def inference_payload() -> dict:
    key = str(uuid4())
    return {
        "contract_version": "1.0.0",
        "request_id": str(uuid4()),
        "idempotency_key": key,
        "module": "sleepderm",
        "task": "sleep_pattern_analysis",
        "runtime_preference": "auto",
        "feature_schema_version": "1.0.0",
        "input_record_refs": [],
        "inputs": {
            "records": [
                {"date": f"2026-07-{day:02d}", "bedtime": "23:00", "wake_time": "07:00"}
                for day in range(1, 8)
            ]
        },
        "context": {"timezone": "Asia/Manila", "locale": "en-PH"},
        "consent": {
            "personal_processing": True,
            "raw_image_processing": False,
            "anonymous_learning": False,
        },
    }


def test_canonical_service_surface_is_complete() -> None:
    routes = {route.path for route in app.routes}

    assert {
        "/",
        "/health/live",
        "/health/ready",
        "/v1/models",
        "/v1/metrics",
        "/v1/predict",
        "/predict",
        "/v1/batch",
        "/v1/explain",
        "/v1/feedback",
        "/v1/jobs",
        "/v1/jobs/{job_id}",
    } <= routes


def test_deterministic_prediction_uses_full_honest_contract(monkeypatch) -> None:
    monkeypatch.setenv("APP_ENV", "production")
    monkeypatch.setenv("ML_SERVICE_API_KEY", "server-secret")
    body = inference_payload()

    response = client.post(
        "/v1/predict",
        json=body,
        headers={
            "authorization": "Bearer server-secret",
            "idempotency-key": body["idempotency_key"],
        },
    )

    assert response.status_code == 200
    result = response.json()
    required = {
        "ok",
        "request_id",
        "job_id",
        "module",
        "task",
        "result_type",
        "result",
        "runtime_mode",
        "runtime_provider",
        "readiness_state",
        "model_name",
        "model_version",
        "training_data_version",
        "feature_schema_version",
        "input_record_refs",
        "features_used",
        "features_missing",
        "sample_count",
        "coverage",
        "confidence",
        "confidence_label",
        "calibration_state",
        "uncertainty",
        "limitations",
        "confounders",
        "evidence_state",
        "safety_state",
        "sync_status",
        "latency_ms",
        "created_at",
    }
    assert required <= result.keys()
    assert result["runtime_mode"] == "local_deterministic"
    assert result["confidence"] is None
    assert result["readiness_state"] == "ready"


def test_contract_forbids_client_identity(monkeypatch) -> None:
    monkeypatch.setenv("APP_ENV", "production")
    monkeypatch.setenv("ML_SERVICE_API_KEY", "server-secret")
    body = inference_payload()
    body["user_id"] = str(uuid4())

    response = client.post(
        "/v1/predict",
        json=body,
        headers={
            "authorization": "Bearer server-secret",
            "idempotency-key": body["idempotency_key"],
        },
    )

    assert response.status_code == 422


def test_service_job_endpoint_persists_a_completed_deterministic_result() -> None:
    body = inference_payload()

    created = client.post(
        "/v1/jobs",
        json=body,
        headers={"idempotency-key": body["idempotency_key"]},
    )

    assert created.status_code == 200
    assert created.json()["status"] == "completed"
    fetched = client.get(f"/v1/jobs/{created.json()['job_id']}")
    assert fetched.status_code == 200
    assert fetched.json()["status"] == "completed"
    assert fetched.json()["result"]["readiness_state"] == "ready"

    replay = client.post(
        "/v1/jobs",
        json={**body, "request_id": str(uuid4())},
        headers={"idempotency-key": body["idempotency_key"]},
    )
    assert replay.status_code == 200
    assert replay.headers["idempotency-replayed"] == "true"
    assert replay.json()["job_id"] == created.json()["job_id"]
