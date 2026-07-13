from __future__ import annotations

import json
from pathlib import Path

import pytest

from acnetrex_ml.training.gate import TrainingBlocked, prepare_training_run


def test_current_manifest_blocks_training_without_eligible_data() -> None:
    manifest = Path(__file__).resolve().parents[1] / "manifests/dataset-manifest.json"

    with pytest.raises(TrainingBlocked, match="no_approved_training_dataset"):
        prepare_training_run(manifest, task="flare_direction")


def test_training_plan_requires_immutable_governed_snapshot(tmp_path) -> None:
    manifest = tmp_path / "dataset.json"
    manifest.write_text(
        json.dumps(
            {
                "training_eligible_datasets": [
                    {
                        "name": "candidate",
                        "version": "1",
                        "status": "approved",
                        "allowed_tasks": ["flare_direction"],
                        "snapshot_uri": "gs://governed/snapshot.parquet",
                        "snapshot_sha256": "a" * 64,
                        "split_manifest_sha256": "b" * 64,
                        "license_status": "approved",
                        "consent_status": "approved",
                        "deidentification_status": "verified",
                        "phi_review_status": "passed",
                    }
                ]
            }
        ),
        encoding="utf-8",
    )

    plan = prepare_training_run(manifest, task="flare_direction")

    assert plan == {
        "state": "ready_for_training_pipeline",
        "task": "flare_direction",
        "dataset_name": "candidate",
        "dataset_version": "1",
        "snapshot_uri": "gs://governed/snapshot.parquet",
        "snapshot_sha256": "a" * 64,
        "split_manifest_sha256": "b" * 64,
        "automatic_promotion": False,
    }


def test_training_plan_rejects_synthetic_or_unreviewed_candidates(tmp_path) -> None:
    manifest = tmp_path / "dataset.json"
    manifest.write_text(
        json.dumps(
            {
                "training_eligible_datasets": [
                    {
                        "name": "synthetic-demo",
                        "version": "1",
                        "status": "approved",
                        "allowed_tasks": ["flare_direction"],
                        "synthetic": True,
                    }
                ]
            }
        ),
        encoding="utf-8",
    )

    with pytest.raises(TrainingBlocked, match="dataset_governance_incomplete"):
        prepare_training_run(manifest, task="flare_direction")
