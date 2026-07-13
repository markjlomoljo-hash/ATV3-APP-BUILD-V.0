from fastapi.testclient import TestClient

from main import app


client = TestClient(app)


def test_root_returns_canonical_service_metadata() -> None:
    response = client.get("/")

    assert response.status_code == 200
    assert response.json() == {
        "ok": True,
        "service": "acnetrex-ml",
        "contractVersion": "1.0.0",
        "health": "/health/ready",
        "predict": "/v1/predict",
    }


def test_liveness_is_process_only() -> None:
    response = client.get("/health/live")

    assert response.status_code == 200
    assert response.json() == {"ok": True, "service": "acnetrex-ml", "state": "live"}


def test_protected_diagnostics_require_auth_in_production(monkeypatch) -> None:
    monkeypatch.setenv("APP_ENV", "production")
    monkeypatch.setenv("ML_SERVICE_API_KEY", "server-secret")

    response = client.get("/v1/models")

    assert response.status_code == 401
