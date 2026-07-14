from __future__ import annotations

import random
import threading
import time
from collections.abc import Callable
from dataclasses import dataclass
from typing import TypeVar

T = TypeVar("T")


class CircuitOpenError(RuntimeError):
    pass


@dataclass(frozen=True)
class RetryPolicy:
    max_attempts: int = 3
    base_delay_seconds: float = 0.25
    max_delay_seconds: float = 2.0


class CircuitBreaker:
    def __init__(
        self, failure_threshold: int = 5, recovery_seconds: float = 30.0
    ) -> None:
        self.failure_threshold = failure_threshold
        self.recovery_seconds = recovery_seconds
        self._failures = 0
        self._opened_at: float | None = None
        self._half_open_in_flight = False
        self._lock = threading.Lock()

    @property
    def state(self) -> str:
        with self._lock:
            if self._opened_at is None:
                return "closed"
            if time.monotonic() - self._opened_at >= self.recovery_seconds:
                return "half_open"
            return "open"

    def before_call(self) -> None:
        with self._lock:
            if self._opened_at is None:
                return
            if time.monotonic() - self._opened_at < self.recovery_seconds:
                raise CircuitOpenError("dependency_circuit_open")
            if self._half_open_in_flight:
                raise CircuitOpenError("dependency_half_open_probe_in_progress")
            self._half_open_in_flight = True

    def success(self) -> None:
        with self._lock:
            self._failures = 0
            self._opened_at = None
            self._half_open_in_flight = False

    def failure(self) -> None:
        with self._lock:
            self._failures += 1
            self._half_open_in_flight = False
            if self._failures >= self.failure_threshold:
                self._opened_at = time.monotonic()


def full_jitter_delay(
    policy: RetryPolicy, attempt: int, rng: Callable[[], float] = random.random
) -> float:  # noqa: S311 - scheduling jitter, not security
    ceiling: float = min(
        policy.max_delay_seconds,
        policy.base_delay_seconds * float(2 ** max(0, attempt - 1)),
    )
    return float(rng()) * ceiling


def run_with_retry(
    operation: Callable[[], T],
    *,
    retryable: Callable[[Exception], bool],
    policy: RetryPolicy,
    circuit: CircuitBreaker,
    sleep: Callable[[float], None] = time.sleep,
) -> T:
    circuit.before_call()
    for attempt in range(1, policy.max_attempts + 1):
        try:
            result = operation()
            circuit.success()
            return result
        except Exception as exc:
            if not retryable(exc) or attempt >= policy.max_attempts:
                circuit.failure()
                raise
            sleep(full_jitter_delay(policy, attempt))
    raise AssertionError("unreachable")
