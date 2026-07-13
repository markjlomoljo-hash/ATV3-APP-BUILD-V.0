from __future__ import annotations

import hashlib
import json
from pathlib import Path
from typing import Any

from acnetrex_ml.contracts.models import ModelManifestEntry


class LocalModelRegistry:
    def __init__(self, manifest_path: str | Path) -> None:
        self.manifest_path = Path(manifest_path)

    def load(self) -> list[ModelManifestEntry]:
        if not self.manifest_path.exists():
            return []
        payload = json.loads(self.manifest_path.read_text(encoding="utf-8"))
        entries = (
            payload.get("models", payload) if isinstance(payload, dict) else payload
        )
        return [ModelManifestEntry.model_validate(item) for item in entries]

    def selectable(self, task: str) -> list[ModelManifestEntry]:
        return [
            entry
            for entry in self.load()
            if entry.task == task and entry.status in {"approved", "active"}
        ]

    @staticmethod
    def verify_artifact(path: str | Path, expected_sha256: str) -> bool:
        digest = hashlib.sha256(Path(path).read_bytes()).hexdigest()
        return digest == expected_sha256.lower()

    def summary(self) -> dict[str, Any]:
        entries = self.load()
        return {
            "count": len(entries),
            "active": [item.model_name for item in entries if item.status == "active"],
            "approved": [
                item.model_name for item in entries if item.status == "approved"
            ],
        }
