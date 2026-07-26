from __future__ import annotations

import json
from pathlib import Path

import pytest


np = pytest.importorskip("numpy")
pytest.importorskip("sklearn")

from acnetrex_ml.pipeline.backbones import DeterministicDemoBackbone  # noqa: E402
from acnetrex_ml.pipeline.synthetic import generate_synthetic_manifest  # noqa: E402
from acnetrex_ml.pipeline.train import (  # noqa: E402
    ManifestError,
    compute_embeddings,
    load_dataset_manifest,
    run_training,
)
from acnetrex_ml.training.gate import TrainingBlocked  # noqa: E402


REAL_GATE_MANIFEST = (
    Path(__file__).resolve().parents[1] / "manifests" / "dataset-manifest.json"
)


def _production_manifest_payload() -> dict:
    return {
        "name": "hypothetical-cleared-cohort",
        "version": "1.0.0",
        "dataset_class": "production_candidate",
        "demo_only": False,
        "synthetic": False,
        "licence": {
            "licence_status": "approved",
            "consent_status": "approved",
            "provenance": "hypothetical governed snapshot for unit tests",
        },
        "labels": ["severity_0", "severity_1"],
        "samples": [
            {
                "image_ref": f"gs://governed/img-{i}.png",
                "label": f"severity_{i % 2}",
                "group_id": f"subject-{i // 2}",
            }
            for i in range(8)
        ],
    }


def _write_manifest(tmp_path: Path, payload: dict) -> Path:
    path = tmp_path / "manifest.json"
    path.write_text(json.dumps(payload), encoding="utf-8")
    return path


def test_manifest_refused_when_licence_fields_missing(tmp_path) -> None:
    payload = _production_manifest_payload()
    del payload["licence"]["consent_status"]
    with pytest.raises(ManifestError, match="licence_fields_missing:consent_status"):
        load_dataset_manifest(_write_manifest(tmp_path, payload))


def test_manifest_refused_when_provenance_blank(tmp_path) -> None:
    payload = _production_manifest_payload()
    payload["licence"]["provenance"] = "   "
    with pytest.raises(ManifestError, match="licence_fields_missing:provenance"):
        load_dataset_manifest(_write_manifest(tmp_path, payload))


def test_production_manifest_refused_with_non_production_rights(tmp_path) -> None:
    payload = _production_manifest_payload()
    payload["licence"]["licence_status"] = "academic_only"
    with pytest.raises(ManifestError, match="non_production_rights:licence_status"):
        load_dataset_manifest(_write_manifest(tmp_path, payload))


def test_production_manifest_refused_when_marked_synthetic(tmp_path) -> None:
    payload = _production_manifest_payload()
    payload["synthetic"] = True
    with pytest.raises(ManifestError, match="non_production_rights"):
        load_dataset_manifest(_write_manifest(tmp_path, payload))


def test_synthetic_demo_manifest_requires_demo_markers(tmp_path) -> None:
    payload = _production_manifest_payload()
    payload["dataset_class"] = "synthetic_demo"
    payload["demo_only"] = False
    payload["synthetic"] = True
    with pytest.raises(ManifestError, match="synthetic_demo_missing_demo_markers"):
        load_dataset_manifest(_write_manifest(tmp_path, payload))


def test_manifest_refused_on_unknown_dataset_class(tmp_path) -> None:
    payload = _production_manifest_payload()
    payload["dataset_class"] = "totally_fine_trust_me"
    with pytest.raises(ManifestError, match="dataset_class_invalid"):
        load_dataset_manifest(_write_manifest(tmp_path, payload))


def test_production_path_exits_with_gates_own_blocked_message(tmp_path) -> None:
    """The real governed manifest has zero eligible datasets, so the
    production path must exit with the training gate's own message."""
    manifest_path = _write_manifest(tmp_path, _production_manifest_payload())
    backbone = DeterministicDemoBackbone(embedding_dim=8, n_classes=2, seed=0)
    with pytest.raises(TrainingBlocked, match="no_approved_training_dataset"):
        run_training(
            manifest_path,
            backbone=backbone,
            output_dir=tmp_path / "out",
            gate_manifest_path=REAL_GATE_MANIFEST,
        )
    assert not (tmp_path / "out").exists()


def test_demo_backbone_forbidden_even_if_gate_ever_passes(tmp_path) -> None:
    """With a hypothetically governed gate manifest, a demo backbone still
    cannot feed a production_candidate run."""
    gate_manifest = tmp_path / "gate.json"
    gate_manifest.write_text(
        json.dumps(
            {
                "training_eligible_datasets": [
                    {
                        "name": "candidate",
                        "version": "1",
                        "status": "approved",
                        "allowed_tasks": ["acne_severity"],
                        "snapshot_uri": "gs://governed/snapshot.parquet",
                        "snapshot_sha256": "a" * 64,
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
    manifest_path = _write_manifest(tmp_path, _production_manifest_payload())
    backbone = DeterministicDemoBackbone(embedding_dim=8, n_classes=2, seed=0)
    with pytest.raises(ManifestError, match="demo_backbone_forbidden"):
        run_training(
            manifest_path,
            backbone=backbone,
            output_dir=tmp_path / "out",
            gate_manifest_path=gate_manifest,
        )


def test_embedding_cache_roundtrip_and_demo_marker(tmp_path) -> None:
    backbone = DeterministicDemoBackbone(embedding_dim=12, n_classes=2, seed=5)
    refs = [
        DeterministicDemoBackbone.make_ref("g-0", f"i-{i}", i % 2) for i in range(4)
    ]
    cache = tmp_path / "cache.npz"
    first = compute_embeddings(backbone, refs, cache_path=cache)
    assert cache.exists()
    second = compute_embeddings(backbone, refs, cache_path=cache)
    np.testing.assert_array_equal(first, second)
    with np.load(cache, allow_pickle=False) as stored:
        assert bool(stored["demo_only"][0]) is True
        assert str(stored["backbone_name"]) == backbone.name

    other_refs = refs[:3]
    third = compute_embeddings(backbone, other_refs, cache_path=cache)
    assert third.shape == (3, 12)


def test_embedding_cache_invalidated_when_backbone_settings_change(tmp_path) -> None:
    refs = [
        DeterministicDemoBackbone.make_ref("g-0", f"i-{i}", i % 2) for i in range(4)
    ]
    cache = tmp_path / "cache.npz"
    original = DeterministicDemoBackbone(
        embedding_dim=12, n_classes=2, seed=5, class_signal=2.0
    )
    first = compute_embeddings(original, refs, cache_path=cache)
    retuned = DeterministicDemoBackbone(
        embedding_dim=12, n_classes=2, seed=5, class_signal=0.1
    )
    assert original.fingerprint != retuned.fingerprint
    second = compute_embeddings(retuned, refs, cache_path=cache)
    assert not np.array_equal(first, second)
    with np.load(cache, allow_pickle=False) as stored:
        assert str(stored["backbone_fingerprint"]) == retuned.fingerprint


def test_run_training_on_synthetic_demo_stamps_demo_markers(tmp_path) -> None:
    manifest_path = generate_synthetic_manifest(
        tmp_path / "demo-manifest.json",
        n_groups=8,
        images_per_group=5,
        n_classes=3,
        seed=21,
    )
    backbone = DeterministicDemoBackbone(embedding_dim=16, n_classes=3, seed=21)
    report = run_training(
        manifest_path,
        backbone=backbone,
        output_dir=tmp_path / "out",
        seed=21,
    )
    assert report["dataset_class"] == "synthetic_demo"
    assert report["demo_only"] is True
    assert report["not_for_clinical_use"] is True
    assert report["registry_writes"] == "none"
    assert report["gate"]["consulted"] is False
    assert report["splits"]["group_leakage_detected"] is False
    for split_name in ("train", "val", "test"):
        assert report["splits"][split_name]["n_samples"] > 0
    total_groups = sum(
        report["splits"][name]["n_groups"] for name in ("train", "val", "test")
    )
    assert total_groups == report["dataset"]["n_groups"]
    for split_metrics in report["metrics"].values():
        assert 0.0 <= split_metrics["accuracy"] <= 1.0
        assert 0.0 <= split_metrics["abstention"]["abstention_rate"] <= 1.0
        assert split_metrics["reliability"]["ece"] is not None
    written = json.loads(
        (tmp_path / "out" / "evaluation-report.json").read_text(encoding="utf-8")
    )
    assert written["demo_only"] is True
    assert written["disclaimer"].startswith("DEMO ONLY")
