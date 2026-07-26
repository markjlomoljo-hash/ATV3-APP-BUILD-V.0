"""Predictive-ML pipeline scaffold for acne severity.

This package is the honest, open-source training/evaluation scaffold for the
future AcneTrex predictive models. It is deliberately production-inert:

* No screened open acne dataset has passed the production licence gate
  (see ``docs/ml-research/rejected-resources.md``), so the production path
  always defers to ``acnetrex_ml.training.gate`` which currently exits with
  ``training_blocked/no_approved_training_dataset``.
* The scaffold trains and evaluates ONLY on clearly-labeled synthetic demo
  data (``dataset_class: synthetic_demo``) and writes NOTHING to
  ``manifests/model-registry.json`` or any active-model registry.
* Every artifact produced from the demo backbone or a synthetic manifest
  carries explicit ``demo_only`` markers.

Optional heavy dependencies (scikit-learn, numpy, huggingface_hub) live in
``ml-service/requirements-pipeline.txt``; the FastAPI service and its test
suite must keep working when they are absent, so submodules import them
behind guards and tests use ``pytest.importorskip``.
"""

from __future__ import annotations

__all__ = [
    "backbones",
    "head",
    "synthetic",
    "train",
]
