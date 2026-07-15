from types import SimpleNamespace
from uuid import uuid4

from fastapi.testclient import TestClient

from acnetrex_ml.service.app import create_app


def inference_payload() -> dict:
    job_id = str(uuid4())
    return {
        "contract_version": "1.0.0",
        "request_id": job_id,
        "idempotency_key": job_id,
        "module": "sleepderm",
        "task": "sleep_pattern_analysis",
        "runtime_preference": "cloud",
        "feature_schema_version": "1.0.0",
        "input_record_refs": [],
        "inputs": {"records": [{"date": "forged", "bedtime": "00:00", "wake_time": "00:01"}]},
        "context": {"timezone": "Asia/Manila", "locale": "en-PH"},
        "consent": {
            "personal_processing": True,
            "raw_image_processing": False,
            "anonymous_learning": False,
        },
    }


class FakeRailwayPersistence:
    def __init__(self) -> None:
        self.prepared_payload = None
        self.finalized = []
        self.prepare_state = "reserved"
        self.replay_response = None

    def healthcheck(self) -> bool:
        return True

    def prepare(self, payload, request_hash: str):
        self.prepared_payload = payload
        if self.prepare_state == "replay":
            return SimpleNamespace(
                state="replay",
                response_status=200,
                response=self.replay_response,
                request=None,
                lease_token=None,
            )
        owner_derived = payload.model_copy(
            update={
                "inputs": {
                    "records": [
                        {
                            "date": f"2026-07-{day:02d}",
                            "bedtime": "23:00",
                            "wake_time": "07:00",
                        }
                        for day in range(1, 8)
                    ]
                },
                "input_record_refs": [
                    "sleep_logs:11111111-1111-4111-8111-111111111115"
                ],
            }
        )
        return SimpleNamespace(
            state="reserved",
            response_status=None,
            response=None,
            request=owner_derived,
            lease_token="railway-lease",
        )

    def finalize(self, reservation, result, request_hash: str) -> dict:
        body = result.model_copy(
            update={"job_id": str(reservation.request.request_id)}
        ).model_dump(mode="json")
        self.finalized.append((reservation, body, request_hash))
        return body

    def fail(self, reservation, *, retryable: bool, code: str) -> None:
        raise AssertionError(f"unexpected persistence failure: {retryable=} {code=}")


def authenticated_headers(body: dict) -> dict[str, str]:
    return {
        "authorization": "Bearer server-secret",
        "idempotency-key": body["idempotency_key"],
        "x-request-id": body["request_id"],
    }


def test_railway_mode_uses_owner_derived_inputs_and_finalizes_before_200(monkeypatch) -> None:
    monkeypatch.setenv("APP_ENV", "production")
    monkeypatch.setenv("ACNETREX_ML_SHARED_SECRET", "server-secret")
    monkeypatch.setenv("ACNETREX_ML_PERSISTENCE_OWNER", "railway")
    persistence = FakeRailwayPersistence()
    client = TestClient(create_app(analysis_repository=persistence))
    body = inference_payload()

    response = client.post(
        "/api/v1/inference", json=body, headers=authenticated_headers(body)
    )

    assert response.status_code == 200
    assert persistence.prepared_payload.inputs["records"][0]["date"] == "forged"
    assert len(persistence.finalized) == 1
    result = response.json()
    assert result["job_id"] == body["request_id"]
    assert result["readiness_state"] == "ready"
    assert result["input_record_refs"] == [
        "sleep_logs:11111111-1111-4111-8111-111111111115"
    ]


def test_railway_mode_replays_committed_response_without_executing_again(monkeypatch) -> None:
    monkeypatch.setenv("APP_ENV", "production")
    monkeypatch.setenv("ACNETREX_ML_SHARED_SECRET", "server-secret")
    monkeypatch.setenv("ACNETREX_ML_PERSISTENCE_OWNER", "railway")
    persistence = FakeRailwayPersistence()
    body = inference_payload()
    persistence.prepare_state = "replay"
    persistence.replay_response = {"ok": True, "request_id": body["request_id"], "job_id": body["request_id"]}
    client = TestClient(create_app(analysis_repository=persistence))

    response = client.post(
        "/predict", json=body, headers=authenticated_headers(body)
    )

    assert response.status_code == 200
    assert response.headers["idempotency-replayed"] == "true"
    assert response.json() == persistence.replay_response
    assert persistence.finalized == []


def test_railway_mode_rejects_missing_or_mismatched_correlation_headers(monkeypatch) -> None:
    monkeypatch.setenv("APP_ENV", "production")
    monkeypatch.setenv("ACNETREX_ML_SHARED_SECRET", "server-secret")
    monkeypatch.setenv("ACNETREX_ML_PERSISTENCE_OWNER", "railway")
    persistence = FakeRailwayPersistence()
    client = TestClient(create_app(analysis_repository=persistence))
    body = inference_payload()

    missing = client.post(
        "/api/v1/inference",
        json=body,
        headers={
            "authorization": "Bearer server-secret",
            "idempotency-key": body["idempotency_key"],
        },
    )
    mismatched = client.post(
        "/api/v1/inference",
        json=body,
        headers={
            **authenticated_headers(body),
            "x-request-id": str(uuid4()),
        },
    )

    assert missing.status_code == 400
    assert missing.json()["detail"]["code"] == "request_id_required"
    assert mismatched.status_code == 409
    assert mismatched.json()["detail"]["code"] == "request_id_mismatch"
    assert persistence.prepared_payload is None
