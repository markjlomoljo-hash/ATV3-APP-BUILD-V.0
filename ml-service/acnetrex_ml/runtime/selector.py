from dataclasses import dataclass

from acnetrex_ml.contracts.responses import ReadinessState, RuntimeMode


@dataclass(frozen=True)
class RuntimeDecision:
    mode: RuntimeMode
    readiness: ReadinessState
    reason: str


def select_runtime(
    *,
    consent_allowed: bool,
    deterministic_supported: bool,
    local_model_approved: bool,
    network_available: bool,
    cloud_healthy: bool,
    vertex_required: bool,
    vertex_ready: bool,
    runtime_preference: str = "auto",
) -> RuntimeDecision:
    if not consent_allowed:
        return RuntimeDecision(
            RuntimeMode.UNAVAILABLE,
            ReadinessState.CONSENT_RESTRICTED,
            "consent_disallows_processing",
        )
    if runtime_preference in {"auto", "local"} and deterministic_supported:
        return RuntimeDecision(
            RuntimeMode.LOCAL_DETERMINISTIC,
            ReadinessState.READY,
            "deterministic_engine_supported",
        )
    if runtime_preference in {"auto", "local"} and local_model_approved:
        return RuntimeDecision(
            RuntimeMode.LOCAL_MODEL,
            ReadinessState.READY,
            "approved_local_model_available",
        )
    if not network_available:
        if vertex_required or runtime_preference in {"cloud", "vertex"}:
            return RuntimeDecision(
                RuntimeMode.QUEUED_FOR_CLOUD,
                ReadinessState.UNSUPPORTED_OFFLINE,
                "cloud_task_offline",
            )
        return RuntimeDecision(
            RuntimeMode.UNAVAILABLE,
            ReadinessState.MODEL_UNAVAILABLE,
            "no_compatible_local_runtime",
        )
    if not cloud_healthy:
        return RuntimeDecision(
            RuntimeMode.UNAVAILABLE,
            ReadinessState.ERROR_RETRYABLE,
            "cloud_runtime_unhealthy",
        )
    if vertex_required:
        if not vertex_ready:
            return RuntimeDecision(
                RuntimeMode.UNAVAILABLE,
                ReadinessState.MODEL_UNAVAILABLE,
                "vertex_model_missing_or_unavailable",
            )
        return RuntimeDecision(
            RuntimeMode.CLOUD_VERTEX, ReadinessState.READY, "validated_vertex_runtime"
        )
    return RuntimeDecision(
        RuntimeMode.CLOUD_RUN, ReadinessState.READY, "cloud_artifact_runtime"
    )
