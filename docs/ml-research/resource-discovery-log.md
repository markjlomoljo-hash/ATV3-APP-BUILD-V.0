# AcneTrex ML resource discovery log

## Scope and decision rule

Searches were performed on 2026-07-13 and rechecked on 2026-07-14 (Asia/Manila) using authoritative registries, original publisher repositories, and official documentation. No access control was bypassed. Code, model weights, and data are independently licensed: a permissive code license does not grant rights to bundled weights or training data.

An item passes only when maintenance/versioning, commercial and redistribution rights, original provenance, human-image consent/privacy, label quality, identity-safe evaluation feasibility, supply-chain integrity, and target-runtime feasibility are all supported by evidence. Missing or unclear permission is not permission.

## Reproducible query ledger

| ID | Time | Registry/source | Query/path | Results | Screened | Accepted | Legal review | Rejected | Stop reason | Evidence |
|---|---|---|---:|---:|---:|---:|---:|---:|---|---|
| Q01 | 2026-07-13 | Hugging Face Datasets | `acne` | 11 | 11 | 0 | 0 | 11 | Every returned candidate lacked an independently verified original license/provenance/consent chain | https://huggingface.co/datasets |
| Q02 | 2026-07-13 | Hugging Face Models | `acne` | 61 | 61 | 0 | 0 | 61 | No screened weight artifact passed declared weight-license plus original training-data provenance gates | https://huggingface.co/models |
| Q03 | 2026-07-14 | ACNE04 author repository | licence/usage statement | 1 | 1 | 0 | 1 | 0 | Author limits free use to academic use and requests contact for other purposes | https://github.com/xpwu95/LDL |
| Q04 | 2026-07-14 | AcneSCU author repository | dataset licence statement | 1 | 1 | 0 | 0 | 1 | Dataset is expressly non-commercial despite permissive code licensing | https://github.com/pingguokiller/acnedetection |
| Q05 | 2026-07-14 | DermNet official licence | image licence, clause 25 | 1 | 1 | 0 | 0 | 1 | Website images are expressly prohibited for AI training/testing | https://dermnetnz.org/image-licence |
| Q06 | 2026-07-14 | DermNet official dataset page | licensed AI dataset | 1 | 1 | 0 | 1 | 0 | Paid custom rights, consent, DPA, split keys, and redistribution scope require owner/legal review | https://dermnetnz.org/dermatology-image-dataset |
| Q07 | 2026-07-13 | TorchVision official release/docs | MobileNetV3, EfficientNet | 2 architectures | 2 | 2 evaluation-only | 0 | 0 | Architecture definitions accepted with `weights=None`; upstream weights remain separate legal review | https://github.com/pytorch/vision |
| Q08 | 2026-07-13 | Official runtime/framework sources | MediaPipe, ONNX Runtime RN, scikit-learn | 3 | 3 | 3 evaluation-only | 0 | 0 | Smallest maintained stack identified; adoption still requires task-specific parity/performance gates | https://github.com/google-ai-edge/mediapipe |
| Q09 | 2026-07-14 | Google Research SCIN repository and licence | v1.0.0 / `601eb3c` / ACNE category | 1 | 1 | 0 | 1 | 0 | Broad copyright grant is not product-consent or personality-rights clearance; exact acne volume, label fitness, identity-safe splits, and external holdout remain unproven | https://github.com/google-research-datasets/scin |
| Q10 | 2026-07-14 | Google HAI-DEF official model card, FAQ, and terms | MedSigLIP 1.0.0 | 1 | 1 | 0 | 1 | 0 | Commercial applications are permitted subject to binding HAI-DEF terms, but adoption requires owner authorization and the model is not an acne classifier or initial mobile runtime | https://developers.google.com/health-ai-developer-foundations/medsiglip/model-card |
| Q11 | 2026-07-14 | ACNE-ECKH peer-reviewed article | data availability | 1 | 1 | 0 | 0 | 1 | Authors state the 8,242-image dataset cannot be shared for ethical, legal, and privacy reasons | https://pmc.ncbi.nlm.nih.gov/articles/PMC12024611/ |

## Results by task

- Acne lesion detection/classification/segmentation: no dataset or pretrained weight passed production-training gates. MobileNetV3 Small and EfficientNet-B0 uninitialized architectures may be benchmarked only after legitimate data exists.
- Dermatology representations: SCIN is tracked as `needs_legal_privacy_and_fit_review`; MedSigLIP is tracked as `needs_owner_legal_and_validation_approval`. Neither is approved for acquisition, training, zero-shot prediction, or activation.
- Capture quality: MediaPipe may be evaluated for privacy-safe framing/face readiness, never represented as lesion detection. Bundled asset terms require separate verification.
- Longitudinal/N-of-1: scikit-learn may support interpretable baselines and calibration only after a legitimate consented cohort exists. Deterministic readiness and descriptive analysis may proceed now.
- Mobile inference: `onnxruntime-react-native` is an evaluation candidate for checksum-verified approved artifacts in Expo development builds, subject to operator parity, size, latency, memory, battery, and corruption tests.
- Annotation and QA: CVAT, Label Studio, and FiftyOne are evaluation candidates; deployment/privacy/operational fit must be selected before adoption.
- Data validation, registry, and monitoring: add Pandera, MLflow, or Evidently only after a measured need. Existing schemas, hashes, Supabase lineage, Cloud Run metrics, and Vertex-compatible metadata are the initial stack.
- Deployment: FastAPI/Pydantic, Supabase/Postgres, Cloud Run, and optional governed Vertex remain the coherent platform. Ray, Kubernetes, Kubeflow, Feast, another vector database, and Convex are rejected absent measured need.

## Stop criteria and conclusion

Search stopped after returned Hugging Face candidates, commonly cited original acne sources, SCIN, ACNE-ECKH, and the current Google dermatology foundation models were screened without any candidate passing every independent licence, consent/personality-rights, privacy, task-fitness, split, and validation gate. Further mirror enumeration would not cure missing original rights.

There are **zero datasets approved for predictive or vision training** and **zero pretrained acne weights approved for production inference**. SCIN and MedSigLIP are explicit gated candidates, not approvals. Deterministic engines, contracts, annotation design, readiness states, static-knowledge review, and training entrypoints may proceed. No clinical model metrics may be claimed.

Longitudinal diary data remains observational. It must not be described as an N-of-1 trial or used for causal trigger/treatment claims unless a prospective intervention defines repeated periods, randomization or justified counterbalancing, carryover/washout handling, outcomes, adherence, and clinical/ethics oversight. Predictive evaluation must group by person and episode, enforce feature cutoffs before outcomes, use temporal gaps, and preserve an untouched external holdout.

## Limitations

Registry metadata is not legal clearance. Search counts are dated query results, not claims about corpus quality. Before installing or using any candidate, record an immutable version/commit, artifact hash, dependency provenance, exact licence texts, and task-specific security/performance evidence.
