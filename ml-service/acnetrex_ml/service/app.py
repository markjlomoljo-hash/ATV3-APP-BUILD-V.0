from __future__ import annotations

import asyncio
import json
import logging
import math
import os
import secrets
import time
from collections.abc import AsyncIterator
from contextlib import asynccontextmanager
from pathlib import Path
from typing import Any
from uuid import UUID

from fastapi import Depends, FastAPI, Header, HTTPException, Request
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field

from acnetrex_ml import CONTRACT_VERSION
from acnetrex_ml.contracts.requests import BatchInferenceRequest, InferenceRequest
from acnetrex_ml.contracts.responses import (
    InferenceResponse,
    ReadinessState,
    RuntimeMode,
)
from acnetrex_ml.engines import dispatch_deterministic
from acnetrex_ml.observability.metrics import METRICS
from acnetrex_ml.predictive.artifact import ArtifactRejected, load_approved_artifact
from acnetrex_ml.registry.local_registry import LocalModelRegistry
from acnetrex_ml.runtime.vertex import VertexAdapter
from acnetrex_ml.safety.consent import validate_consent
from acnetrex_ml.safety.output_validation import validate_safe_output

from .dependencies import (
    build_analysis_repository,
    build_idempotency_store,
)
from .idempotency import IdempotencyStore, canonical_hash
from .middleware import RequestContextMiddleware
from .persistence import PersistenceRejected


SERVICE_ROOT = Path(__file__).resolve().parents[2]


class TerminalizationRequest(BaseModel):
    reason: str = Field(pattern=r"^[a-z0-9_]{1,80}$")


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
            result_type="consent_restricted",
            result=None,
            runtime_mode=RuntimeMode.UNAVAILABLE,
            runtime_provider="none",
            readiness_state=ReadinessState.CONSENT_RESTRICTED,
            input_record_refs=payload.input_record_refs,
            safety_state=ReadinessState.CONSENT_RESTRICTED,
            limitations=[
                "Processing was not performed because consent does not permit it.",
                f"Consent gate: {consent_reason or 'required_scope_missing'}.",
            ],
            latency_ms=(time.perf_counter() - start) * 1000,
        )
    registry_path = os.getenv(
        "MODEL_REGISTRY_PATH", str(SERVICE_ROOT / "manifests/model-registry.json")
    )
    try:
        artifact = load_approved_artifact(registry_path, task=payload.task)
    except (ArtifactRejected, OSError, TypeError, ValueError, json.JSONDecodeError):
        artifact = None
    if artifact is not None:
        invalid_features = [
            name
            for name in artifact.feature_names
            if isinstance(payload.inputs.get(name), bool)
            or not isinstance(payload.inputs.get(name), (int, float))
            or not math.isfinite(float(payload.inputs[name]))
        ]
        if invalid_features:
            supplied = len(artifact.feature_names) - len(invalid_features)
            return InferenceResponse(
                ok=False,
                request_id=str(payload.request_id),
                module=payload.module,
                task=payload.task,
                result_type="insufficient_data",
                result=None,
                runtime_mode=RuntimeMode.CLOUD_RUN,
                runtime_provider="acnetrex_predictive_runtime",
                readiness_state=ReadinessState.INSUFFICIENT_DATA,
                model_name=artifact.model_name,
                model_version=artifact.model_version,
                training_data_version=artifact.dataset_version,
                feature_schema_version=artifact.feature_schema_version,
                input_record_refs=payload.input_record_refs,
                features_used=[
                    name
                    for name in artifact.feature_names
                    if name not in invalid_features
                ],
                features_missing=invalid_features,
                sample_count=len(payload.input_record_refs),
                coverage=supplied / len(artifact.feature_names),
                confidence=None,
                confidence_label="not_applicable",
                calibration_state="unavailable",
                uncertainty=["No predictive probability was produced."],
                limitations=[
                    "All required owner-derived features must be available.",
                    *artifact.limitations,
                ],
                evidence_state="unavailable",
                safety_state=ReadinessState.INSUFFICIENT_DATA,
                sync_status="synced",
                latency_ms=(time.perf_counter() - start) * 1000,
            )
        prediction = artifact.predict(payload.inputs)
        probability = prediction.probability
        certainty = max(probability, 1.0 - probability)
        confidence_label = (
            "high" if certainty >= 0.8 else "moderate" if certainty >= 0.65 else "low"
        )
        result = {
            "state": "ready",
            "estimated_direction": prediction.label,
            "direction_probability": probability,
            "component_models": prediction.component_probabilities,
            "feature_contributions": prediction.feature_contributions,
            "causal_claim": False,
        }
        return InferenceResponse(
            ok=True,
            request_id=str(payload.request_id),
            module=payload.module,
            task=payload.task,
            result_type="calibrated_predictive_ensemble",
            result=result,
            runtime_mode=RuntimeMode.CLOUD_RUN,
            runtime_provider="acnetrex_predictive_runtime",
            readiness_state=ReadinessState.READY,
            model_name=artifact.model_name,
            model_version=artifact.model_version,
            training_data_version=artifact.dataset_version,
            feature_schema_version=artifact.feature_schema_version,
            input_record_refs=payload.input_record_refs,
            features_used=prediction.features_used,
            sample_count=max(1, len(payload.input_record_refs)),
            coverage=1.0,
            confidence=probability,
            confidence_label=confidence_label,
            calibration_state=prediction.calibration_state,
            uncertainty=[
                "Probability is calibrated on an untouched participant-grouped temporal holdout.",
                "This associational estimate is not a diagnosis or causal claim.",
            ],
            limitations=artifact.limitations,
            evidence_state="available",
            safety_state=ReadinessState.READY,
            sync_status="synced",
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
        result=result if ok else None,
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
    analysis_repository: Any | None = None,
) -> FastAPI:
    store = idempotency_store or build_idempotency_store()
    repository = analysis_repository or build_analysis_repository()
    batch_limit = asyncio.Semaphore(int(os.getenv("MAX_BATCH_CONCURRENCY", "4")))
    maximum_batch_size = int(os.getenv("MAX_BATCH_SIZE", "32"))

    @asynccontextmanager
    async def lifespan(_: FastAPI) -> AsyncIterator[None]:
        yield

    application = FastAPI(title="AcneTrex ML", version="1.0.0", lifespan=lifespan)
    application.add_middleware(RequestContextMiddleware)

    @application.get("/")
    async def root() -> dict[str, Any]:
        return {
            "ok": True,
            "service": "acnetrex-ml",
            "contractVersion": CONTRACT_VERSION,
            "health": "/ready",
            "inference": "/api/v1/inference",
            "compatibility": "/predict",
        }

    @application.get("/live")
    @application.get("/health/live")
    async def health_live() -> dict[str, Any]:
        return {"ok": True, "service": "acnetrex-ml", "state": "live"}

    @application.get("/health")
    @application.get("/ready")
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
        persistence_owner = os.getenv("ACNETREX_ML_PERSISTENCE_OWNER", "nextjs")
        persistence = repository if persistence_owner == "railway" else store
        persistence_ready = persistence is not None and await asyncio.to_thread(
            persistence.healthcheck
        )
        ready = (
            artifact_integrity["state"] == "ready"
            and registry_state == "ready"
            and persistence_ready
        )
        if not ready:
            logging.getLogger("uvicorn.error").warning(
                "readiness_failed artifact_state=%s registry_state=%s persistence_state=%s",
                artifact_integrity["state"],
                registry_state,
                "ready" if persistence_ready else "error",
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
                "cloudProvider": {"state": "not_configured", "selectedTasks": []},
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
        request_id: str | None,
    ) -> JSONResponse:
        if not idempotency_key:
            raise HTTPException(
                status_code=400, detail={"code": "idempotency_key_required"}
            )
        if idempotency_key != str(payload.idempotency_key):
            raise HTTPException(
                status_code=409, detail={"code": "idempotency_key_mismatch"}
            )
        persistence_owner = os.getenv("ACNETREX_ML_PERSISTENCE_OWNER", "nextjs")
        if persistence_owner not in {"nextjs", "railway"}:
            raise HTTPException(
                status_code=503, detail={"code": "invalid_persistence_owner"}
            )
        if persistence_owner == "railway":
            if not request_id:
                raise HTTPException(
                    status_code=400, detail={"code": "request_id_required"}
                )
            if request_id != str(payload.request_id):
                raise HTTPException(
                    status_code=409, detail={"code": "request_id_mismatch"}
                )
            if payload.request_id != payload.idempotency_key:
                raise HTTPException(
                    status_code=409, detail={"code": "job_identity_mismatch"}
                )
            if repository is None:
                raise HTTPException(
                    status_code=503,
                    detail={"code": "railway_persistence_not_configured"},
                )
            request_hash = canonical_hash(payload.model_dump(mode="json"))
            try:
                reservation = await asyncio.to_thread(
                    repository.prepare, payload, request_hash
                )
            except PersistenceRejected as exc:
                raise HTTPException(status_code=422, detail={"code": exc.code}) from exc
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
                    asyncio.to_thread(_predict_core, reservation.request),
                    timeout=float(os.getenv("REQUEST_TIMEOUT_SECONDS", "20")),
                )
                if result.runtime_mode == RuntimeMode.LOCAL_DETERMINISTIC:
                    result = result.model_copy(
                        update={
                            "runtime_mode": RuntimeMode.CLOUD_RUN,
                            "runtime_provider": "acnetrex-railway-ml",
                            "sync_status": "synced",
                        }
                    )
                body = await asyncio.to_thread(
                    repository.finalize,
                    reservation,
                    result,
                    request_hash,
                )
                return JSONResponse(status_code=200, content=body)
            except TimeoutError as exc:
                await asyncio.to_thread(
                    repository.fail,
                    reservation,
                    retryable=True,
                    code="inference_timeout",
                )
                raise HTTPException(
                    status_code=504, detail={"code": "inference_timeout"}
                ) from exc
            except (TypeError, ValueError) as exc:
                await asyncio.to_thread(
                    repository.fail,
                    reservation,
                    retryable=False,
                    code="invalid_input",
                )
                raise HTTPException(
                    status_code=422, detail={"code": "invalid_input"}
                ) from exc
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
            body = result.model_copy(
                update={"job_id": str(payload.request_id)}
            ).model_dump(mode="json")
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

    @application.post("/predict", dependencies=[Depends(_authenticate)])
    async def predict(
        payload: InferenceRequest,
        request: Request,
        idempotency_key: str | None = Header(default=None, alias="Idempotency-Key"),
        request_id: str | None = Header(default=None, alias="X-Request-ID"),
    ) -> JSONResponse:
        return await execute_prediction(payload, request, idempotency_key, request_id)

    @application.post("/api/v1/inference", dependencies=[Depends(_authenticate)])
    async def inference_compatibility_alias(
        payload: InferenceRequest,
        request: Request,
        idempotency_key: str | None = Header(default=None, alias="Idempotency-Key"),
        request_id: str | None = Header(default=None, alias="X-Request-ID"),
    ) -> JSONResponse:
        return await execute_prediction(payload, request, idempotency_key, request_id)

    @application.post(
        "/api/v1/jobs/{job_id}/terminalize",
        dependencies=[Depends(_authenticate)],
    )
    async def terminalize_analysis_job(
        job_id: UUID,
        payload: TerminalizationRequest,
        request_id: str | None = Header(default=None, alias="X-Request-ID"),
        idempotency_key: str | None = Header(default=None, alias="Idempotency-Key"),
    ) -> dict[str, Any]:
        canonical_job_id = str(job_id)
        if os.getenv("ACNETREX_ML_PERSISTENCE_OWNER", "nextjs") != "railway":
            raise HTTPException(
                status_code=409, detail={"code": "railway_persistence_not_active"}
            )
        if not request_id:
            raise HTTPException(
                status_code=400, detail={"code": "request_id_required"}
            )
        if request_id != canonical_job_id:
            raise HTTPException(
                status_code=409, detail={"code": "request_id_mismatch"}
            )
        if not idempotency_key:
            raise HTTPException(
                status_code=400, detail={"code": "idempotency_key_required"}
            )
        if idempotency_key != canonical_job_id:
            raise HTTPException(
                status_code=409, detail={"code": "idempotency_key_mismatch"}
            )
        if repository is None:
            raise HTTPException(
                status_code=503, detail={"code": "railway_persistence_not_configured"}
            )
        try:
            return await asyncio.to_thread(
                repository.terminalize, canonical_job_id, code=payload.reason
            )
        except PersistenceRejected as exc:
            raise HTTPException(status_code=422, detail={"code": exc.code}) from exc

    @application.post("/v1/predict", dependencies=[Depends(_authenticate)])
    async def predict_legacy_alias(
        payload: InferenceRequest,
        request: Request,
        idempotency_key: str | None = Header(default=None, alias="Idempotency-Key"),
        request_id: str | None = Header(default=None, alias="X-Request-ID"),
    ) -> JSONResponse:
        return await execute_prediction(payload, request, idempotency_key, request_id)

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

    return application


app = create_app()
