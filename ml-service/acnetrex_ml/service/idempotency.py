from __future__ import annotations

import hashlib
import json
import logging
import sqlite3
import threading
from dataclasses import dataclass
from collections.abc import Callable
from datetime import UTC, datetime, timedelta
from pathlib import Path
from typing import Any, Protocol


LOGGER = logging.getLogger(__name__)


def _connection_error_category(error: Exception) -> str:
    """Return a bounded diagnostic category without exposing exception details."""
    message = str(error).lower()
    categories = (
        ("authentication", ("password authentication failed", "authentication failed")),
        ("dns", ("could not translate host name", "name or service not known")),
        ("tls", ("certificate", "ssl", "tls")),
        ("pool_exhausted", ("remaining connection slots", "too many connections")),
        ("timeout", ("timeout", "timed out")),
        (
            "network",
            ("network is unreachable", "connection refused", "no route to host"),
        ),
    )
    for category, markers in categories:
        if any(marker in message for marker in markers):
            return category
    return "other"


def canonical_hash(payload: dict[str, Any]) -> str:
    canonical = json.dumps(
        payload, sort_keys=True, separators=(",", ":"), ensure_ascii=False, default=str
    )
    return hashlib.sha256(canonical.encode("utf-8")).hexdigest()


@dataclass(frozen=True)
class Reservation:
    state: str
    response_status: int | None = None
    response: dict[str, Any] | None = None


class IdempotencyStore(Protocol):
    def healthcheck(self) -> bool: ...

    def reserve(self, key: str, request_hash: str, scope: str) -> Reservation: ...

    def complete(
        self, key: str, scope: str, status: int, response: dict[str, Any]
    ) -> None: ...

    def fail(
        self,
        key: str,
        scope: str,
        *,
        terminal: bool,
        status: int,
        response: dict[str, Any],
    ) -> None: ...


class MemoryIdempotencyStore:
    """Process-local duplicate suppression for the stateless inference API."""

    def __init__(
        self,
        *,
        clock: Callable[[], datetime] | None = None,
        processing_timeout_seconds: int = 120,
    ) -> None:
        self._items: dict[tuple[str, str], dict[str, Any]] = {}
        self._lock = threading.Lock()
        self._clock = clock or (lambda: datetime.now(UTC))
        self._processing_timeout = timedelta(
            seconds=max(1, min(processing_timeout_seconds, 3_600))
        )

    def healthcheck(self) -> bool:
        return True

    def reserve(self, key: str, request_hash: str, scope: str) -> Reservation:
        with self._lock:
            now = self._clock()
            item = self._items.get((scope, key))
            if item is None:
                self._items[(scope, key)] = {
                    "hash": request_hash,
                    "state": "processing",
                    "updated_at": now,
                }
                return Reservation("reserved")
            if item["hash"] != request_hash:
                return Reservation("conflict")
            if item["state"] == "completed":
                return Reservation("replay", item["status"], item["response"])
            if item["state"] == "failed_terminal":
                return Reservation("replay", item["status"], item["response"])
            if item["state"] == "failed_retryable":
                item["state"] = "processing"
                item["updated_at"] = now
                return Reservation("reserved")
            if (
                item["state"] == "processing"
                and now - item["updated_at"] > self._processing_timeout
            ):
                item["updated_at"] = now
                return Reservation("reserved")
            return Reservation("processing")

    def complete(
        self, key: str, scope: str, status: int, response: dict[str, Any]
    ) -> None:
        with self._lock:
            self._items[(scope, key)].update(
                state="completed",
                status=status,
                response=response,
                updated_at=self._clock(),
            )

    def fail(
        self,
        key: str,
        scope: str,
        *,
        terminal: bool,
        status: int,
        response: dict[str, Any],
    ) -> None:
        with self._lock:
            self._items[(scope, key)].update(
                state="failed_terminal" if terminal else "failed_retryable",
                status=status,
                response=response,
                updated_at=self._clock(),
            )


class SQLiteIdempotencyStore:
    def __init__(
        self, path: str | Path, *, processing_timeout_seconds: int = 120
    ) -> None:
        self.path = str(path)
        self._lock = threading.Lock()
        self._processing_timeout = timedelta(
            seconds=max(1, min(processing_timeout_seconds, 3_600))
        )
        self._initialize()

    def _connect(self) -> sqlite3.Connection:
        connection = sqlite3.connect(self.path, timeout=10, isolation_level=None)
        connection.row_factory = sqlite3.Row
        return connection

    def healthcheck(self) -> bool:
        try:
            with self._connect() as connection:
                return connection.execute("SELECT 1").fetchone()[0] == 1
        except sqlite3.Error:
            return False

    def _initialize(self) -> None:
        with self._connect() as connection:
            connection.execute("PRAGMA journal_mode=WAL")
            connection.execute(
                """
                CREATE TABLE IF NOT EXISTS prediction_idempotency (
                    scope TEXT NOT NULL,
                    idempotency_key TEXT NOT NULL,
                    request_hash TEXT NOT NULL,
                    state TEXT NOT NULL,
                    response_status INTEGER,
                    response_json TEXT,
                    created_at TEXT NOT NULL,
                    updated_at TEXT NOT NULL,
                    PRIMARY KEY (scope, idempotency_key)
                )
                """
            )

    def reserve(self, key: str, request_hash: str, scope: str) -> Reservation:
        now_datetime = datetime.now(UTC)
        now = now_datetime.isoformat()
        with self._lock, self._connect() as connection:
            connection.execute("BEGIN IMMEDIATE")
            row = connection.execute(
                "SELECT * FROM prediction_idempotency WHERE scope = ? AND idempotency_key = ?",
                (scope, key),
            ).fetchone()
            if row is None:
                connection.execute(
                    """INSERT INTO prediction_idempotency
                    VALUES (?, ?, ?, 'processing', NULL, NULL, ?, ?)""",
                    (scope, key, request_hash, now, now),
                )
                connection.commit()
                return Reservation("reserved")
            connection.commit()
            if row["request_hash"] != request_hash:
                return Reservation("conflict")
            if row["state"] == "completed":
                response = (
                    json.loads(row["response_json"]) if row["response_json"] else None
                )
                return Reservation("replay", row["response_status"], response)
            if row["state"] == "failed_terminal":
                response = (
                    json.loads(row["response_json"]) if row["response_json"] else None
                )
                return Reservation("replay", row["response_status"], response)
            if row["state"] == "failed_retryable":
                connection.execute(
                    """UPDATE prediction_idempotency SET state='processing', updated_at=?
                    WHERE scope=? AND idempotency_key=?""",
                    (now, scope, key),
                )
                connection.commit()
                return Reservation("reserved")
            if row["state"] == "processing":
                updated_at = datetime.fromisoformat(row["updated_at"])
                if now_datetime - updated_at > self._processing_timeout:
                    connection.execute(
                        """UPDATE prediction_idempotency SET updated_at=?
                        WHERE scope=? AND idempotency_key=? AND state='processing'""",
                        (now, scope, key),
                    )
                    connection.commit()
                    return Reservation("reserved")
            return Reservation("processing")

    def complete(
        self, key: str, scope: str, status: int, response: dict[str, Any]
    ) -> None:
        now = datetime.now(UTC).isoformat()
        with self._connect() as connection:
            connection.execute(
                """UPDATE prediction_idempotency
                SET state='completed', response_status=?, response_json=?, updated_at=?
                WHERE scope=? AND idempotency_key=?""",
                (status, json.dumps(response, default=str), now, scope, key),
            )

    def fail(
        self,
        key: str,
        scope: str,
        *,
        terminal: bool,
        status: int,
        response: dict[str, Any],
    ) -> None:
        state = "failed_terminal" if terminal else "failed_retryable"
        with self._connect() as connection:
            connection.execute(
                """UPDATE prediction_idempotency SET state=?, response_status=?, response_json=?,
                updated_at=?
                WHERE scope=? AND idempotency_key=?""",
                (
                    state,
                    status,
                    json.dumps(response, default=str),
                    datetime.now(UTC).isoformat(),
                    scope,
                    key,
                ),
            )


class PostgresIdempotencyStore:
    """Production adapter for the server-only ml_service_idempotency table."""

    def __init__(
        self, connection_string: str, *, processing_timeout_seconds: int = 120
    ) -> None:
        self.connection_string = connection_string
        self.processing_timeout_seconds = max(1, min(processing_timeout_seconds, 3_600))

    def _connect(self) -> Any:
        try:
            import psycopg  # type: ignore[import-not-found]
        except ImportError as exc:
            raise RuntimeError(
                "Install the postgres extra to use PostgresIdempotencyStore"
            ) from exc
        return psycopg.connect(self.connection_string)

    def healthcheck(self) -> bool:
        try:
            with self._connect() as connection, connection.cursor() as cursor:
                cursor.execute("SELECT 1")
                return cursor.fetchone()[0] == 1
        except Exception as error:
            LOGGER.warning(
                "postgres_idempotency_healthcheck_failed error_type=%s sqlstate=%s category=%s",
                type(error).__name__,
                getattr(error, "sqlstate", None),
                _connection_error_category(error),
            )
            return False

    def reserve(self, key: str, request_hash: str, scope: str) -> Reservation:
        with self._connect() as connection, connection.cursor() as cursor:
            cursor.execute(
                """
                INSERT INTO ml_service_idempotency
                  (scope, idempotency_key, request_hash, status, expires_at)
                VALUES (%s, %s, %s, 'processing', now() + interval '24 hours')
                ON CONFLICT (scope, idempotency_key) DO NOTHING
                RETURNING scope
                """,
                (scope, key, request_hash),
            )
            if cursor.fetchone() is not None:
                return Reservation("reserved")
            cursor.execute(
                """SELECT request_hash, status, response_status, response_reference,
                  (status='processing' and updated_at < now() - (%s * interval '1 second'))
                    as processing_expired
                FROM ml_service_idempotency
                WHERE scope=%s AND idempotency_key=%s FOR UPDATE""",
                (self.processing_timeout_seconds, scope, key),
            )
            row = cursor.fetchone()
            if row[0] != request_hash:
                return Reservation("conflict")
            if row[1] == "completed":
                return Reservation("replay", row[2], row[3])
            if row[1] == "failed_terminal":
                return Reservation("replay", row[2], row[3])
            if row[1] == "failed_retryable" or (row[1] == "processing" and row[4]):
                cursor.execute(
                    """UPDATE ml_service_idempotency SET status='processing',
                    response_status=null, response_reference='{}'::jsonb,
                    expires_at=now() + interval '24 hours', updated_at=now()
                    WHERE scope=%s AND idempotency_key=%s""",
                    (scope, key),
                )
                return Reservation("reserved")
            return Reservation("processing")

    def complete(
        self, key: str, scope: str, status: int, response: dict[str, Any]
    ) -> None:
        with self._connect() as connection, connection.cursor() as cursor:
            cursor.execute(
                """UPDATE ml_service_idempotency SET status='completed', response_status=%s,
                response_reference=%s, completed_at=now(), updated_at=now()
                WHERE scope=%s AND idempotency_key=%s""",
                (status, json.dumps(response, default=str), scope, key),
            )

    def fail(
        self,
        key: str,
        scope: str,
        *,
        terminal: bool,
        status: int,
        response: dict[str, Any],
    ) -> None:
        state = "failed_terminal" if terminal else "failed_retryable"
        with self._connect() as connection, connection.cursor() as cursor:
            cursor.execute(
                """UPDATE ml_service_idempotency SET status=%s, response_status=%s,
                response_reference=%s, updated_at=now()
                WHERE scope=%s AND idempotency_key=%s""",
                (state, status, json.dumps(response, default=str), scope, key),
            )
