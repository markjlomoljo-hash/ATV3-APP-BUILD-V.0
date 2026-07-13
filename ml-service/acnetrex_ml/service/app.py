from __future__ import annotations

import asyncio
import json
import os
import secrets
import time
import uuid
from collections.abc import AsyncIterator
from contextlib import asynccontextmanager
from pathlib import Path
from typing import Any

from fastapi import Depends, FastAPI, Header, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from acnetrex_ml import CONTRACT_VERSION
from acnetrex_ml.contracts.requests import BatchInferenceRequest, InferenceRequest
from acnetrex_ml.contracts.responses import (
    InferenceResponse,
    ReadinessState,
    RuntimeMode,
)
from acnetrex_ml.engines import dispatch_deterministic
from acnetrex_ml.observability.metrics import METRICS
from acnetrex_ml.registry.local_registry import LocalModelRegistry
from acnetrex_ml.runtime.vertex import VertexAdapter
from acnetrex_ml.safety.consent import validate_consent
from acnetrex_ml.safety.output_validation import validate_safe_output

from .dependencies import build_idempotency_store, build_job_store
from .idempotency import IdempotencyStore, canonical_hash
from .jobs import JobStore
from .middleware import RequestContextMiddleware


SERVICE_ROOT = Path(__file__).resolve().parents[2]


def _safe_state(state: str) -> ReadinessState:
    try:
        return ReadinessState(state)
    except ValueError:
        return ReadinessState.PARTIAL


def _authenticate(authorization: str | None = Header(default=None)) -> None:
    expected = os.getenv("ACNETREX_ML_SHARED_SECRET") or os.getenv("ML_SERVICE_API_KEY")
    environment = os.getenv("APP_ENV", "development")
    if expected is None and environment != "production":
        return
    if expected is None:
        raise HTTPException(
            status_code=503, detail={"code": "service_auth_not_configured"}
        )
    supplied = authorization or ""
    if not secrets.compare_digest(supplied, f"Bearer {expected}"):
        raise HTTPException(status_code=401, detail={"code": "unauthorized"})


def _predict_core(payload: InferenceRequest) -> InferenceResponse:
    start = time.perf_counter()
    consent_ok, consent_reason = validate_consent(
        payload.consent,
        requires_raw_images=payload.module == "faceatlas"
        and payload.task != "capture_quality",
    )
    if not consent_ok:
        return InferenceResponse(
            ok=False,
            request_id=str(payload.request_id),
            module=payload.module,
            task=payload.task,
            result_type="readiness",
            result={"state": "consent_restricted", "reason": consent_reason},
            runtime_mode=RuntimeMode.UNAVAILABLE,
            runtime_provider="none",
            readiness_state=ReadinessState.CONSENT_RESTRICTED,
            input_record_refs=payload.input_record_refs,
            safety_state=ReadinessState.CONSENT_RESTRICTED,
            limitations=[
                "Processing was not performed because consent does not permit it."
            ],
            latency_ms=(time.perf_counter() - start) * 1000,
        )
    result = dispatch_deterministic(payload.module, payload.task, payload.inputs)
    if result is None:
        heavy = payload.module == "faceatlas" or payload.runtime_preference in {
            "cloud",
            "vertex",
        }
        state = (
            ReadinessState.UNSUPPORTED_OFFLINE
            if heavy
            else ReadinessState.MODEL_UNAVAILABLE
        )
        mode = RuntimeMode.QUEUED_FOR_CLOUD if heavy else RuntimeMode.UNAVAILABLE
        return InferenceResponse(
            ok=False,
            request_id=str(payload.request_id),
            module=payload.module,
            task=payload.task,
            result_type="unavailable",
            result=None,
            runtime_mode=mode,
            runtime_provider="none",
            readiness_state=state,
            input_record_refs=payload.input_record_refs,
            safety_state=state,
            sync_status="pending_sync" if heavy else "not_applicable",
            limitations=[
                "No approved model or deterministic engine is available for this task."
            ],
            latency_ms=(time.perf_counter() - start) * 1000,
        )
    validate_safe_output(result)
    state = _safe_state(str(result.get("state", "partial")))
    ok = state in {ReadinessState.READY, ReadinessState.PARTIAL}
    sample_count = int(result.get("sample_count", 1 if result else 0))
    coverage = float(result.get("coverage", 1.0 if ok else 0.0))
    limitations = [str(item) for item in result.get("limitations", [])]
    return InferenceResponse(
        ok=ok,
        request_id=str(payload.request_id),
        module=payload.module,
        task=payload.task,
        result_type="deterministic_analysis",
        result=result,
        runtime_mode=RuntimeMode.LOCAL_DETERMINISTIC,
        runtime_provider="acnetrex_ml",
        readiness_state=state,
        model_name=None,
        model_version=None,
        training_data_version=None,
        input_record_refs=payload.input_record_refs,
        features_used=sorted(str(key) for key in payload.inputs),
        features_missing=[str(item) for item in result.get("features_missing", [])],
        sample_count=sample_count,
        coverage=max(0.0, min(1.0, coverage)),
        confidence=None,
        confidence_label="not_applicable",
        calibration_state="not_applicable",
        uncertainty=["No calibrated predictive probability is produced."],
        limitations=limitations,
        confounders=[str(item) for item in result.get("confounders", [])],
        evidence_state=(
            "available"
            if result.get("evidence_state") == "observed_association"
            else "not_applicable"
        ),
        safety_state=state,
        latency_ms=(time.perf_counter() - start) * 1000,
    )


def create_app(
    *,
    idempotency_store: IdempotencyStore | None = None,
    job_store: JobStore | None = None,
) -> FastAPI:
    store = idempotency_store or build_idempotency_store()
    jobs = job_store or build_job_store()
    batch_limit = asyncio.Semaphore(int(os.getenv("MAX_BATCH_CONCURRENCY", "4")))
    maximum_batch_size = int(os.getenv("MAX_BATCH_SIZE", "32"))

    @asynccontextmanager
    async def lifespan(_: FastAPI) -> AsyncIterator[None]:
        yield

    application = FastAPI(title="AcneTrex ML", version="1.0.0", lifespan=lifespan)
    application.add_middleware(RequestContextMiddleware)
    origins = [
        item.strip()
        for item in os.getenv("CORS_ORIGINS", "").split(",")
        if item.strip()
    ]
    if origins:
        application.add_middleware(
            CORSMiddleware,
            allow_origins=origins,
            allow_methods=["GET", "POST", "OPTIONS"],
            allow_headers=[
                "Authorization",
                "Content-Type",
                "Idempotency-Key",
                "X-Request-ID",
                "traceparent",
            ],
            expose_headers=["Idempotency-Replayed", "X-Request-ID", "traceparent"],
        )

    @application.get("/")
    async def root() -> dict[str, Any]:
        return {
            "ok": True,
            "service": "acnetrex-ml",
            "contractVersion": CONTRACT_VERSION,
            "health": "/health/ready",
            "predict": "/v1/predict",
        }

    @application.get("/health/live")
    async def health_live() -> dict[str, Any]:
        return {"ok": True, "service": "acnetrex-ml", "state": "live"}

    @application.get("/health/ready")
    async def health_ready() -> JSONResponse:
        vertex = VertexAdapter().status()
        registry_path = os.getenv(
            "MODEL_REGISTRY_PATH", str(SERVICE_ROOT / "manifests/model-registry.json")
        )
        checksum_path = os.getenv(
            "ARTIFACT_CHECKSUM_MANIFEST",
            str(SERVICE_ROOT / "manifests/artifact-checksums.json"),
        )
        artifact_integrity = LocalModelRegistry.verify_checksum_manifest(checksum_path)
        try:
            registry = LocalModelRegistry(registry_path).summary()
            registry_state = "ready"
        except (OSError, TypeError, ValueError, json.JSONDecodeError):
            registry = {"count": 0, "active": [], "approved": []}
            registry_state = "error"
        persistence_ready = await asyncio.to_thread(
            lambda: store.healthcheck() and jobs.healthcheck()
        )
        ready = (
            artifact_integrity["state"] == "ready"
            and registry_state == "ready"
            and persistence_ready
        )
        return JSONResponse(
            status_code=200 if ready else 503,
            content={
                "ok": ready,
                "service": "acnetrex-ml",
                "contractVersion": CONTRACT_VERSION,
                "deterministicEngines": "ready",
                "modelRegistry": registry,
                "modelRegistryState": registry_state,
                "artifactIntegrity": artifact_integrity,
                "persistence": {"state": "ready" if persistence_ready else "error"},
                "vertex": {
                    "configured": bool(vertex.get("configured")),
                    "state": str(vertex.get("state", "not_configured")),
                },
                "predictiveModels": "unavailable"
                if not registry["active"]
                else "ready",
                "limitations": [
                    "Predictive tasks remain unavailable unless an approved active model is loaded."
                ],
            },
        )

    @application.get("/v1/models", dependencies=[Depends(_authenticate)])
    async def list_models() -> dict[str, Any]:
        registry_path = os.getenv(
            "MODEL_REGISTRY_PATH", str(SERVICE_ROOT / "manifests/model-registry.json")
        )
        entries = LocalModelRegistry(registry_path).load()
        return {
            "ok": True,
            "models": [entry.model_dump(mode="json") for entry in entries],
        }

    @application.get("/v1/metrics", dependencies=[Depends(_authenticate)])
    async def metrics() -> dict[str, Any]:
        return {"ok": True, "metrics": METRICS.snapshot()}

    async def execute_prediction(
        payload: InferenceRequest,
        request: Request,
        idempotency_key: str | None,
    ) -> JSONResponse:
        if not idempotency_key:
            raise HTTPException(
                status_code=400, detail={"code": "idempotency_key_required"}
            )
        if idempotency_key != str(payload.idempotency_key):
            raise HTTPException(
                status_code=409, detail={"code": "idempotency_key_mismatch"}
            )
        scope = f"predict:{payload.module}:{payload.task}"
        request_hash = canonical_hash(
            payload.model_dump(mode="json", exclude={"request_id"})
        )
        reservation = store.reserve(idempotency_key, request_hash, scope)
        if reservation.state == "conflict":
            raise HTTPException(
                status_code=409,
                detail={"code": "idempotency_key_reused_with_different_payload"},
            )
        if reservation.state == "processing":
            return JSONResponse(
                status_code=409,
                headers={"Retry-After": "2"},
                content={"ok": False, "error": {"code": "operation_in_progress"}},
            )
        if reservation.state == "replay":
            return JSONResponse(
                status_code=reservation.response_status or 200,
                headers={"Idempotency-Replayed": "true"},
                content=reservation.response or {},
            )
        try:
            result = await asyncio.wait_for(
                asyncio.to_thread(_predict_core, payload),
                timeout=float(os.getenv("REQUEST_TIMEOUT_SECONDS", "20")),
            )
            body = result.model_dump(mode="json")
            status = (
                200
                if result.ok
                else (
                    202 if result.runtime_mode == RuntimeMode.QUEUED_FOR_CLOUD else 422
                )
            )
            store.complete(idempotency_key, scope, status, body)
            return JSONResponse(status_code=status, content=body)
        except TimeoutError as exc:
            error = {"detail": {"code": "prediction_timeout"}}
            store.fail(
                idempotency_key,
                scope,
                terminal=False,
                status=504,
                response=error,
            )
            raise HTTPException(
                status_code=504, detail={"code": "prediction_timeout"}
            ) from exc
        except (TypeError, ValueError) as exc:
            error = {"detail": {"code": "invalid_input", "message": str(exc)}}
            store.fail(
                idempotency_key,
                scope,
                terminal=True,
                status=422,
                response=error,
            )
            raise HTTPException(
                status_code=422, detail={"code": "invalid_input", "message": str(exc)}
            ) from exc

    @application.post("/v1/predict", dependencies=[Depends(_authenticate)])
    async def predict_v1(
        payload: InferenceRequest,
        request: Request,
        idempotency_key: str | None = Header(default=None, alias="Idempotency-Key"),
    ) -> JSONResponse:
        return await execute_prediction(payload, request, idempotency_key)

    @application.post("/predict", dependencies=[Depends(_authenticate)])
    async def predict_alias(
        payload: InferenceRequest,
        request: Request,
        idempotency_key: str | None = Header(default=None, alias="Idempotency-Key"),
    ) -> JSONResponse:
        return await execute_prediction(payload, request, idempotency_key)

    @application.post("/v1/batch", dependencies=[Depends(_authenticate)])
    async def batch(payload: BatchInferenceRequest) -> dict[str, Any]:
        if len(payload.requests) > maximum_batch_size:
            raise HTTPException(
                status_code=413, detail={"code": "batch_limit_exceeded"}
            )

        async def bounded(item: InferenceRequest) -> dict[str, Any]:
            async with batch_limit:
                return (await asyncio.to_thread(_predict_core, item)).model_dump(
                    mode="json"
                )

        return {
            "ok": True,
            "results": await asyncio.gather(
                *(bounded(item) for item in payload.requests)
            ),
        }

    @application.post("/v1/explain", dependencies=[Depends(_authenticate)])
    async def explain(payload: InferenceRequest) -> dict[str, Any]:
        result = await asyncio.to_thread(_predict_core, payload)
        return {
            "ok": result.ok,
            "request_id": str(payload.request_id),
            "runtime_mode": result.runtime_mode,
            "features_used": result.features_used,
            "features_missing": result.features_missing,
            "limitations": result.limitations,
            "causal_claim": False,
        }

    @application.post("/v1/feedback", dependencies=[Depends(_authenticate)])
    async def feedback() -> JSONResponse:
        return JSONResponse(
            status_code=501,
            content={
                "ok": False,
                "error": {"code": "persistence_adapter_not_configured"},
            },
        )

    @application.post("/v1/jobs", dependencies=[Depends(_authenticate)])
    async def create_job(
        payload: InferenceRequest,
        idempotency_key: str | None = Header(default=None, alias="Idempotency-Key"),
    ) -> JSONResponse:
        if not idempotency_key or idempotency_key != str(payload.idempotency_key):
            raise HTTPException(
                status_code=400, detail={"code": "valid_idempotency_key_required"}
            )
        request_hash = canonical_hash(
            payload.model_dump(mode="json", exclude={"request_id"})
        )
        job_id = str(uuid.uuid5(uuid.NAMESPACE_URL, f"acnetrex-ml:{idempotency_key}"))
        state, item = jobs.create(
            job_id, idempotency_key, request_hash, payload.model_dump(mode="json")
        )
        if state == "conflict":
            raise HTTPException(
                status_code=409,
                detail={"code": "idempotency_key_reused_with_different_payload"},
            )
        return JSONResponse(
            status_code=202,
            headers={"Idempotency-Replayed": "true"} if state == "replay" else {},
            content={"ok": True, "job_id": item["job_id"], "status": item["status"]},
        )

    @application.get("/v1/jobs/{job_id}", dependencies=[Depends(_authenticate)])
    async def get_job(job_id: str) -> dict[str, Any]:
        item = jobs.get(job_id)
        if not item:
            raise HTTPException(status_code=404, detail={"code": "job_not_found"})
        return {"ok": True, **item}

    return application


app = create_app()
