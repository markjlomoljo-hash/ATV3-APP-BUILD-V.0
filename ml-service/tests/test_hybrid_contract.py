import json
import time
from importlib import import_module
from pathlib import Path
from uuid import NAMESPACE_URL, uuid4, uuid5

from fastapi.testclient import TestClient

from main import app
from acnetrex_ml.engines.sleepderm import analyze_sleep
from acnetrex_ml.service.app import create_app
from acnetrex_ml.service.idempotency import MemoryIdempotencyStore
from acnetrex_ml.service.jobs import SQLiteJobStore


client = TestClient(app)
app_module = import_module("acnetrex_ml.service.app")


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
        "/api/v1/inference",
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
    assert result["request_id"] == body["request_id"]
    assert result["job_id"] == body["request_id"]
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

    compatibility = client.post(
        "/api/v1/inference",
        json=body,
        headers={
            "authorization": "Bearer server-secret",
            "idempotency-key": body["idempotency_key"],
        },
    )
    assert compatibility.status_code == response.status_code
    assert compatibility.headers["idempotency-replayed"] == "true"
    assert compatibility.json() == result
    assert result["runtime_mode"] == "local_deterministic"
    assert result["confidence"] is None
    assert result["readiness_state"] == "ready"


def test_unavailable_deterministic_response_never_substitutes_diagnostic_output(
    monkeypatch,
) -> None:
    monkeypatch.setenv("APP_ENV", "production")
    monkeypatch.setenv("ML_SERVICE_API_KEY", "server-secret")
    body = inference_payload()
    body["inputs"] = {"records": []}

    response = client.post(
        "/v1/predict",
        json=body,
        headers={
            "authorization": "Bearer server-secret",
            "idempotency-key": body["idempotency_key"],
        },
    )

    assert response.status_code == 422
    result = response.json()
    assert result["readiness_state"] == "insufficient_data"
    assert result["result"] is None
    assert result["confidence"] is None
    assert "bedtime" in result["features_missing"]


def test_consent_restricted_response_has_null_result(monkeypatch) -> None:
    monkeypatch.setenv("APP_ENV", "production")
    monkeypatch.setenv("ML_SERVICE_API_KEY", "server-secret")
    body = inference_payload()
    body["consent"]["personal_processing"] = False

    response = client.post(
        "/v1/predict",
        json=body,
        headers={
            "authorization": "Bearer server-secret",
            "idempotency-key": body["idempotency_key"],
        },
    )

    assert response.status_code == 422
    result = response.json()
    assert result["readiness_state"] == "consent_restricted"
    assert result["result"] is None


def test_skin_twin_validates_owner_derived_product_scenarios_without_predicting(
    monkeypatch,
) -> None:
    monkeypatch.setenv("APP_ENV", "production")
    monkeypatch.setenv("ML_SERVICE_API_KEY", "server-secret")
    body = inference_payload()
    body.update(
        {
            "module": "skin_twin",
            "task": "scenario_validation",
            "input_record_refs": [
                "skin_twin_snapshots:11111111-1111-4111-8111-111111111114"
            ],
            "inputs": {
                "baseline": {"face_scans": 2, "sleep_logs": 8, "food_logs": 8},
                "changes": {"better_sleep": True, "lower_stress": True},
                "horizon_days": 7,
            },
        }
    )

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
    assert result["readiness_state"] == "ready"
    assert result["result"]["scenario_result"] is None
    assert result["result"]["validated_changes"] == ["better_sleep", "lower_stress"]


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


def test_service_job_timeout_is_durable_and_retryable(monkeypatch, tmp_path) -> None:
    original_predict = app_module._predict_core

    def slow_predict(payload):
        time.sleep(0.05)
        return original_predict(payload)

    monkeypatch.setattr(app_module, "_predict_core", slow_predict)
    monkeypatch.setenv("REQUEST_TIMEOUT_SECONDS", "0.001")
    isolated = create_app(
        idempotency_store=MemoryIdempotencyStore(),
        job_store=SQLiteJobStore(tmp_path / "jobs.sqlite3"),
    )
    isolated_client = TestClient(isolated, raise_server_exceptions=False)
    body = inference_payload()

    response = isolated_client.post(
        "/v1/jobs",
        json=body,
        headers={"idempotency-key": body["idempotency_key"]},
    )

    assert response.status_code == 504
    job_id = str(uuid5(NAMESPACE_URL, f"acnetrex-ml:{body['idempotency_key']}"))
    fetched = isolated_client.get(f"/v1/jobs/{job_id}")
    assert fetched.json()["status"] == "failed"
    assert fetched.json()["result"] == {
        "ok": False,
        "readiness_state": "error_retryable",
        "error": {"code": "prediction_timeout", "retryable": True},
    }
