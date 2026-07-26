# AcneTrex ML resource discovery log

## Scope and decision rule

Searches were performed on 2026-07-13, rechecked on 2026-07-14, and extended with a targeted individual-inspection pass on 2026-07-26 (Asia/Manila) using authoritative registries, original publisher repositories, and official documentation. No access control was bypassed. Code, model weights, and data are independently licensed: a permissive code license does not grant rights to bundled weights or training data.

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
| Q09 | 2026-07-26 | Hugging Face Models | google/derm-foundation model card + HAI-DEF terms | 1 | 1 | 0 | 1 | 0 | HAI-DEF commercial-with-conditions terms (Health Regulatory Authorization for clinical/severity claims; medical-device manufacturer clause; no-diagnosis) require counsel review; provenance documented (US/Colombia/Australia) | https://huggingface.co/google/derm-foundation |
| Q10 | 2026-07-26 | Hugging Face Models | individual inspection: imfarzanansari/skintelligent-acne; naamalia23/acne-severity-classification; Hemg/Acne-classification | 3 | 3 | 0 | 0 | 3 | Permissive weight licences with undisclosed training data; one card self-reports 97.96% accuracy after 2 epochs, a leakage red flag | https://huggingface.co/models |
| Q11 | 2026-07-26 | Hugging Face Datasets | individual inspection: ManuelHettich/acne04; huynhnhu213/acne; RahulPil/Dermi_Acne_Dataset; Neperl/skin-disease-acne-rosacea-normal; UniqueData bags | 5 | 5 | 0 | 0 | 5 | Inherited academic-only terms, uploader-asserted or missing licences, or cc-by-nc-nd-4.0 restrictions; none passes the production gate | https://huggingface.co/datasets |
| Q12 | 2026-07-26 | scikit-learn 1.9.0 official docs | CalibratedClassifierCV | 1 | 1 | 1 | 0 | 0 | BSD-3 code accepted for calibrated-head pipeline scaffolding; production training remains dataset-gated | https://scikit-learn.org/stable/modules/generated/sklearn.calibration.CalibratedClassifierCV.html |
| Q13 | 2026-07-26 | Hugging Face Datasets | research_baseline scout: `acne`, `skin disease`, `skin condition`, `acne grading`, `facial skin`, `dermatology`, `skin lesion` (full=true) | ~45 licensed hits triaged | 45 | 0 | 1 | 44 | No candidate cleared the research_baseline bar (permissive HF tag + publisher_declared provenance) as a scout-level accept; strongest lead routed to legal review | https://huggingface.co/api/datasets?search=acne&full=true |
| Q14 | 2026-07-26 | Hugging Face Dataset (downloaded + pixel-inspected) | huynhnhu213/acne rev `c97d168f` (10000 imgs) | 1 | 1 | 0 | 0 | 1 | apache-2.0 tag disproven by embedded `(c)Dermnet`/`(c)VisualDx` watermarks (Acne class) and non-consented celebrity press photos (Non_Acne class); severe dup/leakage | https://huggingface.co/datasets/huynhnhu213/acne |
| Q15 | 2026-07-26 | Google SCIN + HF mirror (metadata only) | HawkFranklin-Research/SCIN-Dermatology-Raw-Images; canonical google-research-datasets/scin LICENSE | 1 | 1 | 0 | 1 | 0 | Substantively permissive custom SCIN Data Use License but not on enumerated allowlist; mirror mislabels licence as mit; ~8 GB over the 3 GB budget | https://github.com/google-research-datasets/scin |

## 2026-07-26 recheck findings

The 2026-07-26 pass individually inspected the specific Hugging Face candidates named above instead of relying on aggregate search screening, so future runs should not re-litigate them; per-item dispositions and evidence live in the candidate registers and `rejected-resources.md`.

- `google/derm-foundation` (gated, BiT-M ResNet101x3, 6144-dim embeddings) is the best licence-plus-provenance combination found to date and advances to `needs_legal_review`: HAI-DEF terms allow commercial use with conditions, but the Health Regulatory Authorization requirement for clinical/severity claims, the medical-device manufacturer clause, and the no-diagnosis restriction need counsel sign-off before any download or use. Access requires an HF account that accepted the HAI-DEF terms plus an owner-supplied `HF_TOKEN` environment variable.
- The three inspected acne models remain `rejected_for_production` on provenance grounds (undisclosed training data; one implausible self-reported metric); they are permitted only as research/baseline references.
- The five inspected acne dataset uploads all fail the production gate (inherited academic-only ACNE04 terms, uploader-asserted apache-2.0 with no provenance chain, missing licences, or cc-by-nc-nd-4.0).
- scikit-learn 1.9.0 `CalibratedClassifierCV` (BSD-3) is accepted now for the calibrated-head pipeline scaffold; torchvision MobileNetV3-Small/EfficientNet-B0 architecture definitions stay usable with `weights=None`, and ImageNet weights stay `needs_legal_review`.
- The decided predictive paths (Path A: derm-foundation frozen embeddings + calibrated sklearn head on a rights-cleared dataset; Path B: interim research-only torchvision baseline on ACNE04 academic terms, non-shippable) are recorded in `docs/ml/ARCHITECTURE_DECISION.md` and `docs/ml/TRAINING_AND_PROMOTION.md`.

## 2026-07-26 research_baseline dataset-scout pass

A second 2026-07-26 pass searched Hugging Face Datasets specifically for an open, permissively-licensed acne/skin-condition IMAGE dataset trainable at the `research_baseline` tier (real training, held-out metrics, calibrated + abstaining, non-clinical/non-diagnostic). The bar was a permissive HF licence tag (apache-2.0 / mit / cc-by-4.0 / cc0-1.0 / openrail) whose provenance is at least publisher_declared and not affirmatively contradicted. The machine-readable outcome is `/home/user/ml-data/dataset-record.json`.

- **huynhnhu213/acne (apache-2.0, 10000 imgs) - REJECTED, hard.** Downloaded (rev `c97d168f`) and pixel-inspected. The apache-2.0 tag is affirmatively false: the Acne class is DermNet + VisualDx atlas content (both restricted; DermNet clause 25 bans AI training) and the Non_Acne class is copyrighted celebrity press photos of identifiable people with no consent (evidence grids under `/home/user/ml-data/inspection/`). Also 1433 exact-dup files (902 cross-split groups) and 35.5% of the publisher eval split has a train near-dup; the apparent 50/50 balance is a duplication artifact. This upgrades the prior `rejected_for_production` disposition to `rejected`.
- **Google SCIN via HawkFranklin-Research/SCIN-Dermatology-Raw-Images - needs_legal_review (strongest lead).** 6517 imgs / 3061 cases / 211 diagnoses incl. Acne (123 imgs); has `case_id` (leakage-safe group splits), Fitzpatrick/Monk skin-tone metadata, and documented Google informed-consent provenance (Ward et al., JAMA Netw Open 2024). Not accepted this wave because the governing licence is the custom **SCIN Data Use Public License** (permissive but off the enumerated allowlist), the only HF distribution mislabels it as `mit`, and the ~8 GB mirror exceeds the 3 GB download budget (only metadata.csv was fetched).
- **All other permissive-tagged candidates rejected:** notable12/AICamp (DermNet-derived); ahmed-ai / BMN95 / SeyedAli / makhresearch / jtz18 (HAM10000/ISIC dermoscopy - MIT/CC0 tags launder CC-BY-NC, no acne, several segmentation-only); electricsheepafrica (synthetic CSV, no images); titanite09 (empty). ACNE04 mirrors, no-licence uploads, and cc-by-nc-nd bags were not re-litigated.

Conclusion: **zero datasets accepted** at the research_baseline tier this wave; the bar was not lowered. SCIN is the recommended lead pending counsel review of the custom SCIN Data Use License and a rights-clean download from the canonical Google source. The production/clinical training gate is unaffected and stays blocked.

## Results by task

- Acne lesion detection/classification/segmentation: no dataset or pretrained weight passed production-training gates. MobileNetV3 Small and EfficientNet-B0 uninitialized architectures may be benchmarked only after legitimate data exists.
- Capture quality: MediaPipe may be evaluated for privacy-safe framing/face readiness, never represented as lesion detection. Bundled asset terms require separate verification.
- Longitudinal/N-of-1: scikit-learn may support interpretable baselines and calibration only after a legitimate consented cohort exists. Deterministic readiness and descriptive analysis may proceed now.
- Mobile inference: `onnxruntime-react-native` is an evaluation candidate for checksum-verified approved artifacts in Expo development builds, subject to operator parity, size, latency, memory, battery, and corruption tests.
- Annotation and QA: CVAT, Label Studio, and FiftyOne are evaluation candidates; deployment/privacy/operational fit must be selected before adoption.
- Data validation, registry, and monitoring: add Pandera, MLflow, or Evidently only after a measured need. Existing schemas, hashes, Supabase lineage, Cloud Run metrics, and Vertex-compatible metadata are the initial stack.
- Deployment: FastAPI/Pydantic, Supabase/Postgres, Cloud Run, and optional governed Vertex remain the coherent platform. Ray, Kubernetes, Kubeflow, Feast, another vector database, and Convex are rejected absent measured need.

## Stop criteria and conclusion

Search stopped after all returned Hugging Face candidates and the commonly cited original acne sources were screened without any candidate passing the independent licence/provenance/consent gate. Further mirror enumeration would not cure missing original rights.

There are **zero datasets accepted for predictive or vision training** and **zero pretrained acne weights accepted**. Deterministic engines, contracts, annotation design, readiness states, static-knowledge review, and training entrypoints may proceed. No clinical model metrics may be claimed.

Addendum 2026-07-26: this conclusion is unchanged after the targeted recheck. One gated backbone (`google/derm-foundation`) advanced to `needs_legal_review`; nothing was accepted for production training or inference, and the training gate continues to exit `training_blocked/no_approved_training_dataset`.

## Limitations

Registry metadata is not legal clearance. Search counts are dated query results, not claims about corpus quality. Before installing or using any candidate, record an immutable version/commit, artifact hash, dependency provenance, exact licence texts, and task-specific security/performance evidence.
