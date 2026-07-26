# Calibrated-head model card — TEMPLATE

> **TEMPLATE — NOT A MODEL CARD.** Every value below is a placeholder. No model
> matching this card has been trained, evaluated, or approved. Copy this file to
> a new name for a real candidate and replace every `<required: ...>` field with
> measured, evidenced values. A card with any placeholder left in place is
> invalid for promotion. Never fill a field with an estimated, copied, or
> synthetic-run number presented as real performance.

## Identity

- Model name/version: `<required: name and semver>`
- Task: `<required: exact task string used with acnetrex_ml.training.gate>`
- Path: `<required: Path A (derm-foundation embeddings + CalibratedClassifierCV) — Path B artifacts are non-shippable and must not get a promotion card>`
- Artifact SHA-256: `<required: checksum of the exact promoted artifact>`
- Training run ID and code commit: `<required>`

## Provenance (mandatory)

- Backbone: `<required: e.g. google/derm-foundation>` at revision hash `<required: immutable HF revision hash>` with file checksums `<required>`
- Backbone licence and acceptance record: `<required: HAI-DEF terms version, date accepted, accepting account, counsel approval reference>`
- Dataset name/version/snapshot SHA-256: `<required: must match the gate-accepted manifest>`
- Dataset licence: `<required: signed licence identifier and scope — e.g. ACNE04 commercial licence or DermNet dataset licence + DPA reference>`
- Consent basis: `<required: documented consent/authority for ML use, de-identification verification, PHI review outcome>`
- Split manifest SHA-256: `<required>`

## Evaluation — grouped splits (mandatory)

- Split design: `<required: subject-grouped and time-aware split description; leakage checks run and their results>`
- Metrics on validation/test: `<required: task-appropriate discrimination/error metrics with confidence intervals; state exactly what was measured and on what>`
- Baseline comparison: `<required: deterministic/simple baseline results on the identical split>`

## External holdout (mandatory)

- Holdout source and independence: `<required: dataset never touched during development; provenance and licence>`
- Holdout results: `<required>`

## Calibration (mandatory)

- Method: `<required: e.g. CalibratedClassifierCV with isotonic/sigmoid, CV folds>`
- Results: `<required: ECE/reliability evidence on grouped test and holdout>`

## Abstention / OOD policy (mandatory)

- Confidence threshold(s) and abstention behavior: `<required: when the model returns model_unavailable/insufficient_data instead of a prediction>`
- OOD detection method and measured behavior: `<required>`

## Subgroup and fairness (mandatory)

- Slices evaluated: `<required: e.g. skin tone (Fitzpatrick/Monk), age, sex, capture device/conditions>`
- Per-slice results and gaps: `<required: no slice may be omitted because results are unfavorable>`

## Latency and size (mandatory)

- Artifact size: `<required>`
- Serving latency (p50/p95) on the production runtime: `<required: measured, with hardware/config>`
- Memory: `<required>`

## Approval chain (mandatory)

- Legal/licence approval: `<required: who, when, reference>`
- Clinical/domain review: `<required>`
- Engineering promotion approval and registry entry: `<required: approval state must be approved; thresholds passed listed explicitly>`

## Rollback (mandatory)

- Rollback target: `<required: last approved registry checksum or deterministic-only state>`
- Rollback procedure verification: `<required: date and evidence the reversion was exercised>`

## Intended use and exclusions

- Intended use: `<required: assistance scope; no-diagnosis restriction and any backbone-licence conditions restated here>`
- Exclusions/limitations: `<required>`
- Clinical status: `<required: e.g. not a medical device / regulatory status per counsel>`
