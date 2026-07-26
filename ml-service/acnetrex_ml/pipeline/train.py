"""Pipeline orchestration: manifest validation, embedding cache, train/eval.

Honesty contract (zero-fabrication constitution):

* A dataset manifest MUST declare licence, consent, and provenance fields;
  runs are refused when they are missing.
* ``dataset_class: synthetic_demo`` runs require explicit ``demo_only`` and
  ``synthetic`` markers and stamp every artifact with them. Their metrics
  describe pipeline mechanics on synthetic data — never clinical capability.
* ``dataset_class: production_candidate`` runs FIRST defer to the governed
  training gate (``acnetrex_ml.training.gate.prepare_training_run``). With
  the current governed manifest the gate raises
  ``TrainingBlocked('no_approved_training_dataset')`` and the production
  path exits with the gate's own message. This module never weakens the
  gate and never writes to ``manifests/model-registry.json``.
"""

from __future__ import annotations

import json
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from acnetrex_ml.pipeline._deps import require
from acnetrex_ml.pipeline.backbones import EmbeddingBackbone
from acnetrex_ml.pipeline.head import (
    HeadConfig,
    assert_no_group_leakage,
    build_head,
    evaluate_predictions,
    grouped_train_val_test_split,
)
from acnetrex_ml.training.gate import prepare_training_run


DEMO_DISCLAIMER = "DEMO ONLY — not a clinical model; production training remains gated"
PRODUCTION_CANDIDATE_DISCLAIMER = (
    "PRODUCTION CANDIDATE — not approved for clinical use until every "
    "governance gate (data rights, evaluation, calibration, approval) passes"
)

DATASET_CLASSES = ("synthetic_demo", "production_candidate")
REQUIRED_LICENCE_FIELDS = ("licence_status", "consent_status", "provenance")
DEFAULT_TASK = "acne_severity"
DEFAULT_GATE_MANIFEST = (
    Path(__file__).resolve().parents[2] / "manifests" / "dataset-manifest.json"
)
REPORT_VERSION = "1.0.0"


class ManifestError(ValueError):
    """A dataset manifest is missing required governance or data fields."""


@dataclass(frozen=True)
class Sample:
    image_ref: str
    label: str
    group_id: str


@dataclass(frozen=True)
class DatasetManifest:
    name: str
    version: str
    dataset_class: str
    demo_only: bool
    synthetic: bool
    licence: dict[str, str]
    labels: tuple[str, ...]
    samples: tuple[Sample, ...]

    @property
    def groups(self) -> list[str]:
        return [sample.group_id for sample in self.samples]

    @property
    def image_refs(self) -> list[str]:
        return [sample.image_ref for sample in self.samples]

    @property
    def sample_labels(self) -> list[str]:
        return [sample.label for sample in self.samples]


def load_dataset_manifest(path: str | Path) -> DatasetManifest:
    """Load and validate a local dataset manifest; refuse ungoverned data."""
    try:
        payload = json.loads(Path(path).read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as exc:
        raise ManifestError(f"manifest_unreadable:{path}") from exc
    if not isinstance(payload, dict):
        raise ManifestError("manifest_not_an_object")
    for field in ("name", "version", "dataset_class", "licence", "labels", "samples"):
        if field not in payload:
            raise ManifestError(f"manifest_field_missing:{field}")
    dataset_class = str(payload["dataset_class"])
    if dataset_class not in DATASET_CLASSES:
        raise ManifestError(f"dataset_class_invalid:{dataset_class}")
    licence = payload["licence"]
    if not isinstance(licence, dict):
        raise ManifestError("licence_fields_missing:licence")
    for field in REQUIRED_LICENCE_FIELDS:
        value = licence.get(field)
        if not isinstance(value, str) or not value.strip():
            raise ManifestError(f"licence_fields_missing:{field}")
    labels = payload["labels"]
    if not isinstance(labels, list) or len(labels) < 2:
        raise ManifestError("labels_invalid")
    label_set = {str(label) for label in labels}
    raw_samples = payload["samples"]
    if not isinstance(raw_samples, list) or not raw_samples:
        raise ManifestError("samples_missing")
    samples: list[Sample] = []
    for index, item in enumerate(raw_samples):
        if not isinstance(item, dict):
            raise ManifestError(f"sample_invalid:{index}")
        for field in ("image_ref", "label", "group_id"):
            if not str(item.get(field, "")).strip():
                raise ManifestError(f"sample_field_missing:{index}:{field}")
        if str(item["label"]) not in label_set:
            raise ManifestError(f"sample_label_unknown:{index}:{item['label']}")
        samples.append(
            Sample(
                image_ref=str(item["image_ref"]),
                label=str(item["label"]),
                group_id=str(item["group_id"]),
            )
        )
    demo_only = bool(payload.get("demo_only", False))
    synthetic = bool(payload.get("synthetic", False))
    if dataset_class == "synthetic_demo" and not (demo_only and synthetic):
        raise ManifestError("synthetic_demo_missing_demo_markers")
    if dataset_class == "production_candidate":
        if demo_only or synthetic:
            raise ManifestError("non_production_rights:synthetic_or_demo_marked")
        for field in ("licence_status", "consent_status"):
            if str(licence[field]).strip().lower() != "approved":
                raise ManifestError(f"non_production_rights:{field}={licence[field]}")
    return DatasetManifest(
        name=str(payload["name"]),
        version=str(payload["version"]),
        dataset_class=dataset_class,
        demo_only=demo_only,
        synthetic=synthetic,
        licence={field: str(licence[field]) for field in REQUIRED_LICENCE_FIELDS},
        labels=tuple(str(label) for label in labels),
        samples=tuple(samples),
    )


def compute_embeddings(
    backbone: EmbeddingBackbone,
    image_refs: list[str],
    *,
    cache_path: str | Path | None = None,
) -> Any:
    """Embed image refs, reusing an npz cache when it matches exactly.

    The cache is keyed on the backbone fingerprint (name plus every
    embedding-relevant hyperparameter) AND the exact ordered ref list; any
    mismatch forces recomputation so stale embeddings can never leak into a
    run after backbone settings change.
    """
    np = require("numpy", feature="embedding cache")
    fingerprint = str(getattr(backbone, "fingerprint", backbone.name))
    if cache_path is not None:
        cache = Path(cache_path)
        if cache.exists():
            with np.load(cache, allow_pickle=False) as stored:
                if (
                    "backbone_fingerprint" in stored
                    and str(stored["backbone_fingerprint"]) == fingerprint
                    and stored["refs"].tolist() == image_refs
                ):
                    return stored["embeddings"]
    embeddings = backbone.embed_batch(image_refs)
    if cache_path is not None:
        cache = Path(cache_path)
        cache.parent.mkdir(parents=True, exist_ok=True)
        np.savez(
            cache,
            embeddings=embeddings,
            refs=np.asarray(image_refs),
            backbone_name=np.asarray(backbone.name),
            backbone_fingerprint=np.asarray(fingerprint),
            demo_only=np.asarray([bool(backbone.demo_only)]),
        )
    return embeddings


def _split_block(groups: list[str], indices: Any) -> dict[str, int]:
    selected = [groups[i] for i in indices.tolist()]
    return {"n_samples": len(selected), "n_groups": len(set(selected))}


def run_training(
    manifest_path: str | Path,
    *,
    backbone: EmbeddingBackbone,
    output_dir: str | Path,
    config: HeadConfig | None = None,
    task: str = DEFAULT_TASK,
    gate_manifest_path: str | Path | None = None,
    val_fraction: float = 0.2,
    test_fraction: float = 0.2,
    seed: int = 0,
    report_filename: str = "evaluation-report.json",
) -> dict[str, Any]:
    """Run the full manifest -> embeddings -> train -> calibrate -> eval loop.

    ``production_candidate`` manifests defer to the governed training gate
    BEFORE any data is touched; the gate's ``TrainingBlocked`` propagates
    unchanged (currently ``no_approved_training_dataset``). Only
    ``synthetic_demo`` manifests can execute end-to-end today, and their
    report is stamped ``demo_only`` throughout.
    """
    config = config or HeadConfig(seed=seed)
    manifest = load_dataset_manifest(manifest_path)
    gate_plan: dict[str, Any] | None = None
    if manifest.dataset_class == "production_candidate":
        gate_manifest = Path(gate_manifest_path or DEFAULT_GATE_MANIFEST)
        # Raises TrainingBlocked unless a governed, rights-cleared dataset
        # exists. Never bypassed, never weakened.
        gate_plan = prepare_training_run(gate_manifest, task=task)
        if backbone.demo_only:
            raise ManifestError("demo_backbone_forbidden_for_production_candidate")
    output = Path(output_dir)
    artifacts_dir = output / "artifacts"
    artifacts_dir.mkdir(parents=True, exist_ok=True)
    demo_only = bool(manifest.demo_only or backbone.demo_only)
    cache_path = artifacts_dir / (
        f"embeddings-{backbone.name}-{manifest.name}-{manifest.version}.npz"
    )
    embeddings = compute_embeddings(
        backbone, manifest.image_refs, cache_path=cache_path
    )
    split = grouped_train_val_test_split(
        manifest.groups,
        val_fraction=val_fraction,
        test_fraction=test_fraction,
        seed=seed,
    )
    assert_no_group_leakage(manifest.groups, split)
    np = require("numpy", feature="training orchestration")
    labels_array = np.asarray(manifest.sample_labels)
    model = build_head(config)
    model.fit(embeddings[split.train], labels_array[split.train])
    classes = [str(label) for label in model.classes_]
    evaluations = {}
    for split_name, indices in (("val", split.val), ("test", split.test)):
        probabilities = model.predict_proba(embeddings[indices])
        evaluations[split_name] = evaluate_predictions(
            labels_array[indices].tolist(),
            probabilities,
            classes,
            threshold=config.abstention_threshold,
        )
    report: dict[str, Any] = {
        "report_version": REPORT_VERSION,
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "task": task,
        "dataset_class": manifest.dataset_class,
        "demo_only": demo_only,
        "not_for_clinical_use": True,
        "disclaimer": DEMO_DISCLAIMER if demo_only else PRODUCTION_CANDIDATE_DISCLAIMER,
        "dataset": {
            "name": manifest.name,
            "version": manifest.version,
            "licence": manifest.licence,
            "labels": list(manifest.labels),
            "n_samples": len(manifest.samples),
            "n_groups": len(set(manifest.groups)),
        },
        "backbone": {
            "name": backbone.name,
            "embedding_dim": int(backbone.embedding_dim),
            "demo_only": bool(backbone.demo_only),
            "production_approved": bool(backbone.production_approved),
        },
        "head": config.to_dict(),
        "splits": {
            "seed": seed,
            "val_fraction": val_fraction,
            "test_fraction": test_fraction,
            "train": _split_block(manifest.groups, split.train),
            "val": _split_block(manifest.groups, split.val),
            "test": _split_block(manifest.groups, split.test),
            "group_leakage_detected": False,
        },
        "metrics": evaluations,
        "gate": {
            "module": "acnetrex_ml.training.gate",
            "consulted": manifest.dataset_class == "production_candidate",
            "plan": gate_plan,
        },
        "registry_writes": "none",
        "artifacts": {"embedding_cache": cache_path.name},
    }
    report_path = output / report_filename
    report_path.write_text(
        json.dumps(report, indent=2, sort_keys=False) + "\n", encoding="utf-8"
    )
    report["artifacts"]["report"] = str(report_path)
    return report
