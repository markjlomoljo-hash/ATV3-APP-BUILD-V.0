from __future__ import annotations

import json
import logging
import sqlite3
from datetime import UTC, datetime
from pathlib import Path
from typing import Any, Protocol


LOGGER = logging.getLogger(__name__)


class JobStore(Protocol):
    def healthcheck(self) -> bool: ...

    def create(
        self, job_id: str, key: str, request_hash: str, request: dict[str, Any]
    ) -> tuple[str, dict[str, Any]]: ...

    def get(self, job_id: str) -> dict[str, Any] | None: ...

    def complete(self, job_id: str, result: dict[str, Any]) -> None: ...

    def fail(self, job_id: str, result: dict[str, Any]) -> None: ...


class SQLiteJobStore:
    def __init__(self, path: str | Path) -> None:
        self.path = str(path)
        with sqlite3.connect(self.path) as connection:
            connection.execute(
                """CREATE TABLE IF NOT EXISTS prediction_jobs (
                job_id TEXT PRIMARY KEY, idempotency_key TEXT UNIQUE NOT NULL,
                request_hash TEXT NOT NULL, status TEXT NOT NULL, request_json TEXT NOT NULL,
                result_json TEXT, created_at TEXT NOT NULL, updated_at TEXT NOT NULL)"""
            )

    def create(
        self, job_id: str, key: str, request_hash: str, request: dict[str, Any]
    ) -> tuple[str, dict[str, Any]]:
        now = datetime.now(UTC).isoformat()
        with sqlite3.connect(self.path) as connection:
            connection.row_factory = sqlite3.Row
            row = connection.execute(
                "SELECT * FROM prediction_jobs WHERE idempotency_key=?", (key,)
            ).fetchone()
            if row:
                if row["request_hash"] != request_hash:
                    return "conflict", dict(row)
                return "replay", dict(row)
            connection.execute(
                "INSERT INTO prediction_jobs VALUES (?, ?, ?, 'queued', ?, NULL, ?, ?)",
                (job_id, key, request_hash, json.dumps(request, default=str), now, now),
            )
        return "created", {"job_id": job_id, "status": "queued", "created_at": now}

    def healthcheck(self) -> bool:
        try:
            with sqlite3.connect(self.path) as connection:
                return connection.execute("SELECT 1").fetchone()[0] == 1
        except sqlite3.Error:
            return False

    def get(self, job_id: str) -> dict[str, Any] | None:
        with sqlite3.connect(self.path) as connection:
            connection.row_factory = sqlite3.Row
            row = connection.execute(
                "SELECT * FROM prediction_jobs WHERE job_id=?", (job_id,)
            ).fetchone()
            if not row:
                return None
            item = dict(row)
            item.pop("request_json", None)
            item["result"] = (
                json.loads(item.pop("result_json")) if item.get("result_json") else None
            )
            return item

    def complete(self, job_id: str, result: dict[str, Any]) -> None:
        with sqlite3.connect(self.path) as connection:
            connection.execute(
                """UPDATE prediction_jobs
                SET status='completed', result_json=?, updated_at=? WHERE job_id=?""",
                (
                    json.dumps(result, default=str),
                    datetime.now(UTC).isoformat(),
                    job_id,
                ),
            )

    def fail(self, job_id: str, result: dict[str, Any]) -> None:
        with sqlite3.connect(self.path) as connection:
            connection.execute(
                """UPDATE prediction_jobs
                SET status='failed', result_json=?, updated_at=? WHERE job_id=?""",
                (
                    json.dumps(result, default=str),
                    datetime.now(UTC).isoformat(),
                    job_id,
                ),
            )


class PostgresJobStore:
    """Production adapter for the integration-owned ml_service_jobs table."""

    def __init__(self, connection_string: str) -> None:
        self.connection_string = connection_string

    def _connect(self) -> Any:
        try:
            import psycopg  # type: ignore[import-not-found]
        except ImportError as exc:
            raise RuntimeError(
                "Install the postgres extra for PostgresJobStore"
            ) from exc
        return psycopg.connect(self.connection_string)

    def healthcheck(self) -> bool:
        try:
            with self._connect() as connection, connection.cursor() as cursor:
                cursor.execute("SELECT 1")
                return cursor.fetchone()[0] == 1
        except Exception as error:
            LOGGER.warning(
                "postgres_job_healthcheck_failed error_type=%s sqlstate=%s",
                type(error).__name__,
                getattr(error, "sqlstate", None),
            )
            return False

    def create(
        self, job_id: str, key: str, request_hash: str, request: dict[str, Any]
    ) -> tuple[str, dict[str, Any]]:
        with self._connect() as connection, connection.cursor() as cursor:
            cursor.execute(
                """INSERT INTO ml_service_jobs
                (job_id, idempotency_key, request_hash, status, request_json,
                 created_at, updated_at)
                VALUES (%s, %s, %s, 'queued', %s, now(), now())
                ON CONFLICT (idempotency_key) DO NOTHING RETURNING job_id, status, created_at""",
                (job_id, key, request_hash, json.dumps(request, default=str)),
            )
            created = cursor.fetchone()
            if created:
                return "created", {
                    "job_id": str(created[0]),
                    "status": str(created[1]),
                    "created_at": created[2].isoformat(),
                }
            cursor.execute(
                """SELECT job_id, request_hash, status, created_at
                FROM ml_service_jobs WHERE idempotency_key=%s FOR UPDATE""",
                (key,),
            )
            row = cursor.fetchone()
            if row[1] != request_hash:
                return "conflict", {"job_id": str(row[0]), "status": str(row[2])}
            return "replay", {
                "job_id": str(row[0]),
                "status": str(row[2]),
                "created_at": row[3].isoformat(),
            }

    def get(self, job_id: str) -> dict[str, Any] | None:
        with self._connect() as connection, connection.cursor() as cursor:
            cursor.execute(
                """SELECT job_id, status, result_json, created_at, updated_at
                FROM ml_service_jobs WHERE job_id=%s""",
                (job_id,),
            )
            row = cursor.fetchone()
            if not row:
                return None
            return {
                "job_id": str(row[0]),
                "status": str(row[1]),
                "result": row[2],
                "created_at": row[3].isoformat(),
                "updated_at": row[4].isoformat(),
            }

    def complete(self, job_id: str, result: dict[str, Any]) -> None:
        with self._connect() as connection, connection.cursor() as cursor:
            cursor.execute(
                """UPDATE ml_service_jobs
                SET status='completed', result_json=%s, updated_at=now()
                WHERE job_id=%s""",
                (json.dumps(result, default=str), job_id),
            )

    def fail(self, job_id: str, result: dict[str, Any]) -> None:
        with self._connect() as connection, connection.cursor() as cursor:
            cursor.execute(
                """UPDATE ml_service_jobs
                SET status='failed', result_json=%s, updated_at=now()
                WHERE job_id=%s""",
                (json.dumps(result, default=str), job_id),
            )
