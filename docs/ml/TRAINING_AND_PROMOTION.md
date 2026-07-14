# Training and promotion

Current state: zero trained models and zero accepted pretrained weights.

The executable preparation gate is `python -m acnetrex_ml.training.gate --manifest <dataset-manifest> --task <task>`. It refuses malformed, synthetic, unlicensed, unconsented, non-de-identified, PHI-unreviewed, non-GCS, unhashed, or unsplit candidates. With the current manifest it returns `training_blocked/no_approved_training_dataset`. An eligible manifest yields only an immutable run plan; it never trains or promotes automatically.

A training run must pin dataset, feature, label, code, environment, seed, split, and base-artifact checksums. Evaluation is subject-grouped and time-aware; leakage checks run before metrics. Task-appropriate discrimination/error metrics, calibration, abstention coverage, subgroup/fairness slices, robustness, latency, memory, and local/cloud parity are mandatory. A model card must state intended use, exclusions, data, metrics, limitations, and clinical status.

Promotion requires all artifacts to exist and match SHA-256, approval state `approved`, explicit thresholds passed, rollback target recorded, and canary/monitor plan approved. `rejected` and `0.0.0-untrained` registry entries cannot load. Retraining never auto-promotes. Rollback is registry/config reversion to the last approved checksum, followed by contract and smoke verification.
