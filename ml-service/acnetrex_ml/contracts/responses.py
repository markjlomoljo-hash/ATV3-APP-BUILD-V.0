from __future__ import annotations

from datetime import UTC, datetime
from enum import StrEnum
from typing import Annotated, Any, Literal

from pydantic import BaseModel, ConfigDict, Field


UUID_PATTERN = (
    r"^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-"
    r"[89ab][0-9a-f]{3}-[0-9a-f]{12}$"
)
ReferenceString = Annotated[str, Field(max_length=241)]
FeatureString = Annotated[str, Field(max_length=160)]
ExplanationString = Annotated[str, Field(max_length=500)]


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
    request_id: str = Field(pattern=UUID_PATTERN, json_schema_extra={"format": "uuid"})
    job_id: str | None = Field(
        default=None,
        pattern=UUID_PATTERN,
        json_schema_extra={"format": "uuid"},
    )
    module: str = Field(min_length=2, max_length=64)
    task: str = Field(min_length=2, max_length=96)
    result_type: str = Field(min_length=1, max_length=96)
    result: dict[str, Any] | None
    runtime_mode: RuntimeMode
    runtime_provider: str = Field(min_length=1, max_length=96)
    readiness_state: ReadinessState
    model_name: str | None = Field(default=None, max_length=160)
    model_version: str | None = Field(default=None, max_length=160)
    training_data_version: str | None = Field(default=None, max_length=160)
    feature_schema_version: Literal["1.0.0"] = "1.0.0"
    input_record_refs: list[ReferenceString] = Field(default_factory=list, max_length=500)
    features_used: list[FeatureString] = Field(default_factory=list, max_length=500)
    features_missing: list[FeatureString] = Field(default_factory=list, max_length=500)
    sample_count: int = Field(default=0, ge=0)
    coverage: float = Field(default=0.0, ge=0.0, le=1.0)
    confidence: float | None = Field(default=None, ge=0.0, le=1.0)
    confidence_label: Literal["not_applicable", "low", "moderate", "high"] = (
        "not_applicable"
    )
    calibration_state: Literal[
        "not_applicable", "unavailable", "uncalibrated", "calibrated"
    ] = "not_applicable"
    uncertainty: list[ExplanationString] = Field(default_factory=list, max_length=100)
    limitations: list[ExplanationString] = Field(default_factory=list, max_length=100)
    confounders: list[ExplanationString] = Field(default_factory=list, max_length=100)
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
