import sys
from pathlib import Path

from fastapi.testclient import TestClient

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from main import app  # noqa: E402


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

    response = client.get("/health")

    assert response.status_code == 200
    assert response.json() == {
        "ok": True,
        "service": "acnetrex-ml",
        "vertexEndpointId": "5976620302904328192",
        "vertexLocation": "us-central1",
        "vertexConfigured": True,
    }


def test_predict_fails_closed_when_vertex_is_not_configured(monkeypatch):
    monkeypatch.delenv("VERTEX_AI_PROJECT_ID", raising=False)
    monkeypatch.delenv("VERTEX_AI_LOCATION", raising=False)
    monkeypatch.delenv("VERTEX_AI_ENDPOINT_ID", raising=False)

    response = client.post(
        "/predict",
        json={
            "engine": "faceatlas",
            "operation": "analyze_scan",
            "features": {"scanQuality": "pending"},
        },
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
