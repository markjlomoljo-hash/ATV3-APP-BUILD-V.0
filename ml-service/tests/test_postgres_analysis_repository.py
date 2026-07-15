from __future__ import annotations

from typing import Any
from uuid import uuid4

from acnetrex_ml.contracts.requests import InferenceRequest
from acnetrex_ml.service.app import _predict_core
from acnetrex_ml.service.persistence import PostgresAnalysisRepository


JOB_ID = "11111111-1111-4111-8111-111111111112"
USER_ID = "11111111-1111-4111-8111-111111111113"
SLEEP_ID = "11111111-1111-4111-8111-111111111115"
RESULT_ID = "11111111-1111-4111-8111-111111111119"


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


class ScriptedDatabase:
    def __init__(self, *, replay: bool = False) -> None:
        self.replay = replay
        self.executed: list[tuple[str, Any]] = []
        self.last_one: Any = None
        self.last_all: list[Any] = []
        self.rowcount = 1
        self.commits = 0
        self.rollbacks = 0

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
        if "from public.ml_analysis_jobs j" in normalized and "for update" in normalized:
            self.last_one = {
                "id": JOB_ID,
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
        elif "insert into public.ml_service_idempotency" in normalized:
            self.last_one = None if self.replay else {"scope": "direct:sleepderm:sleep_pattern_analysis"}
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
        elif "update public.ml_analysis_jobs" in normalized and "returning id" in normalized:
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


def test_finalize_commits_lineage_job_state_and_replay_record_before_readback() -> None:
    database = ScriptedDatabase()
    repository = PostgresAnalysisRepository(
        "postgresql://unused", connect_factory=database.connect
    )
    reservation = repository.prepare(request(), "hash-1")
    assert reservation.request is not None

    body = repository.finalize(reservation, _predict_core(reservation.request), "hash-1")

    assert body["job_id"] == JOB_ID
    statements = [sql for sql, _params in database.executed]
    result_index = next(
        index for index, sql in enumerate(statements) if "insert into public.ml_analysis_results" in sql
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
        index for index, sql in enumerate(statements) if "select j.status, r.id as result_id" in sql
    )
    assert result_index < job_index < replay_index < readback_index
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
    assert not any("from public.sleep_logs" in sql for sql, _params in database.executed)
