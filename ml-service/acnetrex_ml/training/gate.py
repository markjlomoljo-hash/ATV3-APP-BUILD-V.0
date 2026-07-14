from __future__ import annotations

import argparse
import json
import re
from pathlib import Path
from typing import Any


SHA256 = re.compile(r"^[0-9a-f]{64}$")


class TrainingBlocked(RuntimeError):
    """Raised when no governed immutable dataset can enter a training pipeline."""


def _is_governed(candidate: dict[str, Any], task: str) -> bool:
    return (
        candidate.get("status") == "approved"
        and task in candidate.get("allowed_tasks", [])
        and candidate.get("synthetic") is False
        and candidate.get("license_status") == "approved"
        and candidate.get("consent_status") == "approved"
        and candidate.get("deidentification_status") == "verified"
        and candidate.get("phi_review_status") == "passed"
        and str(candidate.get("snapshot_uri", "")).startswith("gs://")
        and SHA256.fullmatch(str(candidate.get("snapshot_sha256", ""))) is not None
        and SHA256.fullmatch(str(candidate.get("split_manifest_sha256", "")))
        is not None
        and bool(str(candidate.get("name", "")).strip())
        and bool(str(candidate.get("version", "")).strip())
    )


def prepare_training_run(manifest_path: str | Path, *, task: str) -> dict[str, Any]:
    if not re.fullmatch(r"[a-z0-9_-]{2,96}", task):
        raise TrainingBlocked("invalid_task")
    try:
        payload = json.loads(Path(manifest_path).read_text(encoding="utf-8"))
        candidates = payload["training_eligible_datasets"]
    except (KeyError, OSError, TypeError, ValueError, json.JSONDecodeError) as exc:
        raise TrainingBlocked("dataset_manifest_invalid") from exc
    if not isinstance(candidates, list):
        raise TrainingBlocked("dataset_manifest_invalid")
    matching = [
        item
        for item in candidates
        if isinstance(item, dict) and task in item.get("allowed_tasks", [])
    ]
    if not matching:
        raise TrainingBlocked("no_approved_training_dataset")
    governed = [item for item in matching if _is_governed(item, task)]
    if not governed:
        raise TrainingBlocked("dataset_governance_incomplete")
    selected = sorted(
        governed, key=lambda item: (str(item["name"]), str(item["version"]))
    )[0]
    return {
        "state": "ready_for_training_pipeline",
        "task": task,
        "dataset_name": str(selected["name"]),
        "dataset_version": str(selected["version"]),
        "snapshot_uri": str(selected["snapshot_uri"]),
        "snapshot_sha256": str(selected["snapshot_sha256"]),
        "split_manifest_sha256": str(selected["split_manifest_sha256"]),
        "automatic_promotion": False,
    }


def main() -> int:
    parser = argparse.ArgumentParser(description="Prepare a governed ML training run")
    parser.add_argument("--manifest", required=True)
    parser.add_argument("--task", required=True)
    args = parser.parse_args()
    try:
        result = prepare_training_run(args.manifest, task=args.task)
    except TrainingBlocked as exc:
        print(
            json.dumps({"ok": False, "state": "training_blocked", "reason": str(exc)})
        )
        return 2
    print(json.dumps({"ok": True, **result}, sort_keys=True))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
