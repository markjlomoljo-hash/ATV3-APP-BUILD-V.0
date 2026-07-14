# Rejected and restricted ML resources

No item in this document is approved for production training or active inference.

| Resource | Status | Decision | Evidence | What would change the decision |
|---|---|---|---|---|
| AcneSCU dataset | rejected | Exclude from commercial training/testing | Author repository expressly limits dataset to non-commercial use; Apache-2.0 applies to code, not the dataset | Written commercial permission covering training, deployment, derivatives, retention, and redistribution plus consent/provenance review |
| ACNE04 | needs_legal_review | Exclude pending rights review | Author repository says free for academic usage and requests contact for other purposes | Signed commercial licence and verified participant consent/provenance, deidentification, identity keys, and label/QC documentation |
| DermNet website images | rejected | Reference browsing only under site terms | Official image licence clause 25 prohibits use for AI training/testing | A separate signed DermNet dataset agreement; the website licence itself is not sufficient |
| DermNet licensed AI dataset | needs_legal_review | No access/use before procurement and legal review | Official page advertises a paid deidentified dataset; custom scope is not public clearance | Signed licence/DPA with task, commercial, derivative, retention/deletion, redistribution, consent, and identity-safe split rights |
| Hugging Face acne dataset/model mirrors | rejected | Do not train from or load | Mirror metadata cannot grant original data/weight rights; 11 dataset and 61 model results produced no passing candidate | Immutable revision, original provenance chain, explicit weight/data licences, consent evidence, hashes, and independent evaluation |
| V4 AcneTrex pack | accepted_for_non_training | Use only corrected cleared static content, contracts, and synthetic fixtures | No images or real longitudinal cohort; malformed, duplicate, contradictory, and non-redistributable-source records | A new governed real dataset snapshot with valid labels, rights, consent, QC, grouped temporal splits, and external holdout |
| TorchVision ImageNet weights | needs_legal_review | Architecture definitions with `weights=None` only | Code licence and upstream weight/training-data terms are separate | Counsel-approved production rights/attribution and immutable artifact hash |
| MediaPipe | evaluation_candidate | Framing/capture quality only | Task fit does not make it a lesion detector; bundled asset terms remain separate | Asset licence verification plus privacy, parity, and physical-device performance evidence |
| Ray/Kubernetes/Kubeflow/Feast/alternate vector DB/Convex | rejected | Do not add | No measured need; conflicts with the smallest coherent Supabase/Cloud Run/Vertex topology | A measured reliability/performance gap that existing infrastructure cannot satisfy and an approved architecture decision |

## Reconsideration requirements

A rejected or restricted data/model resource requires a documented provenance chain; signed commercial and redistribution rights; participant consent compatible with ML use; deidentification, retention, and deletion terms; immutable version and hashes; label taxonomy/QC; identity/episode keys for leakage-safe splits; population representation evidence; and a genuinely independent holdout. Passing legal review does not imply clinical validation or model approval.
