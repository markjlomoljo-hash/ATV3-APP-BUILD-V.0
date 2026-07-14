from __future__ import annotations

from datetime import UTC, datetime
from enum import StrEnum
from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, Field


class RuntimeMode(StrEnum):
    CLOUD_RUN = "cloud_run"
    CLOUD_VERTEX = "cloud_vertex"
    LOCAL_MODEL = "local_model"
    LOCAL_DETERMINISTIC = "local_deterministic"
    QUEUED_FOR_CLOUD = "queued_for_cloud"
    UNAVAILABLE = "unavailable"


class ReadinessState(StrEnum):
    READY = "ready"
    PARTIAL = "partial"
    INSUFFICIENT_DATA = "insufficient_data"
    NOT_CONFIGURED = "not_configured"
    UNSUPPORTED_OFFLINE = "unsupported_offline"
    CONSENT_RESTRICTED = "consent_restricted"
    MODEL_UNAVAILABLE = "model_unavailable"
    EVIDENCE_UNAVAILABLE = "evidence_unavailable"
    ERROR_RETRYABLE = "error_retryable"
    ERROR_TERMINAL = "error_terminal"


class InferenceResponse(BaseModel):
    model_config = ConfigDict(extra="forbid")
    ok: bool
    request_id: str
    job_id: str | None = None
    module: str
    task: str
    result_type: str
    result: dict[str, Any] | None
    runtime_mode: RuntimeMode
    runtime_provider: str
    readiness_state: ReadinessState
    model_name: str | None = None
    model_version: str | None = None
    training_data_version: str | None = None
    feature_schema_version: str = "1.0.0"
    input_record_refs: list[str] = Field(default_factory=list)
    features_used: list[str] = Field(default_factory=list)
    features_missing: list[str] = Field(default_factory=list)
    sample_count: int = Field(default=0, ge=0)
    coverage: float = Field(default=0.0, ge=0.0, le=1.0)
    confidence: float | None = Field(default=None, ge=0.0, le=1.0)
    confidence_label: Literal["not_applicable", "low", "moderate", "high"] = (
        "not_applicable"
    )
    calibration_state: Literal[
        "not_applicable", "unavailable", "uncalibrated", "calibrated"
    ] = "not_applicable"
    uncertainty: list[str] = Field(default_factory=list)
    limitations: list[str] = Field(default_factory=list)
    confounders: list[str] = Field(default_factory=list)
    evidence_state: Literal["not_applicable", "available", "unavailable"] = (
        "not_applicable"
    )
    safety_state: ReadinessState
    sync_status: Literal["local_only", "pending_sync", "synced", "not_applicable"] = (
        "local_only"
    )
    latency_ms: float = Field(default=0.0, ge=0.0)
    created_at: datetime = Field(default_factory=lambda: datetime.now(UTC))


class SafeError(BaseModel):
    code: str
    message: str
    retryable: bool = False


class ErrorResponse(BaseModel):
    ok: bool = False
    request_id: str
    error: SafeError
