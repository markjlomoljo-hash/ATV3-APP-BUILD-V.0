from __future__ import annotations

import threading
from collections import Counter


class MetricsRegistry:
    def __init__(self) -> None:
        self._counts: Counter[str] = Counter()
        self._latencies: dict[str, list[float]] = {}
        self._lock = threading.Lock()

    def increment(self, name: str) -> None:
        with self._lock:
            self._counts[name] += 1

    def observe_latency(self, route: str, milliseconds: float) -> None:
        with self._lock:
            values = self._latencies.setdefault(route, [])
            values.append(milliseconds)
            if len(values) > 1000:
                del values[: len(values) - 1000]

    def snapshot(self) -> dict[str, object]:
        with self._lock:
            return {
                "counts": dict(self._counts),
                "latency_ms": {
                    route: {
                        "samples": len(values),
                        "average": sum(values) / len(values) if values else 0.0,
                        "maximum": max(values) if values else 0.0,
                    }
                    for route, values in self._latencies.items()
                },
            }


METRICS = MetricsRegistry()
