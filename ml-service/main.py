from __future__ import annotations

import os
from typing import Any, Literal

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field


SERVICE_NAME = "acnetrex-ml"


class InputRecordRef(BaseModel):
    table: str = Field(min_length=1, max_length=80)
    id: str = Field(min_length=1, max_length=160)


class PredictionRequest(BaseModel):
    engine: Literal[
        "faceatlas",
        "sleepderm",
        "dermdiet",
        "triggergraph",
        "forecast",
        "skin_twin",
        "cutisai",
    ]
    operation: str = Field(min_length=1, max_length=120)
    inputRecordRefs: list[InputRecordRef] = Field(default_factory=list, max_length=100)
    features: dict[str, Any] = Field(default_factory=dict)
    metadata: dict[str, Any] = Field(default_factory=dict)
    instances: list[dict[str, Any]] | None = None
    parameters: dict[str, Any] | None = None


class VertexConfig(BaseModel):
    project_id: str | None
    location: str | None
    endpoint_id: str | None

    @property
    def configured(self) -> bool:
        return bool(self.project_id and self.location and self.endpoint_id)


def split_env_list(value: str | None, default: list[str]) -> list[str]:
    if value is None:
        return default
    return [item.strip() for item in value.split(",") if item.strip()]


def vertex_config() -> VertexConfig:
    return VertexConfig(
        project_id=os.getenv("VERTEX_AI_PROJECT_ID"),
        location=os.getenv("VERTEX_AI_LOCATION"),
        endpoint_id=os.getenv("VERTEX_AI_ENDPOINT_ID"),
    )


def default_instance(request: PredictionRequest) -> dict[str, Any]:
    return {
        "engine": request.engine,
        "operation": request.operation,
        "inputRecordRefs": [ref.model_dump() for ref in request.inputRecordRefs],
        "features": request.features,
        "metadata": request.metadata,
    }


def vertex_unavailable(error: str, details: dict[str, Any] | None = None) -> JSONResponse:
    return JSONResponse(
        status_code=503,
        content={
            "ok": False,
            "error": error,
            "message": "Vertex AI endpoint is not configured or unavailable.",
            **({"details": details} if details else {}),
        },
    )


app = FastAPI(title="AcneTrex ML API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=split_env_list(os.getenv("CORS_ORIGINS"), ["https://atv-3-app-build-v-0.vercel.app"]),
    allow_origin_regex=os.getenv("CORS_ORIGIN_REGEX", r"https://.*\.vercel\.app"),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
def root() -> dict[str, Any]:
    return {
        "ok": True,
        "service": SERVICE_NAME,
        "health": "/health",
        "predict": "/predict",
    }


@app.get("/health")
def health() -> dict[str, Any]:
    config = vertex_config()
    return {
        "ok": True,
        "service": SERVICE_NAME,
        "vertexEndpointId": config.endpoint_id,
        "vertexLocation": config.location,
        "vertexConfigured": config.configured,
    }


@app.post("/predict", response_model=None)
def predict(request: PredictionRequest) -> dict[str, Any] | JSONResponse:
    config = vertex_config()
    if not config.configured:
        return vertex_unavailable("vertex_endpoint_not_configured")

    try:
        from google.cloud import aiplatform_v1
        from google.protobuf.json_format import MessageToDict
    except ImportError:
        return vertex_unavailable("vertex_client_not_available")

    try:
        client = aiplatform_v1.PredictionServiceClient(
            client_options={"api_endpoint": f"{config.location}-aiplatform.googleapis.com"},
        )
        endpoint = client.endpoint_path(
            project=config.project_id,
            location=config.location,
            endpoint=config.endpoint_id,
        )
        response = client.predict(
            endpoint=endpoint,
            instances=request.instances or [default_instance(request)],
            parameters=request.parameters or {},
        )
        response_dict = MessageToDict(response._pb, preserving_proto_field_name=True)
    except Exception as exc:
        return vertex_unavailable("vertex_endpoint_unavailable", {"type": exc.__class__.__name__})

    return {
        "ok": True,
        "runtime_mode": "cloud_vertex",
        "service": SERVICE_NAME,
        "engine": request.engine,
        "operation": request.operation,
        "model_name": os.getenv("VERTEX_AI_ENDPOINT_DISPLAY_NAME", "acnetrex-endpoint"),
        "model_version": response_dict.get("model_version_id") or response_dict.get("deployed_model_id"),
        "predictions": response_dict.get("predictions", []),
        "metadata": {
            "vertexEndpointId": config.endpoint_id,
            "deployedModelId": response_dict.get("deployed_model_id"),
        },
    }
