from __future__ import annotations

import os
import tempfile
from pathlib import Path

from .idempotency import (
    IdempotencyStore,
    PostgresIdempotencyStore,
    SQLiteIdempotencyStore,
)
from .jobs import JobStore, PostgresJobStore, SQLiteJobStore


def build_idempotency_store() -> IdempotencyStore:
    postgres_url = os.getenv("IDEMPOTENCY_STORE_URL") or os.getenv("DATABASE_URL")
    if postgres_url and postgres_url.startswith(("postgres://", "postgresql://")):
        return PostgresIdempotencyStore(postgres_url)
    if os.getenv("APP_ENV") == "production":
        raise RuntimeError("production_idempotency_store_not_configured")
    default_path = str(Path(tempfile.gettempdir()) / "acnetrex_ml_idempotency.sqlite3")
    sqlite_path = os.getenv("IDEMPOTENCY_SQLITE_PATH", default_path)
    Path(sqlite_path).parent.mkdir(parents=True, exist_ok=True)
    return SQLiteIdempotencyStore(sqlite_path)


def build_job_store() -> JobStore:
    postgres_url = os.getenv("JOBS_STORE_URL") or os.getenv("DATABASE_URL")
    if postgres_url and postgres_url.startswith(("postgres://", "postgresql://")):
        return PostgresJobStore(postgres_url)
    if os.getenv("APP_ENV") == "production":
        raise RuntimeError("production_job_store_not_configured")
    default_path = str(Path(tempfile.gettempdir()) / "acnetrex_ml_jobs.sqlite3")
    sqlite_path = os.getenv("JOBS_SQLITE_PATH", default_path)
    Path(sqlite_path).parent.mkdir(parents=True, exist_ok=True)
    return SQLiteJobStore(sqlite_path)
