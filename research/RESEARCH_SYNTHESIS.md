# Research synthesis

## Finding

No discovered dataset or pretrained acne checkpoint is immediately production-usable. The repository's empty training-eligible manifest, rejected untrained registry and explicit abstention are correct. Both supplied packs hash-match the handoff and contain no images or model weights.

## Approved opportunities—not active models

- Prospective first-party AcneTrex longitudinal data is the only fully controllable canonical cohort route, after purpose-specific consent and governance approval.
- DermNet's separate paid AI dataset is the strongest image procurement lead; public website images remain prohibited for AI training.
- ACNE04 is task-fit but commercial rights, consent and grouping are `rights_unverified`.
- SCIN has a broad custom copyright grant and consented donations, but product-consent/personality-rights and acne task fit are `rights_unverified`.
- Standard DINOv2 code and weights are explicitly Apache-2.0 and are the strongest generic frozen vision baseline after approved images exist. Restrictive medical variants must not be substituted.
- MedSigLIP permits commercial applications under binding HAI-DEF terms but is cloud-sized, not an acne classifier, and requires owner/legal approval plus independent validation.
- CSDR, YODA and future Acne-ID IPD provide structured-data acquisition paths; no public term grants production model derivatives.

## Canonical model route

Train one narrow next-window structured outcome. Benchmark regularized logistic/ordinal regression and GBDT against a small residual MLP. Calibrate each on participant-disjoint validation and use weighted averaging/stacking only if untouched patient-grouped temporal/external holdout shows better AUPRC, Brier score, calibration, subgroup floors and abstention coverage. Do not begin with sequence transformers.

After licensed images and dermatologist-reviewed labels exist, compare standard DINOv2-small frozen embeddings and legally authorized MedSigLIP cloud embeddings. Distill an approved task model to MobileNetV3-Small/ONNX only after local/cloud parity, privacy and physical-device gates.

## Completion boundary

A live ANN/ensemble requires: signed rights, consent/de-identification, immutable dataset/artifact hashes, identity-safe temporal/external splits, label QC, calibration and subgroup evidence, model card, approval, canary and rollback. Until then keep `active_models=[]`, Vertex empty, and predictive outputs unavailable.

Detailed evidence: `docs/audit/model-data-evidence.md`.
