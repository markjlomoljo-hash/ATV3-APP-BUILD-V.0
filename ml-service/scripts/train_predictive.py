from __future__ import annotations

import argparse
import json
from pathlib import Path

from acnetrex_ml.training.predictive import (
    export_candidate_bundle,
    run_governed_training,
)


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Train and export a manually reviewed Acnetrex predictive candidate"
    )
    parser.add_argument("--manifest", required=True, type=Path)
    parser.add_argument("--snapshot", required=True, type=Path)
    parser.add_argument("--task", required=True)
    parser.add_argument("--features", required=True, nargs="+")
    parser.add_argument("--model-name", required=True)
    parser.add_argument("--model-version", required=True)
    parser.add_argument("--output", required=True, type=Path)
    parser.add_argument("--epochs", type=int, default=300)
    parser.add_argument("--seed", type=int, default=17)
    args = parser.parse_args()
    outcome = run_governed_training(
        args.manifest,
        task=args.task,
        feature_names=args.features,
        model_name=args.model_name,
        model_version=args.model_version,
        materialized_snapshot_path=args.snapshot,
        epochs=args.epochs,
        seed=args.seed,
    )
    bundle = export_candidate_bundle(outcome, args.output)
    print(json.dumps(bundle, indent=2, sort_keys=True))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
