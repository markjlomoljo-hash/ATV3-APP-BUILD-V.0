from __future__ import annotations

import os

from .idempotency import (
    IdempotencyStore,
    MemoryIdempotencyStore,
    PostgresIdempotencyStore,
)


def build_idempotency_store() -> IdempotencyStore:
    postgres_url = os.getenv("IDEMPOTENCY_STORE_URL")
    if postgres_url and postgres_url.startswith(("postgres://", "postgresql://")):
        return PostgresIdempotencyStore(postgres_url)
    return MemoryIdempotencyStore()
