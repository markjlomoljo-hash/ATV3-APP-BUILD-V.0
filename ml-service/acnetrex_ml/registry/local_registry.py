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

    @staticmethod
    def verify_checksum_manifest(manifest_path: str | Path) -> dict[str, Any]:
        path = Path(manifest_path).resolve()
        missing: list[str] = []
        mismatched: list[str] = []
        try:
            payload = json.loads(path.read_text(encoding="utf-8"))
            artifacts = payload["artifacts"]
            if payload.get("algorithm") != "sha256" or not isinstance(artifacts, dict):
                raise ValueError("invalid checksum manifest")
            base = (path.parent / str(payload.get("base_path", "."))).resolve()
            for relative, expected in sorted(artifacts.items()):
                artifact = (base / relative).resolve()
                if not artifact.is_relative_to(base) or not artifact.is_file():
                    missing.append(str(relative))
                    continue
                if not isinstance(expected, str) or len(expected) != 64:
                    mismatched.append(str(relative))
                    continue
                if not LocalModelRegistry.verify_artifact(artifact, expected):
                    mismatched.append(str(relative))
        except (KeyError, OSError, TypeError, ValueError, json.JSONDecodeError):
            missing = ["checksum_manifest"]
            mismatched = []
        return {
            "state": "ready" if not missing and not mismatched else "error",
            "missing": missing,
            "mismatched": mismatched,
        }

    def summary(self) -> dict[str, Any]:
        entries = self.load()
        return {
            "count": len(entries),
            "active": [item.model_name for item in entries if item.status == "active"],
            "approved": [
                item.model_name for item in entries if item.status == "approved"
            ],
        }
