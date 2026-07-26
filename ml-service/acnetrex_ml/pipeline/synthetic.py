"""Synthetic demo dataset manifest generator. DEMO ONLY — never clinical.

Generates a clearly-marked ``dataset_class: synthetic_demo`` manifest whose
image references use the :class:`DeterministicDemoBackbone` ref scheme. No
real images, patients, or clinical labels are involved; the label names are
synthetic placeholders (``severity_0`` ...), chosen only so the pipeline's
multi-class mechanics can be exercised.
"""

from __future__ import annotations

import json
import random
from pathlib import Path
from typing import Any

from acnetrex_ml.pipeline.backbones import DeterministicDemoBackbone


SYNTHETIC_LICENCE_BLOCK = {
    "licence_status": "synthetic_demo_only",
    "consent_status": "not_applicable_synthetic_data",
    "provenance": (
        "generated in-repo by acnetrex_ml.pipeline.synthetic; "
        "contains no real patient data and grants no training rights"
    ),
}


def generate_synthetic_manifest(
    path: str | Path,
    *,
    n_groups: int = 12,
    images_per_group: int = 6,
    n_classes: int = 3,
    seed: int = 1234,
) -> Path:
    """Write a synthetic demo dataset manifest and return its path."""
    if n_groups < 4:
        raise ValueError("need at least 4 groups for grouped train/val/test splits")
    if n_classes < 2:
        raise ValueError("need at least 2 classes")
    rng = random.Random(seed)
    labels = [f"severity_{i}" for i in range(n_classes)]
    samples: list[dict[str, Any]] = []
    for group_index in range(n_groups):
        group_id = f"demo-group-{group_index:03d}"
        for sample_index in range(images_per_group):
            class_index = rng.randrange(n_classes)
            samples.append(
                {
                    "image_ref": DeterministicDemoBackbone.make_ref(
                        group_id, f"img-{sample_index:03d}", class_index
                    ),
                    "label": labels[class_index],
                    "group_id": group_id,
                }
            )
    manifest = {
        "name": "synthetic-demo-acne-severity",
        "version": "0.0.0-demo",
        "dataset_class": "synthetic_demo",
        "demo_only": True,
        "synthetic": True,
        "licence": dict(SYNTHETIC_LICENCE_BLOCK),
        "labels": labels,
        "generator": {
            "module": "acnetrex_ml.pipeline.synthetic",
            "seed": seed,
            "n_groups": n_groups,
            "images_per_group": images_per_group,
        },
        "samples": samples,
    }
    output = Path(path)
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text(json.dumps(manifest, indent=2) + "\n", encoding="utf-8")
    return output
