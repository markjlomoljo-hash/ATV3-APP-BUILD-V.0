# AcneTrex live ML lead-scout evidence — 2026-07-15

Read-only audit. No production infrastructure was modified.

## Repository state

- Branch: `codex/railway-ml-worker-recovery`; `HEAD` and remote branch: `893f6f0`.
- PR #16 is open to `dev`, mergeable, with app/ML/mobile CI, Vercel, Railway, Gitar, and reviewer checks green.
- Working tree is materially dirty: 29 tracked files changed (2,353 insertions / 391 deletions) plus untracked consent, deletion, mobile cache/presentation, security, and migration files.
- Current uncommitted source passes root Vitest (60 files, 299 tests), TypeScript, and ESLint. Local Python verification is unavailable because the checked `.venv` has no pytest and no usable system Python/launcher.
- The uncommitted follow-up adds separate processing consent, result polling/cache/presentation, offline replay/resume, durable worker state recovery, `consumer_inbox` dedupe, lease/dead-letter handling, and migration `20260714143000_ml_delivery_state_reconciliation.sql`. These changes are not committed or deployed.

## Live infrastructure observed

- Vercel production health: `ok=true`, DB `connected`, schema `ready`, Cloud Run `healthy`, worker `configured`; only warning is `clerk_not_configured`.
- Vercel project `atv-3-app-build-v-0` has current Ready preview and production deployments.
- Cloud Run `mlatv`, region `europe-west1`, still serves revision `mlatv-00012-biw`; `/health/ready` reports artifact/registry/persistence ready, Vertex `verification_required`, predictive models `unavailable`.
- Vertex endpoint `5976620302904328192` exists in `us-central1`; `gcloud` output has no `deployedModels`, confirming zero deployed models.
- Railway project `eloquent-reprieve`, service `acnetrex-ml-worker`, deployment `bf28a208-dbd4-4f88-88fb-a19157d4935b` is online. `/health/ready` returned `ok=true`, `ready=true`, latest outcome `idle`; logs show continuous successful idle cycles.
- Supabase current schema was not mutated. Its durable job/result/outbox/inbox state is indirectly verified by green Vercel health and the live Railway worker's DB-backed readiness. The local reconciliation migration remains unapplied/uncommitted.

## Model and inference evidence

- `ml-service/requirements.txt` has FastAPI/Vertex/Postgres dependencies but no PyTorch, TensorFlow, scikit-learn, XGBoost, LightGBM, ONNX runtime, or equivalent predictive runtime.
- `ml-service/acnetrex_ml/training/` contains only `gate.py`; there is no ANN training loop, structured model trainer, ensemble, calibration fitter, artifact serializer, or artifact loader.
- `ml-service/manifests/model-registry.json` has `active_models=[]`; every predictive entry is `0.0.0-untrained`, rejected, with null artifact URI/hash.
- `ml-service/manifests/dataset-manifest.json` has `training_eligible_datasets=[]`.
- `ml-service/acnetrex_ml/service/app.py::_predict_core` always calls `dispatch_deterministic`. It imports `VertexAdapter` only for readiness status; it never invokes `VertexAdapter.predict`. Unsupported/heavy requests return queued/unavailable. Therefore deploying a Vertex model alone would still not place it in the inference graph.
- Railway worker calls Cloud Run `/predict`, validates the response, persists `ml_analysis_results`, updates the job, writes `consumer_inbox`, and marks the outbox processed. This path is reusable, but today Cloud Run can only produce deterministic outputs.
- Mobile submitted jobs are durable. The deployed/committed mobile path can queue jobs; the uncommitted path adds polling, encrypted cached results, foreground replay, and result rendering.

## Foundation-pack evidence

- Archive checksums match the handoff: V4 pack `DA937...DA14`; brain foundation `112AF...B0C7A`.
- V4 manifest calls itself a demonstration layer with synthetic schema-test rows and says it does not meet PRD targets.
- Brain-foundation validation inspected 48 files and found zero predictive training-eligible and zero validation-eligible files; no real subject-level cohort, no images, no leakage-safe holdout, and conflicting/malformed synthetic records.
- Brain artifact checksum manifest has `model_artifacts=[]` and explicitly states no model artifact exists because no supplied dataset passed the production training gate.

## Decisive failure causes

1. No legally approved labeled training snapshot or approved pretrained task model.
2. No ANN/structured/ensemble training or inference implementation.
3. No trained/serialized/checksummed artifact and no active registry entry.
4. Zero deployed Vertex models.
5. Cloud Run predictive routing is absent: Vertex is status-only, not called from prediction.
6. Mobile result polling/cache/rendering and consent reconciliation are only uncommitted local changes; signed physical-device validation is still absent.

## Canonical route to live predictive evidence

Keep the existing topology: Expo -> authenticated Vercel job API -> Supabase job/outbox -> Railway worker -> Cloud Run inference gateway -> Vertex endpoint (or Cloud Run local artifact for the first small structured model) -> Supabase result -> mobile poll/cache/render. Do not add a second inference API.

Implement one narrow, non-diagnostic structured target first. Add a deterministic feature builder, trainable MLP, strong tree/regularized baseline, calibrated ensemble, uncertainty/abstention, artifact bundle + checksums/model card, registry activation, Cloud Run routing that actually executes the active components, and telemetry exposing component contributions. Vertex is appropriate when a reviewed artifact exists; Cloud Run-local CPU serving is the fastest first proof if the model is small, while retaining the same contract and later Vertex promotion path.

## Owner/credential gates

- Owner/legal approval for a purpose-compatible dataset snapshot and target/label definition; dermatologist/clinical review for any severity/lesion claim.
- GCP owner authorization for training job, Artifact Registry/Cloud Storage artifact, Vertex upload/deploy/traffic, and Cloud Run revision promotion.
- Supabase migration approval for the uncommitted reconciliation migration and a controlled authenticated two-user E2E fixture.
- Merge/promotion approval for PR #16 and the uncommitted follow-up after tests/review.
- EAS login plus Apple/Google signing accounts and representative iOS/Android devices.

## Completion evidence required

One traceable request must show: mobile input and consent -> authenticated job ID -> outbox event -> Railway lease/process log -> Cloud Run revision -> active artifact checksum/model version -> ANN component output + structured component output -> calibrated ensemble prediction/uncertainty -> persisted result ID -> same result after refresh/re-login -> same result on idempotent replay -> cross-user denial -> retry/restart recovery. Random, hard-coded, mock, deterministic-only, or unavailable outputs do not satisfy this criterion.
