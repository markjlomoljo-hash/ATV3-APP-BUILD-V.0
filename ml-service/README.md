# AcneTrex ML Cloud Run Service

This service is the Cloud Run target behind the app route `/api/ml/predict`.
It never fabricates predictions: `/predict` forwards validated AcneTrex feature
payloads to the configured Vertex AI endpoint and returns `503` when Vertex is
not configured or unavailable.

## Required Environment Variables

- `VERTEX_AI_PROJECT_ID=project-09bedce3-3c99-4a2b-aad`
- `VERTEX_AI_LOCATION=us-central1`
- `VERTEX_AI_ENDPOINT_ID=5976620302904328192`
- `VERTEX_AI_ENDPOINT_DISPLAY_NAME=acnetrex-endpoint`
- `CORS_ORIGINS=https://atv-3-app-build-v-0.vercel.app`
- `CORS_ORIGIN_REGEX=https://.*\.vercel\.app`

## Local Run

```bash
pip install -r requirements.txt
uvicorn app.main:app --host 0.0.0.0 --port 8080
```

## Deploy

From the repository root, after authenticating `gcloud`:

```bash
gcloud config set project project-09bedce3-3c99-4a2b-aad
gcloud builds submit --config cloudbuild.yaml
```

Cloud Run still requires its runtime service account to have
`roles/aiplatform.user` for the project before Vertex prediction can succeed.
