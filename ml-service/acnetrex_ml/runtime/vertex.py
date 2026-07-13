from __future__ import annotations

import os
from dataclasses import dataclass
from typing import Any

from acnetrex_ml.exceptions import VertexModelMissingError, VertexUnavailableError
from acnetrex_ml.runtime.resilience import (
    CircuitBreaker,
    CircuitOpenError,
    RetryPolicy,
    run_with_retry,
)

_VERTEX_CIRCUIT = CircuitBreaker(failure_threshold=5, recovery_seconds=30.0)


def _is_transient(error: Exception) -> bool:
    message = str(error).lower()
    transient_markers = (
        "429",
        "resource exhausted",
        "deadline",
        "timeout",
        "unavailable",
        "502",
        "503",
        "504",
    )
    terminal_markers = (
        "permission",
        "unauthenticated",
        "invalid argument",
        "not found",
        "deployed model",
    )
    return any(marker in message for marker in transient_markers) and not any(
        marker in message for marker in terminal_markers
    )


@dataclass(frozen=True)
class VertexConfig:
    project_id: str
    location: str
    endpoint_id: str
    timeout_seconds: float = 15.0

    @classmethod
    def from_env(cls) -> VertexConfig | None:
        project = os.getenv("VERTEX_AI_PROJECT_ID")
        location = os.getenv("VERTEX_AI_LOCATION")
        endpoint = os.getenv("VERTEX_AI_ENDPOINT_ID")
        if not all((project, location, endpoint)):
            return None
        assert project is not None and location is not None and endpoint is not None
        return cls(
            project,
            location,
            endpoint,
            float(
                os.getenv("VERTEX_AI_TIMEOUT_SECONDS")
                or os.getenv("VERTEX_TIMEOUT_SECONDS", "15")
            ),
        )


class VertexAdapter:
    def __init__(self, config: VertexConfig | None = None) -> None:
        self.config = config or VertexConfig.from_env()

    def status(self) -> dict[str, Any]:
        if self.config is None:
            return {"configured": False, "state": "not_configured"}
        return {
            "configured": True,
            "state": "verification_required",
            "project_id": self.config.project_id,
            "location": self.config.location,
            "endpoint_id": self.config.endpoint_id,
        }

    def predict(self, instances: list[dict[str, Any]]) -> dict[str, Any]:
        if self.config is None:
            raise VertexUnavailableError("Vertex configuration is incomplete")
        config = self.config
        try:
            from google.cloud import aiplatform  # type: ignore[import-not-found]
        except ImportError as exc:
            raise VertexUnavailableError(
                "Vertex runtime dependency is not installed"
            ) from exc
        try:
            endpoint = aiplatform.Endpoint(
                endpoint_name=(
                    f"projects/{config.project_id}/locations/{config.location}/"
                    f"endpoints/{config.endpoint_id}"
                )
            )
            response = run_with_retry(
                lambda: endpoint.predict(
                    instances=instances, timeout=config.timeout_seconds
                ),
                retryable=_is_transient,
                policy=RetryPolicy(
                    max_attempts=3, base_delay_seconds=0.25, max_delay_seconds=1.0
                ),
                circuit=_VERTEX_CIRCUIT,
            )
        except CircuitOpenError as exc:
            raise VertexUnavailableError(
                "Vertex circuit is open after repeated transient failures"
            ) from exc
        except Exception as exc:
            message = str(exc).lower()
            if "deployed model" in message or "not found" in message:
                raise VertexModelMissingError(
                    "No deployed Vertex model is available"
                ) from exc
            raise VertexUnavailableError("Vertex prediction failed") from exc
        predictions = getattr(response, "predictions", None)
        if not isinstance(predictions, list) or not predictions:
            raise VertexUnavailableError("Vertex returned no predictions")
        return {
            "predictions": predictions,
            "deployed_model_id": getattr(response, "deployed_model_id", None),
            "model_version_id": getattr(response, "model_version_id", None),
        }
