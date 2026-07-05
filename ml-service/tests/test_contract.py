from fastapi.testclient import TestClient

from app.main import app


client = TestClient(app)


def test_root_contract():
    response = client.get("/")

    assert response.status_code == 200
    assert response.json()["service"] == "acnetrex-ml"
    assert response.json()["health"] == "/health"
    assert response.json()["predict"] == "/predict"


def test_health_reports_vertex_configuration(monkeypatch):
    monkeypatch.setenv("VERTEX_AI_PROJECT_ID", "project-09bedce3-3c99-4a2b-aad")
    monkeypatch.setenv("VERTEX_AI_LOCATION", "us-central1")
    monkeypatch.setenv("VERTEX_AI_ENDPOINT_ID", "5976620302904328192")

    response = client.get("/health")

    assert response.status_code == 200
    assert response.json()["ok"] is True
    assert response.json()["vertexConfigured"] is True


def test_predict_returns_503_when_vertex_is_not_configured(monkeypatch):
    monkeypatch.delenv("VERTEX_AI_PROJECT_ID", raising=False)
    monkeypatch.delenv("VERTEX_AI_LOCATION", raising=False)
    monkeypatch.delenv("VERTEX_AI_ENDPOINT_ID", raising=False)

    response = client.post(
        "/predict",
        json={
            "engine": "forecast",
            "operation": "predict",
            "features": {},
            "metadata": {},
            "inputRecordRefs": [],
        },
    )

    assert response.status_code == 503
    assert response.json()["error"] == "vertex_endpoint_not_configured"
