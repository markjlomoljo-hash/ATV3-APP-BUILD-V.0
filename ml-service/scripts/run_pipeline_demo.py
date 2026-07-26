#!/usr/bin/env python
"""Run the acne-severity pipeline scaffold end-to-end on synthetic demo data.

DEMO ONLY. This CLI generates a clearly-marked synthetic manifest, embeds it
with the deterministic demo backbone, trains and calibrates the scikit-learn
head, and writes an honest evaluation report under
``ml-service/reports/pipeline-demo/``. The metrics validate pipeline
mechanics on fabricated data; they say nothing about clinical performance.
Production training remains blocked by ``acnetrex_ml.training.gate`` until a
rights-cleared dataset exists.

Usage:
    python ml-service/scripts/run_pipeline_demo.py [--output-dir DIR] ...
"""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path


SERVICE_ROOT = Path(__file__).resolve().parents[1]
if str(SERVICE_ROOT) not in sys.path:
    sys.path.insert(0, str(SERVICE_ROOT))

DEFAULT_OUTPUT_DIR = SERVICE_ROOT / "reports" / "pipeline-demo"
GITIGNORE_BODY = "# Large regenerable demo artifacts stay untracked.\nartifacts/\n"


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--output-dir", default=str(DEFAULT_OUTPUT_DIR))
    parser.add_argument("--n-groups", type=int, default=12)
    parser.add_argument("--images-per-group", type=int, default=6)
    parser.add_argument("--classes", type=int, default=3)
    parser.add_argument("--embedding-dim", type=int, default=64)
    parser.add_argument("--seed", type=int, default=1234)
    parser.add_argument("--abstention-threshold", type=float, default=0.5)
    parser.add_argument("--report-filename", default="pipeline-demo-report.json")
    return parser


def main(argv: list[str] | None = None) -> int:
    args = build_parser().parse_args(argv)
    try:
        import numpy  # noqa: F401
        import sklearn  # noqa: F401
    except ImportError:
        print(
            "pipeline dependencies missing; "
            "run: pip install -r ml-service/requirements-pipeline.txt"
        )
        return 2

    from acnetrex_ml.pipeline.backbones import DeterministicDemoBackbone
    from acnetrex_ml.pipeline.head import HeadConfig
    from acnetrex_ml.pipeline.synthetic import generate_synthetic_manifest
    from acnetrex_ml.pipeline.train import DEMO_DISCLAIMER, run_training

    output_dir = Path(args.output_dir)
    artifacts_dir = output_dir / "artifacts"
    artifacts_dir.mkdir(parents=True, exist_ok=True)
    gitignore = output_dir / ".gitignore"
    if not gitignore.exists():
        gitignore.write_text(GITIGNORE_BODY, encoding="utf-8")

    manifest_path = generate_synthetic_manifest(
        artifacts_dir / "synthetic-demo-manifest.json",
        n_groups=args.n_groups,
        images_per_group=args.images_per_group,
        n_classes=args.classes,
        seed=args.seed,
    )
    backbone = DeterministicDemoBackbone(
        embedding_dim=args.embedding_dim,
        n_classes=args.classes,
        seed=args.seed,
    )
    report = run_training(
        manifest_path,
        backbone=backbone,
        output_dir=output_dir,
        config=HeadConfig(
            seed=args.seed, abstention_threshold=args.abstention_threshold
        ),
        seed=args.seed,
        report_filename=args.report_filename,
    )

    test_metrics = report["metrics"]["test"]
    abstention = test_metrics["abstention"]
    summary = {
        "dataset_class": report["dataset_class"],
        "demo_only": report["demo_only"],
        "n_samples": report["dataset"]["n_samples"],
        "n_groups": report["dataset"]["n_groups"],
        "splits": {name: report["splits"][name] for name in ("train", "val", "test")},
        "test_accuracy": test_metrics["accuracy"],
        "test_ece": test_metrics["reliability"]["ece"],
        "test_abstention_rate": abstention["abstention_rate"],
        "test_accuracy_on_answered": abstention["accuracy_on_answered"],
        "report_path": report["artifacts"]["report"],
        "registry_writes": report["registry_writes"],
    }
    print(json.dumps(summary, indent=2))
    print(
        "Metrics above describe pipeline mechanics on fabricated synthetic data only."
    )
    print(DEMO_DISCLAIMER)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
