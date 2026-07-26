# Training and promotion

Current state: zero trained models and zero accepted pretrained weights.

The executable preparation gate is `python -m acnetrex_ml.training.gate --manifest <dataset-manifest> --task <task>`. It refuses malformed, synthetic, unlicensed, unconsented, non-de-identified, PHI-unreviewed, non-GCS, unhashed, or unsplit candidates. With the current manifest it returns `training_blocked/no_approved_training_dataset`. An eligible manifest yields only an immutable run plan; it never trains or promotes automatically.

A training run must pin dataset, feature, label, code, environment, seed, split, and base-artifact checksums. Evaluation is subject-grouped and time-aware; leakage checks run before metrics. Task-appropriate discrimination/error metrics, calibration, abstention coverage, subgroup/fairness slices, robustness, latency, memory, and local/cloud parity are mandatory. A model card must state intended use, exclusions, data, metrics, limitations, and clinical status.

Promotion requires all artifacts to exist and match SHA-256, approval state `approved`, explicit thresholds passed, rollback target recorded, and canary/monitor plan approved. `rejected` and `0.0.0-untrained` registry entries cannot load. Retraining never auto-promotes. Rollback is registry/config reversion to the last approved checksum, followed by contract and smoke verification.

## Decided training path (2026-07-26)

Per the 2026-07-26 research pass (`docs/ml-research/`) and `docs/ml/ARCHITECTURE_DECISION.md`, the first predictive model targets Path A: `google/derm-foundation` frozen 6144-dim embeddings (gated HAI-DEF repo, `needs_legal_review`) plus a scikit-learn `CalibratedClassifierCV` head trained on a rights-cleared dataset (signed ACNE04 commercial licence or DermNet paid licence plus DPA). Path B — a torchvision architecture with `weights=None` trained on ACNE04 under its academic terms — is permitted only as an interim research baseline and is explicitly non-shippable: no registry entry, no Vertex deployment, no product metric claims.

The `acnetrex_ml/pipeline` package (built the same wave) is the scaffold for both paths. Its contract: runs are driven by licence-gated manifests; only clearly-labelled synthetic demo data can run end to end today; it never writes to `manifests/model-registry.json` active models; and production training remains behind `acnetrex_ml.training.gate`, which still exits `training_blocked/no_approved_training_dataset` for every current manifest. Its heavy dependencies live in `ml-service/requirements-pipeline.txt` with graceful import guards so the service runs without them. The gated backbone downloads only with an owner-supplied `HF_TOKEN` environment variable and a pinned revision hash.

Before any Path A promotion, the model card must be completed from `ml-service/reports/model-cards/calibrated-head-template.md` — provenance (backbone revision hash, dataset licence, consent basis), grouped-split evaluation, external holdout, calibration, abstention/OOD policy, subgroup/fairness, latency/size, approval chain, and rollback target — with real measured values only. Owner prerequisites are listed in `docs/OWNER_ACTIONS.md`.
