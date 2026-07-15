# AcneTrex ML Service

FastAPI service for the AcneTrex V3 Cloud Run analysis backend.

This service is intentionally fail-closed:

- Prediction routes validate the canonical request and response contracts with Pydantic.
- Production requires a server-only bearer secret shared with the Railway worker.
- Deterministic engines return only observed summaries and readiness states.
- Predictive inference loads exactly one `approved` or `active` local artifact for the requested task, confines the artifact path to the registry root, verifies its SHA-256, and validates registry/artifact lineage.
- Missing, rejected, ambiguous, remote-only, tampered, or malformed artifacts fail closed.
- The checked-in registry has no active model. Predictive output remains unavailable until a lawful governed snapshot is trained, independently evaluated, documented, and manually approved.
- Vertex configuration is exposed as readiness metadata only; it is not a substitute for the checksum-verified artifact runtime.

## Endpoints

- `GET /` - service metadata
- `GET /health/live` - liveness
- `GET /health/ready` - persistence, registry, artifact, and Vertex configuration status
- `GET /v1/models` - model registry entries
- `POST /predict` - canonical inference
- `POST /api/v1/inference` and `POST /v1/predict` - compatibility aliases to the same handler
- `POST /v1/batch` - bounded batch inference

Application job creation, owner-scoped feature loading, result persistence, and outbox completion belong exclusively to Next.js. FastAPI exposes no application job routes and does not use the application database.

## Required Environment

```env
VERTEX_AI_PROJECT_ID=project-09bedce3-3c99-4a2b-aad
VERTEX_AI_LOCATION=us-central1
VERTEX_AI_ENDPOINT_ID=5976620302904328192
VERTEX_AI_ENDPOINT_DISPLAY_NAME=acnetrex-endpoint
VERTEX_AI_TIMEOUT_SECONDS=20
ACNETREX_ML_SHARED_SECRET=generate-and-store-in-secret-manager
CORS_ORIGINS=https://atv-3-app-build-v-0.vercel.app
MODEL_REGISTRY_PATH=/app/manifests/model-registry.json
ARTIFACT_CHECKSUM_MANIFEST=/app/manifests/artifact-checksums.json
```

## Governed predictive training

The training pipeline fits a regularized logistic structured baseline, a true
residual MLP, learned ensemble weighting, and Platt calibration. Participants
are disjoint across train, calibration, and untouched temporally ordered
holdout cohorts. It accepts only a manifest entry already admitted by the
governance gate and verifies the materialized snapshot checksum before parsing
rows.

```bash
cd ml-service
python scripts/train_predictive.py \
  --manifest manifests/dataset-manifest.json \
  --snapshot /governed/input/snapshot.jsonl \
  --task flare_direction \
  --features sleep_hours stress_score \
  --model-name flare_direction_ensemble_v1 \
  --model-version 1.0.0-candidate \
  --output /governed/output
```

Export always produces a `candidate` registry entry with
`pending_manual_review`; it never changes the production registry or promotes
a model. Synthetic rows are permitted only in tests and cannot pass the
production dataset gate.

## Local Run

```bash
pip install -r requirements.txt
uvicorn main:app --host 0.0.0.0 --port 8080
```

## Deploy

From repository root:

```bash
gcloud config set project project-09bedce3-3c99-4a2b-aad
gcloud builds submit --config cloudbuild.yaml
```

Or from this folder:

```bash
gcloud run deploy mlatv \
  --source . \
  --region europe-west1 \
  --allow-unauthenticated \
  --set-env-vars VERTEX_AI_PROJECT_ID=project-09bedce3-3c99-4a2b-aad,VERTEX_AI_LOCATION=us-central1,VERTEX_AI_ENDPOINT_ID=5976620302904328192,CORS_ORIGINS=https://atv-3-app-build-v-0.vercel.app \
  --set-secrets ACNETREX_ML_SHARED_SECRET=acnetrex-ml-shared-secret:latest
```

Cloud Run's runtime service account must have `roles/aiplatform.user` before a future Vertex adapter can invoke an endpoint.
The runtime service account must also be allowed to read the
`acnetrex-ml-shared-secret` Secret Manager secret. Configure the same value as
`ACNETREX_ML_SHARED_SECRET` in Vercel; never expose it through `NEXT_PUBLIC_*`.
Vertex status checks use a bounded timeout from `VERTEX_AI_TIMEOUT_SECONDS`
(default 20 seconds, clamped to 1-60 seconds).
