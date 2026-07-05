# AcneTrex ML Service

FastAPI service for the AcneTrex V3 Cloud Run ML backend.

This service is intentionally fail-closed:

- `/predict` validates AcneTrex payloads with Pydantic.
- `/predict` calls the configured Vertex AI endpoint for real inference.
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
CORS_ORIGINS=https://atv-3-app-build-v-0.vercel.app
CORS_ORIGIN_REGEX=https://.*\.vercel\.app
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
  --set-env-vars VERTEX_AI_PROJECT_ID=project-09bedce3-3c99-4a2b-aad,VERTEX_AI_LOCATION=us-central1,VERTEX_AI_ENDPOINT_ID=5976620302904328192,CORS_ORIGINS=https://atv-3-app-build-v-0.vercel.app,CORS_ORIGIN_REGEX=https://.*\\.vercel\\.app
```

Cloud Run's runtime service account must have `roles/aiplatform.user` before Vertex prediction can succeed.
