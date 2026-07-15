# Evaluation and calibration plan

## Split first

- Group by participant and episode before any preprocessing.
- Enforce feature cutoff before outcome plus a temporal gap.
- Deduplicate images and reserve an untouched acquisition-source external holdout.
- Fit normalization, imputation, feature selection, calibration and ensemble weights only within training/validation data.

## Metrics

| Task | Primary | Supporting |
|---|---|---|
| Imbalanced classification | AUPRC | AUROC; sensitivity; specificity; precision; recall; F1; balanced accuracy |
| Ordinal severity/direction | macro F1; MAE | weighted kappa; confusion matrix |
| Lesion count | MAE/count error | bias by count range and skin tone |
| Localization | lesion-level sensitivity/precision | IoU and false positives per image |
| Segmentation | Dice | IoU and boundary error |
| Temporal forecast | Brier/MAE as appropriate | horizon-specific discrimination and calibration |

Use patient-level bootstrap confidence intervals. Report slices for legally collected age, sex/gender, skin tone, geography, device, lighting and missingness; never hide insufficient subgroup sample sizes.

## Calibration and uncertainty

- ANN: temperature scaling baseline; compare beta/isotonic only on held-out validation.
- GBDT/linear: Platt, isotonic or beta calibration chosen by validation Brier score and calibration error.
- Report Brier score, calibration slope/intercept, reliability diagrams and ECE with bin sensitivity.
- Use 3–5 independent MLP seeds for disagreement; deep-ensemble evidence: https://papers.nips.cc/paper/7219-simple-and-scalable-predictive-uncertainty-estimation-using-deep-ensembles .
- Temperature-scaling evidence: https://proceedings.mlr.press/v70/guo17a.html .
- Evaluate conformal sets/intervals only with exchangeability caveats and temporal/OOD coverage checks.

## Promotion gates

Predeclare thresholds for discrimination/error, calibration, subgroup floor, abstention coverage, OOD behavior, latency, memory, cost and mobile battery/thermal parity. The ensemble must beat the best single model, and every member must add value in ablation. Require immutable hashes, model card, approval, canary, rollback target and deletion lineage. Synthetic fixtures never support clinical metrics.
