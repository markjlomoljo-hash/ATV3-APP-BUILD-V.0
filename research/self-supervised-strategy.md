# Self-supervised strategy

## Allowed opportunity

Use self-supervised learning only on images or sequences whose consent explicitly covers model training and commercial product development. It produces representations, not clinical labels.

| Method | Suitable input | Expected role | Primary risk | Gate |
|---|---|---|---|---|
| Frozen DINOv2 features | approved images | low-data generic image baseline | identity/device shortcuts | patient-grouped external evaluation |
| Masked image modeling | large first-party image corpus | domain adaptation | learning identity and capture artifacts | private training; deletion propagation; ablations |
| Contrastive image learning | multiple lawful views | capture-invariant embedding | positives encode identity | avoid cross-user identity objective; strict grouping |
| Temporal contrastive learning | repeated approved scans | change representation | treatment/time leakage | pre-outcome cutoffs and episode gaps |
| Masked-feature reconstruction | longitudinal tabular data | missingness-aware representation | reconstructing sensitive attributes | consent and privacy review |
| Teacher-student consistency | approved unlabeled images | robustness and distillation | propagating teacher errors | gold locked validation and abstention |

## Canonical sequence

1. Benchmark frozen standard DINOv2-small after pinning the Apache-2.0 checkpoint hash.
2. Compare with randomly initialized/MobileNet architecture and simple supervised head.
3. Accept MedSigLIP only after entity authorization for HAI-DEF terms; use cloud embeddings, not zero-shot clinical predictions.
4. Fine-tune or self-supervise on first-party images only if data volume and ablations justify privacy risk.
5. Distill to MobileNetV3-Small only after teacher and student pass independent task, subgroup, calibration and parity gates.

Strip metadata, prohibit re-identification, isolate private artifacts, record deletion lineage, and test whether embeddings expose identity. No self-supervised result may be described as dermatologist supervision.
