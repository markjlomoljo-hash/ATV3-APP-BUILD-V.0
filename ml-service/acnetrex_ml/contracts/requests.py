from __future__ import annotations

from typing import Any, Literal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class ConsentScope(BaseModel):
    model_config = ConfigDict(extra="forbid")
    personal_processing: bool
    raw_image_processing: bool = False
    anonymous_learning: bool = False


class RequestContext(BaseModel):
    model_config = ConfigDict(extra="forbid")
    timezone: str = Field(default="UTC", min_length=1, max_length=64)
    locale: str = Field(default="en", min_length=2, max_length=32)


class InferenceRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")
    contract_version: Literal["1.0.0"] = "1.0.0"
    request_id: UUID
    idempotency_key: UUID
    module: str = Field(min_length=2, max_length=64, pattern=r"^[a-z0-9_-]+$")
    task: str = Field(min_length=2, max_length=96, pattern=r"^[a-z0-9_-]+$")
    runtime_preference: Literal["auto", "local", "cloud", "vertex"] = "auto"
    feature_schema_version: Literal["1.0.0"] = "1.0.0"
    input_record_refs: list[str] = Field(default_factory=list, max_length=500)
    inputs: dict[str, Any]
    context: RequestContext = Field(default_factory=RequestContext)
    consent: ConsentScope


class BatchInferenceRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")
    requests: list[InferenceRequest] = Field(min_length=1, max_length=32)
