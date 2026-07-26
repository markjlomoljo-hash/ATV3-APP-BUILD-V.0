from __future__ import annotations

import json
import subprocess
import sys
from pathlib import Path

import pytest


pytest.importorskip("numpy")
pytest.importorskip("sklearn")


SCRIPT = Path(__file__).resolve().parents[1] / "scripts" / "run_pipeline_demo.py"


def test_demo_cli_end_to_end_smoke(tmp_path) -> None:
    output_dir = tmp_path / "pipeline-demo"
    result = subprocess.run(
        [
            sys.executable,
            str(SCRIPT),
            "--output-dir",
            str(output_dir),
            "--n-groups",
            "8",
            "--images-per-group",
            "5",
            "--classes",
            "3",
            "--seed",
            "7",
        ],
        capture_output=True,
        text=True,
        timeout=180,
    )
    assert result.returncode == 0, result.stderr
    lines = result.stdout.strip().splitlines()
    assert lines[-1] == (
        "DEMO ONLY — not a clinical model; production training remains gated"
    )

    report_path = output_dir / "pipeline-demo-report.json"
    report = json.loads(report_path.read_text(encoding="utf-8"))
    assert report["dataset_class"] == "synthetic_demo"
    assert report["demo_only"] is True
    assert report["not_for_clinical_use"] is True
    assert report["registry_writes"] == "none"
    assert report["dataset"]["n_samples"] == 40
    assert report["dataset"]["n_groups"] == 8
    assert report["metrics"]["test"]["reliability"]["points"]
    assert (output_dir / ".gitignore").read_text(encoding="utf-8").find(
        "artifacts/"
    ) != -1
    assert (output_dir / "artifacts" / "synthetic-demo-manifest.json").exists()

    manifest = json.loads(
        (output_dir / "artifacts" / "synthetic-demo-manifest.json").read_text(
            encoding="utf-8"
        )
    )
    assert manifest["demo_only"] is True
    assert manifest["synthetic"] is True
    assert manifest["licence"]["licence_status"] == "synthetic_demo_only"
