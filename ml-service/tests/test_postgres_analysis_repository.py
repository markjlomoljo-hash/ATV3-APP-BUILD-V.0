from __future__ import annotations

import os
import stat
from pathlib import Path
from typing import Any

import pytest

from acnetrex_ml.contracts.requests import InferenceRequest
from acnetrex_ml.service.app import _predict_core
from acnetrex_ml.service.persistence import PersistenceRejected, PostgresAnalysisRepository


JOB_ID = "11111111-1111-4111-8111-111111111112"
USER_ID = "11111111-1111-4111-8111-111111111113"
SLEEP_ID = "11111111-1111-4111-8111-111111111115"
RESULT_ID = "11111111-1111-4111-8111-111111111119"
FACE_SCAN_ID = "11111111-1111-4111-8111-111111111120"
ANNOTATION_ID = "11111111-1111-4111-8111-111111111121"


def request() -> InferenceRequest:
    return InferenceRequest.model_validate(
        {
            "contract_version": "1.0.0",
            "request_id": JOB_ID,
            "idempotency_key": JOB_ID,
            "module": "sleepderm",
            "task": "sleep_pattern_analysis",
            "runtime_preference": "cloud",
            "feature_schema_version": "1.0.0",
            "input_record_refs": [],
            "inputs": {"records": [{"date": "forged"}]},
            "context": {"timezone": "Asia/Manila", "locale": "en-PH"},
            "consent": {
                "personal_processing": True,
                "raw_image_processing": False,
                "anonymous_learning": False,
            },
        }
    )


def faceatlas_request() -> InferenceRequest:
    payload = request().model_dump(mode="json")
    payload.update(
        {
            "module": "faceatlas",
            "task": "quality_assessment",
            "input_record_refs": [f"face_scans:{FACE_SCAN_ID}"],
            "inputs": {
                "images": [
                    {
                        "record_id": FACE_SCAN_ID,
                        "angle": "forged_angle",
                        "width": 9999,
                        "mean_brightness": 0.99,
                    }
                ]
            },
        }
    )
    return InferenceRequest.model_validate(payload)


class ScriptedDatabase:
    def __init__(
        self,
        *,
        replay: bool = False,
        stored_request_id: str = JOB_ID,
        stored_idempotency_key: str = JOB_ID,
    ) -> None:
        self.replay = replay
        self.stored_request_id = stored_request_id
        self.stored_idempotency_key = stored_idempotency_key
        self.executed: list[tuple[str, Any]] = []
        self.last_one: Any = None
        self.last_all: list[Any] = []
        self.rowcount = 1
        self.commits = 0
        self.rollbacks = 0
        self.job_status = "queued"

    def connect(self):
        return self

    def __enter__(self):
        return self

    def __exit__(self, exc_type, _exc, _traceback):
        if exc_type is None:
            self.commits += 1
        else:
            self.rollbacks += 1
        return False

    def cursor(self):
        return self

    def execute(self, sql: str, params: Any = None) -> None:
        normalized = " ".join(sql.split())
        self.executed.append((normalized, params))
        self.last_one = None
        self.last_all = []
        self.rowcount = 1
        if (
            "from public.ml_analysis_jobs j" in normalized
            and "for update" in normalized
        ):
            self.last_one = {
                "id": JOB_ID,
                "request_id": self.stored_request_id,
                "idempotency_key": self.stored_idempotency_key,
                "user_id": USER_ID,
                "engine": "sleepderm",
                "operation": "readiness",
                "module": "sleepderm",
                "task": "sleep_pattern_analysis",
                "status": "queued",
                "feature_schema_version": "1.0.0",
                "input_record_refs": [{"table": "sleep_logs", "id": SLEEP_ID}],
                "features": {"records": [{"date": "forged"}]},
                "consent_snapshot": {
                    "personal_processing": True,
                    "raw_image_processing": False,
                    "anonymous_learning": False,
                },
                "attempt_count": 0,
                "max_attempts": 5,
            }
            self.last_one["status"] = self.job_status
        elif "insert into public.ml_service_idempotency" in normalized:
            self.last_one = (
                None
                if self.replay
                else {"scope": "direct:sleepderm:sleep_pattern_analysis"}
            )
        elif "from public.ml_service_idempotency" in normalized:
            self.last_one = {
                "request_hash": "hash-1",
                "status": "completed",
                "response_status": 200,
                "response_reference": {
                    "ok": True,
                    "request_id": JOB_ID,
                    "job_id": JOB_ID,
                },
                "processing_expired": False,
            }
        elif "from public.sleep_logs" in normalized:
            self.last_all = [
                {
                    "id": SLEEP_ID,
                    "log_date": f"2026-07-{day:02d}",
                    "sleep_time": f"2026-07-{day:02d}T23:00:00+08:00",
                    "wake_time": f"2026-07-{day + 1:02d}T07:00:00+08:00",
                }
                for day in range(1, 8)
            ]
        elif "insert into public.ml_analysis_results" in normalized:
            self.last_one = {"id": RESULT_ID}
        elif (
            "update public.ml_analysis_jobs" in normalized
            and "returning id" in normalized
        ):
            self.job_status = "failed" if "dead_lettered_at" in normalized else self.job_status
            self.last_one = {"id": JOB_ID}
        elif "select j.status, r.id as result_id" in normalized:
            self.last_one = {
                "status": "completed",
                "result_id": RESULT_ID,
                "request_id": JOB_ID,
            }

    def fetchone(self):
        return self.last_one

    def fetchall(self):
        return self.last_all


class FaceAtlasDatabase(ScriptedDatabase):
    def execute(self, sql: str, params: Any = None) -> None:
        super().execute(sql, params)
        normalized = " ".join(sql.split())
        if "from public.ml_analysis_jobs j" in normalized and "for update" in normalized:
            assert self.last_one is not None
            self.last_one.update(
                {
                    "engine": "faceatlas",
                    "operation": "quality_assessment",
                    "module": "faceatlas",
                    "task": "quality_assessment",
                    "input_record_refs": [
                        {"table": "face_scans", "id": FACE_SCAN_ID}
                    ],
                    "features": {"images": [{"record_id": FACE_SCAN_ID}]},
                }
            )
        elif "from public.face_scans" in normalized:
            self.last_all = [
                {
                    "id": FACE_SCAN_ID,
                    "angle": "front",
                    "image_quality": {
                        "width": 1280,
                        "height": 960,
                        "bytes": 512_000,
                        "mean_brightness": 0.5,
                        "contrast": 0.2,
                        "laplacian_variance": 120,
                    },
                }
            ]
        elif "from public.annotations" in normalized:
            self.last_all = [
                {
                    "id": ANNOTATION_ID,
                    "scan_id": FACE_SCAN_ID,
                    "lesion_type": "papule",
                    "zone": "left_cheek",
                    "x": 0.1,
                    "y": 0.2,
                    "w": 0.05,
                    "h": 0.05,
                    "confidence": 0.8,
                    "source": "user",
                    "created_at": "2026-07-15T00:00:00+00:00",
                }
            ]


def test_prepare_locks_stored_job_and_rebuilds_owner_scoped_inputs() -> None:
    database = ScriptedDatabase()
    repository = PostgresAnalysisRepository(
        "postgresql://unused", connect_factory=database.connect
    )

    reservation = repository.prepare(request(), "hash-1")

    assert reservation.state == "reserved"
    assert reservation.request is not None
    assert len(reservation.request.inputs["records"]) == 7
    assert reservation.request.inputs["records"][0]["date"] == "2026-07-01"
    assert reservation.request.input_record_refs == [f"sleep_logs:{SLEEP_ID}"]
    assert "forged" not in str(reservation.request.inputs)
    owner_query = next(
        item for item in database.executed if "from public.sleep_logs" in item[0]
    )
    assert "user_id=%s::uuid" in owner_query[0]
    assert owner_query[1][0] == USER_ID


def test_faceatlas_uses_stored_quality_and_owner_scoped_annotations() -> None:
    database = FaceAtlasDatabase()
    repository = PostgresAnalysisRepository(
        "postgresql://unused", connect_factory=database.connect
    )

    reservation = repository.prepare(faceatlas_request(), "hash-1")

    assert reservation.request is not None
    assert reservation.request.inputs["images"] == [
        {
            "record_id": FACE_SCAN_ID,
            "angle": "front",
            "width": 1280,
            "height": 960,
            "bytes": 512_000,
            "mean_brightness": 0.5,
            "contrast": 0.2,
            "laplacian_variance": 120,
        }
    ]
    assert reservation.request.inputs["annotations"] == [
        {
            "annotation_id": ANNOTATION_ID,
            "record_id": FACE_SCAN_ID,
            "lesion_type": "papule",
            "zone": "left_cheek",
            "x": 0.1,
            "y": 0.2,
            "w": 0.05,
            "h": 0.05,
            "confidence": 0.8,
            "source": "user",
            "created_at": "2026-07-15T00:00:00+00:00",
        }
    ]
    assert "forged" not in str(reservation.request.inputs)
    annotation_query = next(
        item for item in database.executed if "from public.annotations" in item[0]
    )
    assert "user_id=%s::uuid" in annotation_query[0]
    assert annotation_query[1] == (USER_ID, [FACE_SCAN_ID])


@pytest.mark.parametrize(
    ("stored_request_id", "stored_idempotency_key", "expected_code"),
    [
        (
            "22222222-2222-4222-8222-222222222222",
            JOB_ID,
            "stored_job_request_id_mismatch",
        ),
        (
            JOB_ID,
            "22222222-2222-4222-8222-222222222222",
            "stored_job_idempotency_key_mismatch",
        ),
    ],
)
def test_prepare_rejects_stored_row_identity_disagreement(
    stored_request_id: str,
    stored_idempotency_key: str,
    expected_code: str,
) -> None:
    database = ScriptedDatabase(
        stored_request_id=stored_request_id,
        stored_idempotency_key=stored_idempotency_key,
    )
    repository = PostgresAnalysisRepository(
        "postgresql://unused", connect_factory=database.connect
    )

    with pytest.raises(PersistenceRejected, match=expected_code):
        repository.prepare(request(), "hash-1")

    locked_job_query = next(
        sql
        for sql, _params in database.executed
        if "from public.ml_analysis_jobs j" in sql and "for update" in sql
    )
    assert "j.request_id::text as request_id" in locked_job_query
    assert "j.idempotency_key" in locked_job_query
    assert not any(
        "insert into public.ml_service_idempotency" in sql
        for sql, _params in database.executed
    )


def test_finalize_commits_lineage_job_state_and_replay_record_before_readback() -> None:
    database = ScriptedDatabase()
    repository = PostgresAnalysisRepository(
        "postgresql://unused", connect_factory=database.connect
    )
    reservation = repository.prepare(request(), "hash-1")
    assert reservation.request is not None

    body = repository.finalize(
        reservation, _predict_core(reservation.request), "hash-1"
    )

    assert body["job_id"] == JOB_ID
    statements = [sql for sql, _params in database.executed]
    result_index = next(
        index
        for index, sql in enumerate(statements)
        if "insert into public.ml_analysis_results" in sql
    )
    job_index = next(
        index
        for index, sql in enumerate(statements)
        if "update public.ml_analysis_jobs" in sql and "status=%s" in sql
    )
    replay_index = next(
        index
        for index, sql in enumerate(statements)
        if "update public.ml_service_idempotency" in sql and "response_reference" in sql
    )
    readback_index = next(
        index
        for index, sql in enumerate(statements)
        if "select j.status, r.id as result_id" in sql
    )
    assert result_index < job_index < replay_index < readback_index
    assert any("insert into public.ml_feature_snapshots" in sql for sql in statements)
    assert any("insert into public.intelligence_events" in sql for sql in statements)
    assert any(
        "on conflict (source_job_id) where source_job_id is not null do nothing"
        in sql
        for sql in statements
    )
    assert database.commits >= 3


def test_prepare_replays_the_committed_canonical_response() -> None:
    database = ScriptedDatabase(replay=True)
    repository = PostgresAnalysisRepository(
        "postgresql://unused", connect_factory=database.connect
    )

    reservation = repository.prepare(request(), "hash-1")

    assert reservation.state == "replay"
    assert reservation.response_status == 200
    assert reservation.response == {
        "ok": True,
        "request_id": JOB_ID,
        "job_id": JOB_ID,
    }
    assert not any(
        "from public.sleep_logs" in sql for sql, _params in database.executed
    )


def test_verified_database_ca_is_written_privately_and_used_by_psycopg() -> None:
    certificate = (
        "-----BEGIN CERTIFICATE-----\ntrusted-test-ca\n-----END CERTIFICATE-----"
    )
    repository = PostgresAnalysisRepository(
        "postgresql://example.invalid/db?sslmode=verify-full&sslrootcert=missing",
        ca_certificate=certificate.replace("\n", "\\n"),
    )

    parameters = repository._connection_parameters()
    certificate_path = Path(parameters["sslrootcert"])

    try:
        assert parameters["sslmode"] == "verify-full"
        assert certificate_path.read_text(encoding="utf-8") == certificate
        if os.name == "posix":
            assert stat.S_IMODE(certificate_path.stat().st_mode) & 0o077 == 0
    finally:
        repository.close()
    assert not certificate_path.exists()


def test_terminalize_marks_the_job_failed_once_under_a_row_lock() -> None:
    database = ScriptedDatabase()
    repository = PostgresAnalysisRepository(
        "postgresql://unused", connect_factory=database.connect
    )

    first = repository.terminalize(JOB_ID, code="ml_api_timeout")
    second = repository.terminalize(JOB_ID, code="ml_api_timeout")

    assert first == {"job_id": JOB_ID, "status": "failed", "terminalized": True}
    assert second == {"job_id": JOB_ID, "status": "failed", "terminalized": False}
    statements = [sql for sql, _params in database.executed]
    assert sum("dead_lettered_at" in sql for sql in statements) == 1
    assert sum("ml_analysis_terminalized" in sql for sql in statements) == 1
    assert all(
        "for update" in sql
        for sql in statements
        if "select j.id::text as id, j.status" in sql
    )
