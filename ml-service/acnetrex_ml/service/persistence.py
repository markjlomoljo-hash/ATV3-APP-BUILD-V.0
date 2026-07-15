from __future__ import annotations

import json
import logging
import os
import tempfile
import threading
from dataclasses import dataclass
from datetime import date, datetime
from typing import Any, Callable, Literal
from uuid import uuid4

from acnetrex_ml.contracts.requests import ConsentScope, InferenceRequest
from acnetrex_ml.contracts.responses import InferenceResponse


LOGGER = logging.getLogger(__name__)


class PersistenceRejected(RuntimeError):
    def __init__(self, code: str) -> None:
        super().__init__(code)
        self.code = code


@dataclass(frozen=True)
class AnalysisReservation:
    state: Literal["reserved", "replay", "conflict", "processing"]
    request: InferenceRequest | None = None
    response_status: int | None = None
    response: dict[str, Any] | None = None
    lease_token: str | None = None
    user_id: str | None = None
    job_id: str | None = None
    engine: str | None = None
    operation: str | None = None
    scope: str | None = None


def _json_value(value: Any, fallback: Any) -> Any:
    if value is None:
        return fallback
    if isinstance(value, str):
        try:
            return json.loads(value)
        except json.JSONDecodeError:
            return fallback
    return value


def _iso(value: Any) -> str | None:
    if isinstance(value, (datetime, date)):
        return value.isoformat()
    if isinstance(value, str) and value:
        return value
    return None


def _durable_status(response: InferenceResponse) -> str:
    if response.readiness_state.value == "insufficient_data":
        return "insufficient_data"
    if response.readiness_state.value in {"error_retryable", "error_terminal"}:
        return "failed"
    if response.readiness_state.value in {
        "not_configured",
        "unsupported_offline",
        "consent_restricted",
        "model_unavailable",
        "evidence_unavailable",
    }:
        return "not_configured"
    return "completed"


class PostgresAnalysisRepository:
    def __init__(
        self,
        connection_string: str,
        *,
        connect_factory: Callable[[], Any] | None = None,
        lease_seconds: int = 120,
        ca_certificate: str | None = None,
    ) -> None:
        self.connection_string = connection_string
        self.connect_factory = connect_factory
        self.lease_seconds = max(30, min(int(lease_seconds), 900))
        self.ca_certificate = ca_certificate
        self._ca_certificate_path: str | None = None
        self._ca_lock = threading.Lock()

    def _connection_parameters(self) -> dict[str, str]:
        if not self.ca_certificate:
            return {}
        certificate = self.ca_certificate.strip().replace("\\n", "\n")
        if (
            "-----BEGIN CERTIFICATE-----" not in certificate
            or "-----END CERTIFICATE-----" not in certificate
        ):
            raise PersistenceRejected("database_tls_ca_invalid")
        with self._ca_lock:
            if self._ca_certificate_path is None:
                descriptor, path = tempfile.mkstemp(
                    prefix="acnetrex-supabase-ca-", suffix=".pem"
                )
                os.close(descriptor)
                try:
                    os.chmod(path, 0o600)
                    with open(path, "w", encoding="utf-8") as handle:
                        handle.write(certificate)
                except BaseException:
                    try:
                        os.unlink(path)
                    except OSError:
                        pass
                    raise
                self._ca_certificate_path = path
        return {
            "sslmode": "verify-full",
            "sslrootcert": self._ca_certificate_path,
        }

    def close(self) -> None:
        with self._ca_lock:
            path = self._ca_certificate_path
            self._ca_certificate_path = None
        if path:
            try:
                os.unlink(path)
            except FileNotFoundError:
                pass

    def _connect(self) -> Any:
        if self.connect_factory is not None:
            return self.connect_factory()
        try:
            import psycopg  # type: ignore[import-not-found]
            from psycopg.rows import dict_row  # type: ignore[import-not-found]
        except ImportError as exc:
            raise RuntimeError("psycopg is required for Railway persistence") from exc
        return psycopg.connect(
            self.connection_string,
            row_factory=dict_row,
            prepare_threshold=None,
            **self._connection_parameters(),
        )

    def healthcheck(self) -> bool:
        try:
            with self._connect() as connection, connection.cursor() as cursor:
                cursor.execute("select 1 as ok")
                row = cursor.fetchone()
                return bool(
                    row and (row.get("ok") if isinstance(row, dict) else row[0])
                )
        except Exception as error:
            LOGGER.warning(
                "analysis_persistence_healthcheck_failed error_type=%s sqlstate=%s",
                type(error).__name__,
                getattr(error, "sqlstate", None),
            )
            return False

    def _load_job(self, cursor: Any, job_id: str) -> dict[str, Any]:
        cursor.execute(
            """
            select j.id::text as id, j.user_id::text as user_id, j.engine,
                   j.operation, j.module, j.task, j.status,
                   j.feature_schema_version, j.input_record_refs, j.features,
                   j.consent_snapshot, j.attempt_count, j.max_attempts
              from public.ml_analysis_jobs j
             where j.id=%s::uuid
             for update
            """,
            (job_id,),
        )
        row = cursor.fetchone()
        if not row:
            raise PersistenceRejected("stored_job_not_found")
        return dict(row)

    def _validate_job(self, job: dict[str, Any], payload: InferenceRequest) -> None:
        if not job.get("user_id"):
            raise PersistenceRejected("stored_job_owner_missing")
        if job.get("engine") != payload.module or job.get("module") != payload.module:
            raise PersistenceRejected("stored_job_module_mismatch")
        if job.get("task") != payload.task:
            raise PersistenceRejected("stored_job_task_mismatch")
        feature_version = job.get("feature_schema_version") or "1.0.0"
        if feature_version != payload.feature_schema_version:
            raise PersistenceRejected("stored_job_feature_schema_mismatch")
        if job.get("status") not in {
            "queued",
            "processing",
            "completed",
            "failed",
            "insufficient_data",
            "not_configured",
        }:
            raise PersistenceRejected("stored_job_state_invalid")

    def prepare(
        self, payload: InferenceRequest, request_hash: str
    ) -> AnalysisReservation:
        job_id = str(payload.request_id)
        scope = f"direct:{payload.module}:{payload.task}"
        lease_token = f"railway-{uuid4()}"
        with self._connect() as connection, connection.cursor() as cursor:
            job = self._load_job(cursor, job_id)
            self._validate_job(job, payload)
            cursor.execute(
                """
                insert into public.ml_service_idempotency
                  (scope, idempotency_key, request_hash, status, expires_at)
                values (%s, %s, %s, 'processing', now() + interval '7 days')
                on conflict (scope, idempotency_key) do nothing
                returning scope
                """,
                (scope, job_id, request_hash),
            )
            created = cursor.fetchone()
            if created is None:
                cursor.execute(
                    """
                    select request_hash, status, response_status, response_reference,
                           (status='processing' and updated_at <
                            now() - (%s * interval '1 second')) as processing_expired
                      from public.ml_service_idempotency
                     where scope=%s and idempotency_key=%s
                     for update
                    """,
                    (self.lease_seconds, scope, job_id),
                )
                existing = cursor.fetchone()
                if not existing:
                    raise PersistenceRejected("idempotency_state_missing")
                if existing["request_hash"] != request_hash:
                    return AnalysisReservation(state="conflict")
                if existing["status"] in {"completed", "failed_terminal"}:
                    return AnalysisReservation(
                        state="replay",
                        response_status=existing["response_status"],
                        response=_json_value(existing["response_reference"], {}),
                    )
                if (
                    existing["status"] == "processing"
                    and not existing["processing_expired"]
                ):
                    return AnalysisReservation(state="processing")
                cursor.execute(
                    """
                    update public.ml_service_idempotency
                       set status='processing', response_status=null,
                           response_reference='{}'::jsonb,
                           expires_at=now() + interval '7 days', updated_at=now()
                     where scope=%s and idempotency_key=%s
                    """,
                    (scope, job_id),
                )
            cursor.execute(
                """
                update public.ml_analysis_jobs
                   set status='processing', lease_owner=%s,
                       lease_expires_at=now() + (%s * interval '1 second'),
                       attempt_count=least(attempt_count + 1, max_attempts),
                       failure_reason=null, error_class=null, updated_at=now()
                 where id=%s::uuid
                   and status in ('queued','processing')
                 returning id
                """,
                (lease_token, self.lease_seconds, job_id),
            )
            if cursor.fetchone() is None:
                raise PersistenceRejected("stored_job_not_claimable")

        owner_request = self._build_owner_request(job, payload)
        return AnalysisReservation(
            state="reserved",
            request=owner_request,
            lease_token=lease_token,
            user_id=str(job["user_id"]),
            job_id=job_id,
            engine=str(job["engine"]),
            operation=str(job["operation"]),
            scope=scope,
        )

    def _build_owner_request(
        self, job: dict[str, Any], payload: InferenceRequest
    ) -> InferenceRequest:
        references = _json_value(job.get("input_record_refs"), [])
        if not isinstance(references, list):
            references = []
        owner_id = str(job["user_id"])
        stored_features = _json_value(job.get("features"), {})
        inputs: dict[str, Any] = (
            dict(stored_features) if isinstance(stored_features, dict) else {}
        )
        canonical_refs: list[str] = []
        reference_ids: dict[str, list[str]] = {}
        allowed_tables = {
            "sleep_logs",
            "food_logs",
            "skin_state_logs",
            "face_scans",
            "skin_twin_snapshots",
            "user_memory_facts",
            "user_memory_summaries",
        }
        for item in references:
            if not isinstance(item, dict):
                continue
            table = item.get("table")
            record_id = item.get("id")
            if table in allowed_tables and isinstance(record_id, str):
                reference_ids.setdefault(str(table), []).append(record_id)

        if payload.module == "sleepderm":
            ids = reference_ids.get("sleep_logs", [])
            records: list[dict[str, str]] = []
            if ids:
                with self._connect() as connection, connection.cursor() as cursor:
                    cursor.execute(
                        """
                        select id::text as id, log_date::text as log_date,
                               sleep_time as sleep_time, wake_time as wake_time
                          from public.sleep_logs
                         where user_id=%s::uuid and id=any(%s::uuid[])
                         order by log_date asc, id asc
                        """,
                        (owner_id, ids),
                    )
                    rows = cursor.fetchall()
                seen: set[str] = set()
                for row in rows:
                    bedtime = _iso(row.get("sleep_time"))
                    wake_time = _iso(row.get("wake_time"))
                    log_date = _iso(row.get("log_date"))
                    if not bedtime or not wake_time or not log_date:
                        continue
                    records.append(
                        {"date": log_date, "bedtime": bedtime, "wake_time": wake_time}
                    )
                    row_id = str(row["id"])
                    if row_id not in seen:
                        canonical_refs.append(f"sleep_logs:{row_id}")
                        seen.add(row_id)
            inputs["records"] = records
        elif payload.module == "dermdiet":
            ids = reference_ids.get("food_logs", [])
            meals: list[dict[str, Any]] = []
            snacks: list[dict[str, Any]] = []
            rows: list[Any] = []
            if ids:
                with self._connect() as connection, connection.cursor() as cursor:
                    cursor.execute(
                        """
                        select id::text as id, log_date::text as log_date,
                               meal_type, categories, completed
                          from public.food_logs
                         where user_id=%s::uuid and id=any(%s::uuid[])
                         order by log_date asc, id asc
                        """,
                        (owner_id, ids),
                    )
                    rows = cursor.fetchall()
                for row in rows:
                    record = {
                        "event_id": str(row["id"]),
                        "date": _iso(row.get("log_date")),
                        "categories": _json_value(row.get("categories"), []),
                    }
                    target = snacks if str(row.get("meal_type")) == "snack" else meals
                    target.append(record)
                    canonical_refs.append(f"food_logs:{row['id']}")
            inputs.update(
                {
                    "meals": meals,
                    "snacks": snacks,
                    "marked_complete": bool(rows)
                    and all(bool(row.get("completed")) for row in rows),
                }
            )
        elif payload.module in {"triggergraph", "forecast"}:
            ids = reference_ids.get("skin_state_logs", [])
            outcomes: list[float] = []
            if ids:
                with self._connect() as connection, connection.cursor() as cursor:
                    cursor.execute(
                        """
                        select id::text as id, new_lesions, inflammation_level
                          from public.skin_state_logs
                         where user_id=%s::uuid and id=any(%s::uuid[])
                         order by log_date asc, id asc
                        """,
                        (owner_id, ids),
                    )
                    rows = cursor.fetchall()
                for row in rows:
                    value = row.get("new_lesions")
                    if value is None:
                        value = row.get("inflammation_level")
                    if value is not None:
                        outcomes.append(float(value))
                    canonical_refs.append(f"skin_state_logs:{row['id']}")
            inputs["outcomes"] = outcomes
        elif payload.module == "skin_twin":
            ids = reference_ids.get("skin_twin_snapshots", [])
            if ids:
                with self._connect() as connection, connection.cursor() as cursor:
                    cursor.execute(
                        """
                        select id::text as id, scenario_payload, source_record_refs
                          from public.skin_twin_snapshots
                         where user_id=%s::uuid and id=any(%s::uuid[])
                         order by snapshot_at desc, id asc limit 1
                        """,
                        (owner_id, ids),
                    )
                    row = cursor.fetchone()
                if row:
                    scenario = _json_value(row.get("scenario_payload"), {})
                    if isinstance(scenario, dict):
                        inputs.update(scenario)
                    canonical_refs.append(f"skin_twin_snapshots:{row['id']}")
        elif payload.module == "faceatlas":
            ids = reference_ids.get("face_scans", [])
            images: list[dict[str, Any]] = []
            if ids:
                with self._connect() as connection, connection.cursor() as cursor:
                    cursor.execute(
                        """
                        select id::text as id, angle, image_quality
                          from public.face_scans
                         where user_id=%s::uuid and id=any(%s::uuid[])
                         order by captured_at asc, id asc
                        """,
                        (owner_id, ids),
                    )
                    rows = cursor.fetchall()
                metadata_by_id = {
                    str(item.get("record_id")): item
                    for item in inputs.get("images", [])
                    if isinstance(item, dict) and item.get("record_id")
                }
                for row in rows:
                    image = dict(metadata_by_id.get(str(row["id"]), {}))
                    image.update({"record_id": str(row["id"]), "angle": row["angle"]})
                    images.append(image)
                    canonical_refs.append(f"face_scans:{row['id']}")
            inputs["images"] = images
        elif payload.module == "cutisai":
            fact_ids = reference_ids.get("user_memory_facts", [])
            facts: list[dict[str, Any]] = []
            if fact_ids:
                with self._connect() as connection, connection.cursor() as cursor:
                    cursor.execute(
                        """
                        select id::text as id, fact_key, fact_value, confidence
                          from public.user_memory_facts
                         where user_id=%s::uuid and id=any(%s::uuid[])
                           and deleted_at is null
                         order by updated_at desc, id asc
                         limit 20
                        """,
                        (owner_id, fact_ids),
                    )
                    rows = cursor.fetchall()
                for row in rows:
                    facts.append(
                        {
                            "fact_key": row.get("fact_key"),
                            "fact_value": _json_value(row.get("fact_value"), None),
                            "confidence": row.get("confidence"),
                        }
                    )
                    canonical_refs.append(f"user_memory_facts:{row['id']}")
            inputs["retrieved_facts"] = facts
        consent_data = _json_value(job.get("consent_snapshot"), {})
        if not isinstance(consent_data, dict):
            consent_data = {}
        consent = ConsentScope.model_validate(
            {
                "personal_processing": bool(
                    consent_data.get("personal_processing", False)
                ),
                "raw_image_processing": bool(
                    consent_data.get("raw_image_processing", False)
                ),
                "anonymous_learning": bool(
                    consent_data.get("anonymous_learning", False)
                ),
            }
        )
        return payload.model_copy(
            update={
                "inputs": inputs,
                "input_record_refs": canonical_refs,
                "consent": consent,
            }
        )

    def _persist_domain_projection(
        self,
        cursor: Any,
        reservation: AnalysisReservation,
        response: InferenceResponse,
        status: str,
    ) -> None:
        if not reservation.request or not reservation.user_id or not reservation.job_id:
            raise PersistenceRejected("reservation_incomplete")
        request = reservation.request
        result = response.result
        cursor.execute(
            """
            insert into public.ml_feature_snapshots
              (user_id, module, feature_schema_version, source_record_refs,
               features, missing_features, confidence, source_job_id)
            values (%s::uuid,%s,%s,%s::jsonb,%s::jsonb,%s::jsonb,%s,%s::uuid)
            on conflict (source_job_id) do nothing
            """,
            (
                reservation.user_id,
                request.module,
                request.feature_schema_version,
                json.dumps(request.input_record_refs),
                json.dumps(request.inputs, default=str),
                json.dumps(response.features_missing),
                response.confidence,
                reservation.job_id,
            ),
        )
        cursor.execute(
            """
            insert into public.intelligence_events
              (user_id, module, event_type, runtime_mode, input_record_refs,
               payload, source_job_id)
            values (%s::uuid,%s,'ml_analysis_finalized',%s,%s::jsonb,%s::jsonb,%s::uuid)
            """,
            (
                reservation.user_id,
                request.module,
                response.runtime_mode.value,
                json.dumps(response.input_record_refs),
                json.dumps(
                    {
                        "readiness_state": response.readiness_state.value,
                        "result_type": response.result_type,
                        "safety_state": response.safety_state.value,
                    }
                ),
                reservation.job_id,
            ),
        )
        if request.module == "triggergraph" and result is not None:
            cursor.execute(
                """
                insert into public.trigger_hypotheses
                  (user_id, trigger_name, evidence, confidence, status,
                   observed_window, source_job_id)
                values (%s::uuid,%s,%s::jsonb,%s,%s,%s::jsonb,%s::uuid)
                on conflict (source_job_id) do nothing
                """,
                (
                    reservation.user_id,
                    str(request.inputs.get("exposure_name", "exploratory_pattern"))[:160],
                    json.dumps(result),
                    response.confidence,
                    response.readiness_state.value,
                    json.dumps({"lag_days": result.get("lag_days")}),
                    reservation.job_id,
                ),
            )
        elif request.module == "forecast" and result is not None:
            horizon = int(result.get("horizon_days", request.inputs.get("horizon_days", 3)))
            cursor.execute(
                """
                insert into public.forecasts
                  (user_id, horizon_days, forecast, model_version, confidence,
                   source_job_id)
                values (%s::uuid,%s,%s::jsonb,%s,%s,%s::uuid)
                on conflict (source_job_id) do nothing
                """,
                (
                    reservation.user_id,
                    horizon,
                    json.dumps(result),
                    response.model_version,
                    response.confidence,
                    reservation.job_id,
                ),
            )
            summary = result.get("deterministic_recent_direction")
            cursor.execute(
                """
                insert into public.forecast_summaries
                  (user_id, window, status, summary, confidence, source_job_id)
                values (%s,%s,%s,%s,%s,%s::uuid)
                on conflict (source_job_id) do nothing
                """,
                (
                    reservation.user_id,
                    f"{horizon}d",
                    response.readiness_state.value,
                    str(summary) if summary is not None else None,
                    response.confidence_label,
                    reservation.job_id,
                ),
            )
        elif request.module == "skin_twin":
            snapshot_ids = [
                value.split(":", 1)[1]
                for value in response.input_record_refs
                if value.startswith("skin_twin_snapshots:")
            ]
            if not snapshot_ids:
                raise PersistenceRejected("skin_twin_snapshot_reference_missing")
            cursor.execute(
                """
                update public.skin_twin_snapshots
                   set status=%s, simulation=%s::jsonb, model_version=%s,
                       confidence=%s, uncertainty=%s::jsonb, source_job_id=%s::uuid
                 where id=%s::uuid and user_id=%s::uuid
                   and (source_job_id is null or source_job_id=%s::uuid)
                """,
                (
                    status,
                    None if result is None else json.dumps(result),
                    response.model_version,
                    response.confidence_label,
                    json.dumps(response.uncertainty),
                    reservation.job_id,
                    snapshot_ids[0],
                    reservation.user_id,
                    reservation.job_id,
                ),
            )
            if cursor.rowcount != 1:
                raise PersistenceRejected("skin_twin_snapshot_update_missing")

    def finalize(
        self,
        reservation: AnalysisReservation,
        response: InferenceResponse,
        request_hash: str,
    ) -> dict[str, Any]:
        if not all(
            (
                reservation.request,
                reservation.lease_token,
                reservation.user_id,
                reservation.job_id,
                reservation.engine,
                reservation.operation,
                reservation.scope,
            )
        ):
            raise PersistenceRejected("reservation_incomplete")
        body = response.model_copy(
            update={"job_id": reservation.job_id, "sync_status": "synced"}
        ).model_dump(mode="json")
        status = _durable_status(response)
        with self._connect() as connection, connection.cursor() as cursor:
            cursor.execute(
                """
                select j.id::text as id, j.user_id::text as user_id, j.engine,
                       j.operation, j.module, j.task, j.status,
                       j.feature_schema_version, j.input_record_refs, j.features,
                       j.consent_snapshot, j.attempt_count, j.max_attempts
                  from public.ml_analysis_jobs j
                 where j.id=%s::uuid and j.user_id=%s::uuid
                   and j.lease_owner=%s and j.status='processing'
                 for update
                """,
                (
                    reservation.job_id,
                    reservation.user_id,
                    reservation.lease_token,
                ),
            )
            if cursor.fetchone() is None:
                raise PersistenceRejected("railway_job_lease_lost")
            cursor.execute(
                """
                insert into public.ml_analysis_results
                  (user_id, job_id, engine, operation, runtime_mode, model_name,
                   model_version, training_data_version, feature_schema_version,
                   input_record_refs, features_used, features_missing, confidence,
                   limitations, result, sync_status, result_type, readiness_state,
                   safety_state, coverage, calibration_state, confidence_label,
                   uncertainty, confounders, evidence_state, latency_ms, request_id,
                   idempotency_key, contract_version)
                values
                  (%s::uuid,%s::uuid,%s,%s,%s,%s,%s,%s,%s,%s::jsonb,%s::jsonb,
                   %s::jsonb,%s,%s::jsonb,%s::jsonb,'synced',%s,%s,%s,%s,%s,%s,
                   %s::jsonb,%s::jsonb,%s,%s,%s::uuid,%s,'1.0.0')
                on conflict (job_id) do nothing
                returning id::text as id
                """,
                (
                    reservation.user_id,
                    reservation.job_id,
                    reservation.engine,
                    reservation.operation,
                    response.runtime_mode.value,
                    response.model_name,
                    response.model_version,
                    response.training_data_version,
                    response.feature_schema_version,
                    json.dumps(response.input_record_refs),
                    json.dumps(response.features_used),
                    json.dumps(response.features_missing),
                    response.confidence,
                    json.dumps(response.limitations),
                    None if response.result is None else json.dumps(response.result),
                    response.result_type,
                    response.readiness_state.value,
                    response.safety_state.value,
                    response.coverage,
                    response.calibration_state,
                    response.confidence_label,
                    json.dumps(response.uncertainty),
                    json.dumps(response.confounders),
                    response.evidence_state,
                    response.latency_ms,
                    reservation.job_id,
                    reservation.job_id,
                ),
            )
            result_row = cursor.fetchone()
            if result_row is None:
                raise PersistenceRejected("analysis_result_already_exists")
            result_id = str(result_row["id"])
            self._persist_domain_projection(cursor, reservation, response, status)
            cursor.execute(
                """
                update public.ml_analysis_jobs
                   set status=%s, failure_reason=null, error_class=null,
                       lease_owner=null, lease_expires_at=null, updated_at=now()
                 where id=%s::uuid and user_id=%s::uuid
                   and lease_owner=%s and status='processing'
                 returning id
                """,
                (
                    status,
                    reservation.job_id,
                    reservation.user_id,
                    reservation.lease_token,
                ),
            )
            if cursor.fetchone() is None:
                raise PersistenceRejected("railway_job_lease_lost")
            cursor.execute(
                """
                update public.ml_service_idempotency
                   set status='completed', response_status=200,
                       response_reference=%s::jsonb, completed_at=now(),
                       expires_at=now() + interval '7 days', updated_at=now()
                 where scope=%s and idempotency_key=%s and request_hash=%s
                """,
                (
                    json.dumps(body, default=str),
                    reservation.scope,
                    reservation.job_id,
                    request_hash,
                ),
            )
            if cursor.rowcount != 1:
                raise PersistenceRejected("idempotency_finalize_failed")
            cursor.execute(
                """
                insert into public.audit_logs
                  (user_id, actor_type, action, target_table, target_id, metadata)
                values (%s::uuid, 'service', 'ml_analysis_finalized',
                        'ml_analysis_results', %s::uuid,
                        jsonb_build_object('job_id',%s::uuid,'status',%s::text))
                """,
                (reservation.user_id, result_id, reservation.job_id, status),
            )
        with self._connect() as connection, connection.cursor() as cursor:
            cursor.execute(
                """
                select j.status, r.id as result_id,
                       r.request_id as request_id
                  from public.ml_analysis_jobs j
                  join public.ml_analysis_results r
                    on r.job_id=j.id and r.user_id=j.user_id
                 where j.id=%s::uuid and j.user_id=%s::uuid
                """,
                (reservation.job_id, reservation.user_id),
            )
            committed = cursor.fetchone()
        if (
            not committed
            or committed["status"] != status
            or str(committed["result_id"]) != result_id
            or str(committed["request_id"]) != reservation.job_id
        ):
            raise PersistenceRejected("committed_state_readback_failed")
        return body

    def fail(
        self,
        reservation: AnalysisReservation,
        *,
        retryable: bool,
        code: str,
    ) -> None:
        if not reservation.job_id or not reservation.scope:
            return
        job_status = "queued" if retryable else "failed"
        idempotency_status = "failed_retryable" if retryable else "failed_terminal"
        with self._connect() as connection, connection.cursor() as cursor:
            cursor.execute(
                """
                update public.ml_analysis_jobs
                   set status=%s, failure_reason=%s, error_class=%s,
                       lease_owner=null, lease_expires_at=null,
                       next_attempt_at=case when %s then now() + interval '10 seconds'
                                            else next_attempt_at end,
                       dead_lettered_at=case when %s then dead_lettered_at else now() end,
                       updated_at=now()
                 where id=%s::uuid and lease_owner=%s
                """,
                (
                    job_status,
                    code,
                    "railway_retryable" if retryable else "railway_terminal",
                    retryable,
                    retryable,
                    reservation.job_id,
                    reservation.lease_token,
                ),
            )
            cursor.execute(
                """
                update public.ml_service_idempotency
                   set status=%s, response_status=%s,
                       response_reference=%s::jsonb, updated_at=now()
                 where scope=%s and idempotency_key=%s
                """,
                (
                    idempotency_status,
                    503 if retryable else 422,
                    json.dumps({"detail": {"code": code}}),
                    reservation.scope,
                    reservation.job_id,
                ),
            )
