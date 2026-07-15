# Architecture comparison

## Decision

The canonical first learned task is a narrow next-window structured outcome. Compare a regularized linear model and gradient-boosted trees with a small residual MLP; deploy a calibrated weighted ensemble only if it improves untouched patient-grouped temporal holdout. Keep vision separate until licensed images exist.

| Candidate | Data need | Strength | Weakness | Runtime | Decision |
|---|---:|---|---|---|---|
| Logistic/ordinal regression | low | interpretable and calibratable | limited interactions | local/cloud | mandatory baseline |
| GBDT | low-medium | strong heterogeneous tabular baseline and missingness handling | harder end-to-end fusion | cloud; possible export | primary structured baseline |
| Small residual MLP | medium | satisfies ANN route and supports embeddings/fusion | calibration and data hunger | local/cloud | canonical ANN candidate |
| FT-Transformer | medium-high | strong tabular neural comparison | complexity and overfit risk | cloud | later challenger |
| TCN/GRU | high sequence density | temporal inductive bias | irregular sampling and attrition risk | cloud/local possible | later only |
| Temporal transformer | very high | long-range interactions | unjustified compute/data need | cloud | reject initially |
| DINOv2-small frozen encoder | approved images required | Apache-2.0 generic representation | not acne-specific | cloud; mobile requires proof | first vision representation benchmark |
| MedSigLIP frozen encoder | approved images and owner terms acceptance | dermatology-capable embeddings | 800M towers; binding terms; not classifier | cloud | gated challenger |
| MobileNetV3-Small | approved images and labels | mobile size/quantization path | must be trained/distilled legitimately | mobile/cloud | future device target |

Evidence: tree-based models remain strong on medium tabular datasets (https://proceedings.neurips.cc/paper_files/paper/2022/hash/0378c7692da36807bdec87ab043cdadc-Abstract-Datasets_and_Benchmarks.html); residual MLP and FT-Transformer are strong neural baselines with no universally superior model (https://proceedings.neurips.cc/paper/2021/hash/9d86d83f925f2149e9edb0ac3b49229c-Abstract.html).

## Ensemble and routing

- Generate out-of-fold patient-grouped predictions for every component.
- Calibrate components without touching test data.
- Start with constrained weighted averaging of GBDT and 3–5 residual-MLP seeds; use stacking only with sufficient validation volume.
- Abstain for insufficient history, OOD inputs, excessive member disagreement, poor capture quality, or broad conformal sets.
- Deterministic engines gate readiness and explain context; they are not probabilistic votes.
- Promote only if AUPRC, Brier score, calibration, subgroup performance, latency and abstention coverage jointly pass prespecified gates.

The existing local deterministic → durable Cloud Run → optional Vertex route remains canonical. Clients never call Vertex directly.
