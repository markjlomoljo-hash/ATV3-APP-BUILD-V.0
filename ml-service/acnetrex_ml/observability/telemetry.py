from __future__ import annotations

from collections.abc import Mapping
from typing import Any

SENSITIVE_KEYS = {
    "authorization",
    "token",
    "jwt",
    "secret",
    "database_url",
    "raw_image_url",
    "medical_free_text",
}


def sanitize_event(event: Mapping[str, Any]) -> dict[str, Any]:
    return {
        str(key): "[redacted]" if str(key).lower() in SENSITIVE_KEYS else value
        for key, value in event.items()
    }
