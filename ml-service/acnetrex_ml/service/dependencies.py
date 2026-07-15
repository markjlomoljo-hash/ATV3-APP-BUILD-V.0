from __future__ import annotations

import os

from .idempotency import (
    IdempotencyStore,
    MemoryIdempotencyStore,
    PostgresIdempotencyStore,
)
from .persistence import PostgresAnalysisRepository


def build_idempotency_store() -> IdempotencyStore:
    postgres_url = os.getenv("IDEMPOTENCY_STORE_URL")
    if postgres_url and postgres_url.startswith(("postgres://", "postgresql://")):
        return PostgresIdempotencyStore(postgres_url)
    return MemoryIdempotencyStore()


def build_analysis_repository() -> PostgresAnalysisRepository | None:
    if os.getenv("ACNETREX_ML_PERSISTENCE_OWNER", "nextjs") != "railway":
        return None
    database_url = os.getenv("DATABASE_URL")
    if not database_url or not database_url.startswith(
        ("postgres://", "postgresql://")
    ):
        return None
    return PostgresAnalysisRepository(database_url)
