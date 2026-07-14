from __future__ import annotations

import re

TRACEPARENT = re.compile(r"^00-[0-9a-f]{32}-[0-9a-f]{16}-0[01]$")


def valid_traceparent(value: str | None) -> str | None:
    if value is None:
        return None
    normalized = value.lower()
    return normalized if TRACEPARENT.fullmatch(normalized) else None
