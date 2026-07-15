import sqlite3
from datetime import UTC, datetime, timedelta

from acnetrex_ml.service.idempotency import (
    MemoryIdempotencyStore,
    SQLiteIdempotencyStore,
)


def test_memory_store_reclaims_an_abandoned_processing_reservation() -> None:
    current = datetime(2026, 7, 14, tzinfo=UTC)
    store = MemoryIdempotencyStore(
        clock=lambda: current, processing_timeout_seconds=120
    )

    assert store.reserve("key", "hash", "predict").state == "reserved"
    assert store.reserve("key", "hash", "predict").state == "processing"

    current += timedelta(seconds=121)
    assert store.reserve("key", "hash", "predict").state == "reserved"


def test_sqlite_store_reclaims_an_abandoned_processing_reservation(tmp_path) -> None:
    database = tmp_path / "idempotency.sqlite3"
    store = SQLiteIdempotencyStore(database, processing_timeout_seconds=120)
    assert store.reserve("key", "hash", "predict").state == "reserved"

    stale = (datetime.now(UTC) - timedelta(seconds=121)).isoformat()
    with sqlite3.connect(database) as connection:
        connection.execute(
            "UPDATE prediction_idempotency SET updated_at=? WHERE scope=? AND idempotency_key=?",
            (stale, "predict", "key"),
        )

    assert store.reserve("key", "hash", "predict").state == "reserved"
