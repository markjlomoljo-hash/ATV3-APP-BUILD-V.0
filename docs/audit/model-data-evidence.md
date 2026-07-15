# AcneTrex model/data evidence and canonical route

Evidence checked: 2026-07-15 (Asia/Manila). This is a read-only research audit; it does not approve acquisition, training, deployment, or acceptance of third-party terms. Primary-source URLs are recorded inline. Missing permission is treated as no permission.

## Executive decision

There is still no external dataset or pretrained acne model that can be placed directly into production today. The repository is correct to keep `active_models=[]`, Vertex at zero deployed models, and predictive outputs unavailable.

The shortest defensible route to a real ANN/ensemble is:

1. Prospectively collect AcneTrex first-party, explicitly consented, de-identified longitudinal outcomes under the existing governance schema. Define a narrow non-diagnostic endpoint such as next-window flare direction or user-reported change; do not infer causal triggers.
2. In parallel, seek a custom commercial image licence from DermNet and/or written commercial rights from the ACNE04 authors. SCIN may be evaluated only after counsel confirms that its consent/purpose and retained personality rights permit the exact product use.
3. For structured longitudinal prediction, benchmark regularized logistic regression and gradient-boosted trees against a small residual MLP. Promote a calibrated weighted/stacked ensemble only when patient-grouped temporal holdout proves incremental value. This is the canonical first ANN route; an LSTM/transformer is not justified at initial cohort size.
4. For vision, benchmark an Apache-2.0 DINOv2-small frozen encoder and, only after explicit owner acceptance of Google HAI-DEF terms, MedSigLIP as a cloud representation model. Neither is an acne classifier. Train a task head only on approved images/labels; later distill to MobileNetV3-Small/ONNX for device use if parity and privacy gates pass.
5. Keep every model behind the existing Cloud Run contract and governed registry. Vertex is an optional approved-artifact runtime, not a source of legitimacy.

## Verified local state and supplied packs

Authoritative repository evidence:

- `CODEX_CONTINUATION_HANDOFF.md` says the V4 pack is static ontology/reference content plus synthetic fixtures, not a real clinical cohort.
- `ml-service/manifests/dataset-manifest.json` has an empty `training_eligible_datasets` list and marks the V4 pack non-training only.
- `ml-service/manifests/model-registry.json` has `active_models=[]`; all four predictive entries are `0.0.0-untrained`, rejected, and have no artifact URI/hash or dataset version.
- `ml-service/reports/evaluation/training-eligibility-report.md` rejects training because no candidate has the complete licence, consent, label, split, holdout, deletion, and approval chain.
- `docs/ml/ARCHITECTURE_DECISION.md` establishes the canonical runtime boundary: local deterministic first, durable cloud job second, explicit abstention otherwise; Cloud Run is the only prospective Vertex caller.
- `docs/ml/DATA_GOVERNANCE.md` and `docs/ml/TRAINING_AND_PROMOTION.md` require immutable snapshots, consent/de-identification/PHI review, subject grouping, temporal cutoffs, hashes, QC, approval, calibration, subgroup evaluation, and manual promotion.

The two supplied archives were present and matched the handoff hashes:

| Archive | SHA-256 | Inventory finding | Decision |
|---|---|---|---|
| `V4AcneTrex_ML_Representation_Pack_v4.zip` | `DA937A31C3751312F38E0F8EBB37ED444608ECAEC64C980A0DB4F9B07AA3DA14` | 64 entries; 38 CSV, 3 JSONL, zero image files, zero weight-like artifacts | Static/schema/synthetic-fixture use only |
| `AcneTrex_ML_Brain_Foundation_v1 (1).zip` | `112AF3EA7B18A6D9B495D01B1F36037C6FA2292ED9B270C6F938CFC5502B0C7A` | 204 entries; code/contracts/scripts, 1 CSV, zero image files, zero weight-like artifacts | Reusable implementation scaffolding, not a model/data artifact |

The packs contain training/export/evaluation scaffolding and model class definitions, but no `.pt`, `.pth`, `.onnx`, `.tflite`, `.h5`, `.keras`, `.joblib`, `.pkl`, `.safetensors`, or checkpoint artifact. They cannot produce a legitimate live ANN without a governed dataset and trained artifact.

## Dataset and data-access decisions

### Production-directed opportunities

| Candidate | Availability and content | Primary rights evidence | Exact constraint | AcneTrex decision/action |
|---|---|---|---|---|
| First-party AcneTrex prospective cohort | Not yet collected as a training-eligible snapshot; app/governance foundations exist | Local governance and consent contracts listed above | Consent must explicitly cover model training, commercial product use, retention/deletion propagation, human review, subgroup evaluation, and optional image use. Stable subject/episode IDs and outcome timestamps are mandatory. | **Canonical data route.** Prepare protocol, consent language, dermatologist label/QC plan, minimum observation window, and independent holdout before collecting training data. Do not use behavior-tuning conversations as labels. |
| DermNet licensed AI dataset | Paid, separate from website images; official page claims 60,000+ patient cases, 10+ countries, 100+ dermatologists, 600+ conditions, smartphone images, de-identification and skin types I-VI | https://dermnetnz.org/dermatology-image-dataset | Public page is an invitation to negotiate, not a licence. Minimum request is 1,000 images. Commercial use, acne subset/labels, derivative weights, model hosting, redistribution, identity keys, retention/deletion, geography, DPA and audit rights must be in the signed contract. | **Best near-term image procurement lead.** Request an acne-only sample/data dictionary and a term sheet expressly covering commercial training/deployment and derived weights. No download or training before signature. |
| ACNE04 | 1,457 reported images (zip counts have differed), bounding boxes, lesion counts and severity | Author repo: https://github.com/xpwu95/LDL ; dataset description: https://pmc.ncbi.nlm.nih.gov/articles/PMC9028662/ | Author states free academic use; other purposes require author contact. No public commercial grant, consent dossier, identity keys, redistribution or derivative-model rights. | **Contact/licence candidate, not approved.** Seek signed commercial terms plus consent/provenance, de-identification, subject grouping, label QC and redistribution/derived-weight clauses. Mirrors do not cure the restriction. |
| SCIN v1 | 5,000+ contributions, 10,000+ images; voluntary consented US internet cohort; self-report metadata, dermatologist differentials, estimated Fitzpatrick/Monk tone; known duplicates/missing labels | Repo/docs: https://github.com/google-research-datasets/scin ; licence: https://github.com/google-research-datasets/scin/blob/main/LICENSE | Custom licence grants worldwide royalty-free reproduction/sharing/adaptation and has no non-commercial clause, but grants only rights the licensor controls; privacy/publicity/personality rights are not licensed. It prohibits re-identification and requires attribution/notices. Stated purpose is health education/research. Exact acne volume, severity/lesion labels, product-consent scope, stable participant grouping and untouched acne holdout are unproven. | **Legal/privacy/task-fit review.** Potential representation or auxiliary condition-level data after written counsel approval; not a production acne label source today. Never infer severity from condition labels. |
| Stanford AIMI commercial licence | AIMI now offers commercial licences for its shared datasets; DDI contains 656 images from 570 patients but targets biopsy-proven lesions, not acne | Programme: https://aimi.stanford.edu/datasets-commercial-use ; DDI research terms: https://ddi-dataset.github.io/index.html | Free DDI terms are personal non-commercial research only, prohibit redistribution/derivative works and clinical use. AIMI commercial access requires company application, committee review, signed agreement, fee and annual term. The published `$70,000` figure is explicitly FY25 and must not be treated as a current quote. | **Fairness/external-shift candidate only**, and only if a new commercial agreement covers the exact dataset/task and derived models. It does not replace an acne training cohort. |
| Commercial controlled trial data via CSDR | A GSK acne vulgaris study (`STF114546`/`NCT01015638`) lists raw data and supporting documents as ready to share | Study listing: https://clinicalstudydatarequest.com/Posting.aspx?ID=8 ; process: https://www.clinicalstudydatarequest.com/Help/Help.aspx | Requires account, scientific proposal, review, data-sharing agreement and protected access. The identified study is a two-week topical irritation/tolerance study, not a general flare/lesion cohort. Product training, export of row-level data and commercial derivative rights are not publicly granted. | **Controlled structured-data lead.** Ask whether commercial model-development/derived-weight use is allowed; otherwise use only for approved research/endpoint feasibility. |
| YODA acne trial | YODA search currently exposes one acne vulgaris trial and accepts reviewed external investigator requests | https://yoda.yale.edu/trials-search/ ; https://yoda.yale.edu/about/frequently-asked-questions-faqs/ | Access follows research request approval and partner terms. Public search does not grant production, redistribution or derivative-model rights. | **Controlled-access lead.** Identify exact trial/outcomes, then request only if endpoint and commercial/derivative rights fit. |
| Acne-ID trial (`ISRCTN45540647`) | Ongoing UK randomized trial, target n=800, ages 12–24, repeated CASS IGA at baseline, 1, 3, 5–6, 8–10 months and end of treatment | https://www.isrctn.com/ISRCTN45540647 | IPD planned only at least 12 months after main-results publication, by committee-reviewed request and signed DUA; data pseudo-anonymised. As of 2026-07-15 it is recruiting and unavailable. No public commercial-model or redistribution grant. | **High-value future longitudinal benchmark**, not an execution dependency. Calendar a post-publication inquiry to `ctu@nottingham.ac.uk`; do not claim availability now. |

### Rejected or restricted candidates

| Candidate | Exact reason |
|---|---|
| AcneSCU | Official author repository says the dataset is non-commercial and commercial use is prohibited without permission; Apache-2.0 covers code, not the images. https://github.com/pingguokiller/acnedetection |
| DermNet website images | Official image licence expressly says freely available/watermarked website images may not be used for AI training. The paid AI dataset is separate. https://dermnetnz.org/image-licence |
| DDI free download | Personal, non-commercial research only; no redistribution/derivative works and no diagnosis/patient-care use. https://ddi-dataset.github.io/index.html |
| ACNE-ECKH | Paper reports 8,242 clinical images but its data-availability statement says the dataset cannot be shared for ethical, legal and privacy reasons. https://pmc.ncbi.nlm.nih.gov/articles/PMC12024611/ |
| Hugging Face/Kaggle acne mirrors | A mirror cannot grant original copyright, consent, personality, clinical-use, or derivative-weight rights. Repository screening already found zero candidates with a complete provenance/rights chain. |
| Arbitrary web/social images | Public visibility is not consent or a reusable licence; facial images carry identity and sensitive-health risks. Exclude. |
| Synthetic acne faces/pack fixtures | Useful for schema, load, negative-path, robustness and UI testing only. They are not clinical supervision and cannot support clinical metrics or claims. |
| ClinicalTrials.gov registry records | Registry metadata and aggregate results are public, but they are not participant-level outcome datasets. Do not train a patient predictor from registry metadata. |

## Pretrained model/weight decisions

| Model/weights | Licence and availability | Technical fit | Exact constraint | Decision |
|---|---|---|---|---|
| DINOv2 standard backbones | Official repository states standard DINOv2 code and model weights are Apache-2.0: https://github.com/facebookresearch/dinov2 ; model card: https://github.com/facebookresearch/dinov2/blob/main/MODEL_CARD.md | Generic self-supervised image representation; frozen features plus a shallow head are a strong lawful baseline. Small variant is materially lighter than MedSigLIP, but still needs measured ONNX/mobile support, quantization, latency and battery evidence. | The repo also contains separate X-ray/cell models with non-commercial/research licences; those variants are **not** approved. Apache licensing of standard weights does not make them an acne classifier or validate medical use. Pin exact URL/revision/hash and retain notices. | **Approved opportunity for controlled evaluation, not active inference.** Benchmark standard DINOv2-small frozen embeddings only after approved acne images exist. |
| MedSigLIP 1.0.0 | Google HAI-DEF open weights; commercial applications allowed subject to binding terms: model card https://developers.google.com/health-ai-developer-foundations/medsiglip/model-card ; FAQ https://developers.google.com/health-ai-developer-foundations/faqs ; terms https://developers.google.com/health-ai-developer-foundations/terms ; prohibited uses https://developers.google.com/health-ai-developer-foundations/prohibited-use-policy | Dermatology-capable 400M vision + 400M text towers at 448×448. Cloud representation/linear-probe candidate, not initial native runtime and not an acne classifier. | Use accepts entity-binding HAI-DEF terms. Hosted services and derivatives are “Distribution”; downstream restrictions/notice obligations apply. Terms require regulatory authorization when applicable and prohibit unlicensed medical practice, sensitive-data use without rights/consents, misleading health capabilities and automated healthcare decisions affecting well-being. Model card requires independent adaptation/validation and warns about contamination. | **Owner/legal approval required.** Cloud experiment only, non-diagnostic use, never zero-shot production prediction. |
| Derm Foundation | Same HAI-DEF family; Google marks it legacy and recommends MedSigLIP | Dermatology embeddings, cloud only | Adds a superseded dependency under the same binding terms without a task advantage | Reject for new adoption. |
| MobileNetV3-Small / EfficientNet-B0 architecture | TorchVision code/architecture is BSD-3-Clause; https://github.com/pytorch/vision | Good mobile distillation/task-head architectures; MobileNetV3-Small is preferred for first device candidate | ImageNet weight rights/training-data provenance must be reviewed separately; architecture licence does not clear pretrained weights | Architecture with `weights=None` is usable. Train only on approved data; later export an approved checksum-verified artifact. |
| TorchVision ImageNet weights / OpenCLIP community weights | Code licences and checkpoint/data licences vary; OpenCLIP explicitly aggregates weights trained on many datasets under different licences: https://github.com/mlfoundations/open_clip/blob/main/docs/PRETRAINED.md | Generic transfer candidates | No blanket conclusion is possible. Each exact checkpoint, training corpus, weight licence, distribution rights and notices must be separately approved. | Do not use via a generic model name. Register an immutable exact checkpoint only after legal/provenance review. |
| Community acne checkpoints | Repository search found no checkpoint with verified weight licence plus original training-data/consent provenance | Superficially task-specific | Often inherit ACNE04/AcneSCU/mirror restrictions; code licence does not license weights or source images | Reject unless the author supplies complete rights/provenance and independent evaluation succeeds. |

## Canonical model and ensemble route

### 1. First trained task: structured next-window outcome

Choose one predeclared, non-causal endpoint (for example, user/clinician-graded `improved / stable / worsened` over a fixed next window). Inputs must be available before the prediction cutoff: prior severity/lesion summaries, treatment/adherence, sleep, diet, stress, cycle, climate, product exposures, missingness indicators and time-since-last-observation. Never leak post-outcome observations or future treatment changes.

Candidate ladder:

1. Regularized logistic/ordinal regression and a simple persistence/rate baseline.
2. Gradient-boosted decision trees with calibrated probabilities.
3. Small residual MLP with feature embeddings, explicit missingness masks, normalization learned only on the training fold, dropout, and 3–5 independently seeded members.
4. Optional FT-Transformer only after the residual MLP and GBDT are saturated and cohort size supports it.

Why: medium-sized tabular benchmarks find tree models remain state of the art around 10k samples, while NeurIPS comparisons identify residual MLP and FT-Transformer as strong neural baselines but no universally superior solution: https://proceedings.neurips.cc/paper_files/paper/2022/hash/0378c7692da36807bdec87ab043cdadc-Abstract-Datasets_and_Benchmarks.html and https://proceedings.neurips.cc/paper/2021/hash/9d86d83f925f2149e9edb0ac3b49229c-Abstract.html .

Canonical ensemble:

- Calibrate each candidate on a participant-disjoint validation fold (temperature scaling for ANN logits; Platt/isotonic/beta calibration selected without touching test data).
- Begin with simple weighted probability averaging of GBDT + residual MLP. Learn weights only on out-of-fold predictions; use stacking only if sample size is adequate.
- Gate/abstain on insufficient history, out-of-distribution features, poor image quality, high member disagreement or a conformal prediction set that is too broad.
- Never add deterministic descriptive rules as fake probabilistic votes. They may gate readiness or provide separate explanations.
- Promote the ensemble only if it beats the best single model on untouched participant-grouped temporal/external holdout for AUPRC/Brier/calibration and does not regress prespecified subgroups, latency or abstention coverage.

Modern neural networks are often miscalibrated; temperature scaling is a strong simple post-hoc baseline: https://proceedings.mlr.press/v70/guo17a.html . Independently trained deep ensembles provide a practical uncertainty/distribution-shift signal, but their extra compute must earn its keep: https://papers.nips.cc/paper/7219-simple-and-scalable-predictive-uncertainty-estimation-using-deep-ensembles .

### 2. Vision route

The first approved vision task should be narrow and assistive: image quality/framing, acne-region representation, or dermatologist-reviewed lesion localization—not diagnosis. Use patient-disjoint splits, duplicate/near-duplicate detection, device/lighting/skin-tone slices, and an external acquisition-source holdout.

Benchmark order after rights clearance:

1. Standard DINOv2-small frozen encoder + linear/shallow head.
2. MedSigLIP frozen embeddings + shallow head in Cloud Run/Vertex only after owner/legal acceptance.
3. MobileNetV3-Small trained/distilled for local inference, with no teacher-generated pseudo-label treated as gold.
4. Fine-tune a backbone only if frozen-feature results and data volume justify identity-learning/privacy risk.

Self-supervised learning on first-party images is allowed only where consent explicitly covers it. It must use private processing, avoid cross-user identity objectives, strip metadata, enforce deletion propagation, and be evaluated against a supervised baseline. Contrastive/masked pretraining is representation learning, not clinical supervision.

Weak supervision may prioritize annotation but cannot create gold labels: dermatologist-authored labeling functions, consensus review, active learning, pseudo-labels with abstention, and positive-unlabeled methods are acceptable only with a locked expert-reviewed validation/test set and explicit noise/conflict reporting.

### 3. Temporal/personalization route

Do not start with an LSTM/TCN/temporal transformer. Start with lagged features, mixed-effects/GAM-style descriptive baselines, GBDT and residual MLP. Require multiple observations per person, defined exposure/outcome windows, missingness and treatment-change documentation, and a gap between features and outcomes. Add TCN/GRU only after cohort size, per-person sequence length, and ablation evidence show benefit.

Personalized N-of-1 outputs must remain observational unless a prospective randomized/counterbalanced protocol handles washout, carryover, adherence and confounding. Global models must not turn cross-sectional associations into individual causal advice.

## Evaluation and promotion gates

Minimum evidence for any live model:

- immutable dataset/model/checkpoint hashes and exact licences/terms;
- consent, de-identification/PHI review, retention/deletion propagation and access audit;
- participant/episode grouped splits, temporal cutoff/gap, duplicate detection, untouched external holdout;
- label taxonomy, annotator qualification, adjudication and inter-rater agreement;
- AUROC and AUPRC plus sensitivity/specificity/precision/recall/F1 at predeclared thresholds; MAE/count error for counts; Dice/IoU for segmentation;
- Brier score, calibration slope/intercept, reliability diagram and ECE with uncertainty intervals;
- patient-level bootstrap confidence intervals and subgroup slices for age, sex/gender where lawful, skin tone, device, lighting and geography;
- robustness/OOD, missingness, corruption, adversarial upload and image metadata tests;
- latency, memory, cost and, for mobile, cold start/battery/thermal/operator parity and checksum-corruption tests;
- comparison to simple baseline and best single model; ablations proving every ensemble member adds value;
- model card, limitations, non-diagnostic language, abstention behavior, canary metrics, rollback checksum and independent approval.

No metric computed on synthetic fixtures may be presented as clinical performance. No model may return lesion counts, severity or flare probability when its task-specific gate is not satisfied.

## Acquisition actions in priority order

1. Draft the first-party prospective data/consent/annotation protocol and endpoint specification; obtain legal/clinical/ethics approval where applicable.
2. Send DermNet a scoped licensing inquiry requesting an acne-only inventory/sample and contractual rights matrix: commercial training/testing, hosted inference, derived weights, redistribution, retention/deletion, geography, audit, consent and participant/episode keys.
3. Contact ACNE04 authors for the same commercial/derivative rights package; reject if consent/provenance and identity-safe grouping cannot be documented.
4. Have counsel review SCIN licence + original consent/purpose for the exact AcneTrex non-diagnostic product use; compute acne counts/label schema only after approval.
5. Create controlled-access research proposals for the GSK CSDR acne study and YODA acne trial only if endpoints match; ask expressly whether commercial model derivatives are permitted.
6. Track Acne-ID publication; request IPD no earlier than its stated window and only under an approved DUA.
7. Add standard DINOv2-small as a version/hash-pinned evaluation candidate in the future registry; keep it inactive until approved data and full evaluation exist.
8. Obtain explicit owner/entity authorization before accepting HAI-DEF terms or downloading MedSigLIP for a cloud experiment.

## Search coverage and saturation

Searches covered original author repositories, official dataset/project pages, PubMed/PMC publications, ISRCTN, ClinicalStudyDataRequest.com, YODA, Vivli, Google HAI-DEF, Meta DINOv2, TorchVision/OpenCLIP, DermNet, Stanford AIMI/DDI, Hugging Face registries, and the repository’s prior 11-dataset/61-model screen. Query families combined acne/acne-vulgaris/lesion/severity/longitudinal/treatment-response/image/annotation/foundation/pretrained/weights with commercial-use/licence/consent/derivative/redistribution/controlled-access terms.

Saturation decision: repeated searches converged on the same acne-specific sources (ACNE04, AcneSCU, ACNE-ECKH), broad dermatology sources (SCIN, DermNet, DDI), controlled trial platforms, and foundation backbones. Additional mirrors do not resolve missing original rights. The search can stop for implementation planning because each material category has (a) an actionable candidate or controlled-access route, (b) primary rights/availability evidence, (c) a rejection/gate, and (d) a concrete next action. It must be refreshed before signing terms or acquiring artifacts because licences, prices, model versions and access status can change.
