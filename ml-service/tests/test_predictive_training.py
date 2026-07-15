from __future__ import annotations

import hashlib
import json
from datetime import UTC, datetime, timedelta
from pathlib import Path

import pytest

from acnetrex_ml.training.predictive import (
    TrainingDataRejected,
    export_candidate_bundle,
    grouped_temporal_split,
    run_governed_training,
    train_predictive_ensemble,
)


FEATURES = ["sleep_hours", "stress_score"]


def _fixture_rows() -> list[dict]:
    rows: list[dict] = []
    start = datetime(2026, 1, 1, tzinfo=UTC)
    for participant in range(30):
        for offset in range(3):
            stress = float((participant + offset) % 10)
            sleep = 8.5 - stress * 0.35
            rows.append(
                {
                    "participant_id": f"p-{participant:02d}",
                    "observed_at": (start + timedelta(days=participant * 4 + offset)).isoformat(),
                    "sleep_hours": sleep,
                    "stress_score": stress,
                    "label": 1 if stress >= 5 else 0,
                }
            )
    return rows


def test_grouped_temporal_split_has_no_participant_leakage() -> None:
    split = grouped_temporal_split(_fixture_rows())

    train_ids = {row["participant_id"] for row in split.train}
    calibration_ids = {row["participant_id"] for row in split.calibration}
    holdout_ids = {row["participant_id"] for row in split.holdout}
    assert train_ids.isdisjoint(calibration_ids | holdout_ids)
    assert calibration_ids.isdisjoint(holdout_ids)
    assert max(row["observed_at"] for row in split.train) < min(
        row["observed_at"] for row in split.holdout
    )


def test_training_fits_real_residual_mlp_structured_baseline_and_calibration() -> None:
    outcome = train_predictive_ensemble(
        _fixture_rows(),
        feature_names=FEATURES,
        task="flare_direction",
        model_name="flare_direction_ensemble_v1",
        model_version="1.0.0-fixture",
        dataset_version="fixture-not-for-production",
        epochs=180,
        seed=7,
    )

    artifact = outcome.artifact
    low = artifact.predict({"sleep_hours": 8.2, "stress_score": 1.0})
    high = artifact.predict({"sleep_hours": 5.4, "stress_score": 9.0})
    assert low.probability < high.probability
    assert len(artifact.residual_mlp.input_weights) == len(FEATURES)
    assert artifact.evaluation.holdout_kind == "participant_grouped_temporal"
    assert outcome.metrics["ensemble"]["brier"] >= 0.0
    assert outcome.metrics["structured_baseline"]["brier"] >= 0.0
    assert outcome.automatic_promotion is False


def test_governed_training_verifies_snapshot_checksum_and_never_promotes(tmp_path: Path) -> None:
    snapshot = tmp_path / "snapshot.jsonl"
    snapshot.write_text(
        "\n".join(json.dumps(row) for row in _fixture_rows()) + "\n",
        encoding="utf-8",
    )
    digest = hashlib.sha256(snapshot.read_bytes()).hexdigest()
    manifest = tmp_path / "dataset-manifest.json"
    manifest.write_text(
        json.dumps(
            {
                "training_eligible_datasets": [
                    {
                        "name": "governed-fixture",
                        "version": "1",
                        "status": "approved",
                        "allowed_tasks": ["flare_direction"],
                        "snapshot_uri": "gs://governed/snapshot.jsonl",
                        "snapshot_sha256": digest,
                        "split_manifest_sha256": "b" * 64,
                        "license_status": "approved",
                        "consent_status": "approved",
                        "deidentification_status": "verified",
                        "phi_review_status": "passed",
                        "synthetic": False,
                    }
                ]
            }
        ),
        encoding="utf-8",
    )

    result = run_governed_training(
        manifest,
        task="flare_direction",
        feature_names=FEATURES,
        model_name="flare_direction_ensemble_v1",
        model_version="1.0.0-candidate",
        materialized_snapshot_path=snapshot,
        epochs=20,
    )

    assert result.automatic_promotion is False
    manifest_payload = json.loads(manifest.read_text(encoding="utf-8"))
    manifest_payload["training_eligible_datasets"][0]["snapshot_sha256"] = "0" * 64
    manifest.write_text(json.dumps(manifest_payload), encoding="utf-8")
    with pytest.raises(TrainingDataRejected, match="snapshot_checksum_mismatch"):
        run_governed_training(
            manifest,
            task="flare_direction",
            feature_names=FEATURES,
            model_name="flare_direction_ensemble_v1",
            model_version="1.0.0-candidate",
            materialized_snapshot_path=snapshot,
            epochs=1,
        )


def test_exported_bundle_is_candidate_only_and_checksum_addressed(tmp_path: Path) -> None:
    outcome = train_predictive_ensemble(
        _fixture_rows(),
        feature_names=FEATURES,
        task="flare_direction",
        model_name="flare_direction_ensemble_v1",
        model_version="1.0.0-fixture",
        dataset_version="fixture-not-for-production",
        epochs=20,
    )

    bundle = export_candidate_bundle(outcome, tmp_path)

    assert bundle["registry_entry"]["status"] == "candidate"
    assert bundle["registry_entry"]["approval_state"] == "pending_manual_review"
    assert bundle["automatic_promotion"] is False
    artifact = Path(bundle["artifact_path"])
    assert hashlib.sha256(artifact.read_bytes()).hexdigest() == bundle["artifact_sha256"]
    report = json.loads(Path(bundle["evaluation_path"]).read_text(encoding="utf-8"))
    assert report["holdout_kind"] == "participant_grouped_temporal"
    assert report["metrics"] == outcome.metrics
