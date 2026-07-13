import hashlib
import json
import re
from pathlib import Path

from fastapi.testclient import TestClient

from acnetrex_ml.runtime.vertex import VertexConfig
from acnetrex_ml.service.app import create_app
from acnetrex_ml.service.idempotency import MemoryIdempotencyStore
from acnetrex_ml.service.jobs import SQLiteJobStore
from main import app


client = TestClient(app)


def test_vertex_config_uses_deployment_timeout_name(monkeypatch) -> None:
    monkeypatch.setenv("VERTEX_AI_PROJECT_ID", "project")
    monkeypatch.setenv("VERTEX_AI_LOCATION", "us-central1")
    monkeypatch.setenv("VERTEX_AI_ENDPOINT_ID", "endpoint")
    monkeypatch.setenv("VERTEX_AI_TIMEOUT_SECONDS", "20")

    config = VertexConfig.from_env()

    assert config is not None
    assert config.timeout_seconds == 20.0


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


def test_readiness_fails_closed_on_artifact_checksum_mismatch(
    monkeypatch, tmp_path
) -> None:
    registry = tmp_path / "model-registry.json"
    registry.write_text('{"models": []}', encoding="utf-8")
    checksums = tmp_path / "artifact-checksums.json"
    checksums.write_text(
        json.dumps(
            {
                "algorithm": "sha256",
                "artifacts": {
                    "model-registry.json": hashlib.sha256(b"different").hexdigest()
                },
            }
        ),
        encoding="utf-8",
    )
    monkeypatch.setenv("MODEL_REGISTRY_PATH", str(registry))
    monkeypatch.setenv("ARTIFACT_CHECKSUM_MANIFEST", str(checksums))

    response = client.get("/health/ready")

    assert response.status_code == 503
    assert response.json()["artifactIntegrity"] == {
        "state": "error",
        "missing": [],
        "mismatched": ["model-registry.json"],
    }


def test_readiness_fails_closed_when_persistence_probe_fails(tmp_path) -> None:
    class UnavailableIdempotencyStore(MemoryIdempotencyStore):
        def healthcheck(self) -> bool:
            return False

    isolated = create_app(
        idempotency_store=UnavailableIdempotencyStore(),
        job_store=SQLiteJobStore(tmp_path / "jobs.sqlite3"),
    )

    response = TestClient(isolated).get("/health/ready")

    assert response.status_code == 503
    assert response.json()["persistence"] == {"state": "error"}


def test_container_copies_every_checksummed_artifact_directory() -> None:
    service_root = Path(__file__).resolve().parents[1]
    manifest = json.loads(
        (service_root / "manifests/artifact-checksums.json").read_text(encoding="utf-8")
    )
    dockerfile = (service_root / "Dockerfile").read_text(encoding="utf-8")
    top_level_directories = {
        artifact.split("/", 1)[0]
        for artifact in manifest["artifacts"]
        if "/" in artifact
    }

    for directory in top_level_directories:
        assert re.search(
            rf"^COPY(?:\s+--[^\s]+)*\s+{re.escape(directory)}\s+\./{re.escape(directory)}$",
            dockerfile,
            re.MULTILINE,
        )
