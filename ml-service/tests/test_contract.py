import sys
import types
from pathlib import Path

from fastapi.testclient import TestClient

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from main import app, prediction_timeout_seconds  # noqa: E402


client = TestClient(app)


def test_root_returns_service_metadata():
    response = client.get("/")

    assert response.status_code == 200
    assert response.json() == {
        "ok": True,
        "service": "acnetrex-ml",
        "health": "/health",
        "predict": "/predict",
    }


def test_health_reports_vertex_configuration(monkeypatch):
    monkeypatch.setenv("VERTEX_AI_PROJECT_ID", "project-09bedce3-3c99-4a2b-aad")
    monkeypatch.setenv("VERTEX_AI_LOCATION", "us-central1")
    monkeypatch.setenv("VERTEX_AI_ENDPOINT_ID", "5976620302904328192")
    monkeypatch.setenv("ACNETREX_ML_SHARED_SECRET", "test-shared-secret")

    response = client.get("/health")

    assert response.status_code == 200
    assert response.json() == {
        "ok": True,
        "service": "acnetrex-ml",
        "vertexEndpointId": "5976620302904328192",
        "vertexLocation": "us-central1",
        "vertexConfigured": True,
        "serviceAuthConfigured": True,
    }


def test_prediction_timeout_is_bounded_and_invalid_values_use_default(monkeypatch):
    monkeypatch.setenv("VERTEX_AI_TIMEOUT_SECONDS", "999")
    assert prediction_timeout_seconds() == 60.0

    monkeypatch.setenv("VERTEX_AI_TIMEOUT_SECONDS", "not-a-number")
    assert prediction_timeout_seconds() == 20.0

    monkeypatch.setenv("VERTEX_AI_TIMEOUT_SECONDS", "0.5")
    assert prediction_timeout_seconds() == 1.0


def test_predict_passes_bounded_timeout_to_vertex_client(monkeypatch):
    captured: dict[str, float] = {}

    class FakeClient:
        def __init__(self, **_kwargs):
            pass

        def endpoint_path(self, **kwargs):
            return "/".join(str(value) for value in kwargs.values())

        def predict(self, **kwargs):
            captured["timeout"] = kwargs["timeout"]
            return types.SimpleNamespace(_pb=object())

    fake_aiplatform = types.ModuleType("google.cloud.aiplatform_v1")
    fake_aiplatform.PredictionServiceClient = FakeClient
    fake_google_cloud = types.ModuleType("google.cloud")
    fake_google_cloud.aiplatform_v1 = fake_aiplatform
    fake_google = types.ModuleType("google")
    fake_google.__path__ = []
    fake_google.cloud = fake_google_cloud
    fake_google_protobuf = types.ModuleType("google.protobuf")
    fake_json_format = types.ModuleType("google.protobuf.json_format")
    fake_json_format.MessageToDict = lambda _value, preserving_proto_field_name: {"predictions": [{"ok": True}]}

    monkeypatch.setitem(sys.modules, "google", fake_google)
    monkeypatch.setitem(sys.modules, "google.cloud", fake_google_cloud)
    monkeypatch.setitem(sys.modules, "google.cloud.aiplatform_v1", fake_aiplatform)
    monkeypatch.setitem(sys.modules, "google.protobuf", fake_google_protobuf)
    monkeypatch.setitem(sys.modules, "google.protobuf.json_format", fake_json_format)
    monkeypatch.setenv("VERTEX_AI_PROJECT_ID", "project")
    monkeypatch.setenv("VERTEX_AI_LOCATION", "us-central1")
    monkeypatch.setenv("VERTEX_AI_ENDPOINT_ID", "endpoint")
    monkeypatch.setenv("VERTEX_AI_ENDPOINT_DISPLAY_NAME", "test-endpoint")
    monkeypatch.setenv("ACNETREX_ML_SHARED_SECRET", "test-shared-secret")
    monkeypatch.setenv("VERTEX_AI_TIMEOUT_SECONDS", "7")

    response = client.post(
        "/predict",
        json={"engine": "sleepderm", "operation": "status"},
        headers={"authorization": "Bearer test-shared-secret"},
    )

    assert response.status_code == 200
    assert captured["timeout"] == 7.0


def test_predict_fails_closed_when_vertex_is_not_configured(monkeypatch):
    monkeypatch.delenv("VERTEX_AI_PROJECT_ID", raising=False)
    monkeypatch.delenv("VERTEX_AI_LOCATION", raising=False)
    monkeypatch.delenv("VERTEX_AI_ENDPOINT_ID", raising=False)
    monkeypatch.setenv("ACNETREX_ML_SHARED_SECRET", "test-shared-secret")

    response = client.post(
        "/predict",
        json={
            "engine": "faceatlas",
            "operation": "analyze_scan",
            "features": {"scanQuality": "pending"},
        },
        headers={"authorization": "Bearer test-shared-secret"},
    )

    assert response.status_code == 503
    assert response.json()["ok"] is False
    assert response.json()["error"] == "vertex_endpoint_not_configured"


def test_predict_rejects_unknown_engine():
    response = client.post(
        "/predict",
        json={
            "engine": "unsupported",
            "operation": "analyze_scan",
        },
    )

    assert response.status_code == 422


def test_predict_rejects_missing_service_auth(monkeypatch):
    monkeypatch.setenv("ACNETREX_ML_SHARED_SECRET", "test-shared-secret")

    response = client.post(
        "/predict",
        json={"engine": "faceatlas", "operation": "analyze_scan"},
    )

    assert response.status_code == 401
    assert response.json() == {"ok": False, "error": "unauthorized"}


def test_predict_fails_closed_when_service_auth_is_not_configured(monkeypatch):
    monkeypatch.delenv("ACNETREX_ML_SHARED_SECRET", raising=False)

    response = client.post(
        "/predict",
        json={"engine": "faceatlas", "operation": "analyze_scan"},
    )

    assert response.status_code == 503
    assert response.json() == {"ok": False, "error": "service_auth_not_configured"}
