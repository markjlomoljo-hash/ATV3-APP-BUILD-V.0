# AcneTrex ML Service

FastAPI service for the AcneTrex V3 Cloud Run ML backend.

This service is intentionally fail-closed:

- `/predict` validates AcneTrex payloads with Pydantic.
- `/predict` calls the configured Vertex AI endpoint for real inference.
- `/predict` requires a server-only bearer secret shared with the trusted API proxy.
- If Vertex is not configured or unavailable, `/predict` returns HTTP `503`.
- It never generates mock acne scores, severity labels, Skin Twin projections, or FaceAtlas results.

## Endpoints

- `GET /` - service metadata
- `GET /health` - service and Vertex configuration status
- `POST /predict` - validated prediction proxy to Vertex AI

## Required Environment

```env
VERTEX_AI_PROJECT_ID=project-09bedce3-3c99-4a2b-aad
VERTEX_AI_LOCATION=us-central1
VERTEX_AI_ENDPOINT_ID=5976620302904328192
VERTEX_AI_ENDPOINT_DISPLAY_NAME=acnetrex-endpoint
VERTEX_AI_TIMEOUT_SECONDS=20
ACNETREX_ML_SHARED_SECRET=generate-and-store-in-secret-manager
CORS_ORIGINS=https://atv-3-app-build-v-0.vercel.app
```

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

Cloud Run's runtime service account must have `roles/aiplatform.user` before Vertex prediction can succeed.
The runtime service account must also be allowed to read the
`acnetrex-ml-shared-secret` Secret Manager secret. Configure the same value as
`ACNETREX_ML_SHARED_SECRET` in Vercel; never expose it through `NEXT_PUBLIC_*`.
Vertex calls use a bounded timeout from `VERTEX_AI_TIMEOUT_SECONDS` (default 20
seconds, clamped to 1-60 seconds) so an unavailable endpoint fails closed.
