# AcneTrex ML Service

Real-time ML inference service for AcneTrex V3, deployed on Google Cloud Run.

## Overview

This service provides a FastAPI-based ML prediction endpoint that integrates with Google Vertex AI for acne scoring and analysis. It is deployed as a containerized service on Google Cloud Run.

## Endpoints

- `GET /` — Service metadata
- `GET /health` — Health check and Vertex AI status
- `POST /predict` — Send prediction request (requires Vertex AI configuration)

## Local Development

### Prerequisites

- Python 3.11+
- Google Cloud SDK (`gcloud`)
- Active Vertex AI endpoint in GCP

### Setup

```bash
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
```

### Running Locally

```bash
export VERTEX_AI_PROJECT_ID=project-09bedce3-3c99-4a2b-aad
export VERTEX_AI_LOCATION=us-central1
export VERTEX_AI_ENDPOINT_ID=5976620302904328192
python main.py
```

Visit `http://localhost:8080/docs` for interactive API documentation.

## Deployment to Cloud Run

### Prerequisites

- `gcloud` CLI authenticated and configured
- GCP project with Vertex AI enabled
- Docker installed locally

### Deploy

```bash
cd ml-service

gcloud config set project project-09bedce3-3c99-4a2b-aad

gcloud run deploy mlatv \
  --source . \
  --region europe-west1 \
  --allow-unauthenticated \
  --set-env-vars \
    VERTEX_AI_PROJECT_ID=project-09bedce3-3c99-4a2b-aad,\
    VERTEX_AI_LOCATION=us-central1,\
    VERTEX_AI_ENDPOINT_ID=5976620302904328192,\
    CORS_ORIGINS=https://atv-3-app-build-v-0.vercel.app,\
    CORS_ORIGIN_REGEX=https://.*\.vercel\.app
```

## Environment Variables

| Variable | Required | Example | Purpose |
|----------|----------|---------|---------|
| `VERTEX_AI_PROJECT_ID` | Yes | `project-09bedce3-3c99-4a2b-aad` | GCP project ID |
| `VERTEX_AI_LOCATION` | No | `us-central1` | Vertex AI endpoint region |
| `VERTEX_AI_ENDPOINT_ID` | Yes | `5976620302904328192` | Vertex AI endpoint ID |
| `CORS_ORIGINS` | No | `https://atv-3-app-build-v-0.vercel.app` | Allowed CORS origins (comma-separated) |
| `CORS_ORIGIN_REGEX` | No | `https://.*\.vercel\.app` | Allowed CORS origin regex pattern |
| `PORT` | No | `8080` | Server port |

## API Usage

### Prediction Request

```bash
curl -X POST https://mlatv-pudz4xjzxa-ew.a.run.app/predict \
  -H "Content-Type: application/json" \
  -d '{"image_features": [...], "metadata": {...}}'
```

### Response

**Success (200)**

```json
{
  "ok": true,
  "predictions": [
    {
      "acne_score": 0.75,
      "severity": "moderate",
      "confidence": 0.92
    }
  ],
  "model_version": "v1.0"
}
```

**Error — No Vertex AI (503)**

```json
{
  "ok": false,
  "error": "vertex_endpoint_unavailable",
  "message": "Vertex AI endpoint is not configured or unavailable."
}
```

## No Fake Predictions

This service **never generates mock or fake predictions**. It will return HTTP 503 with a clear error message if:

- Vertex AI endpoint is not configured
- Vertex AI endpoint is unreachable
- The deployed model fails to process the request

This ensures data integrity and prevents silent failures.

## Logging

All requests and errors are logged to Cloud Logging. Check logs with:

```bash
gcloud run logs read mlatv --region europe-west1 --limit 50
```

## Troubleshooting

### 503 Vertex Endpoint Unavailable

Ensure:
1. `VERTEX_AI_PROJECT_ID` and `VERTEX_AI_ENDPOINT_ID` are set correctly
2. The endpoint exists and is deployed in the specified project
3. The Cloud Run service has Vertex AI API permissions

### CORS Errors

Verify:
1. `CORS_ORIGINS` includes the frontend URL exactly (protocol, domain, port)
2. Or `CORS_ORIGIN_REGEX` matches the frontend URL pattern

### Slow Predictions

Check:
1. Vertex AI endpoint resource allocation
2. Network latency from europe-west1 to us-central1 (Vertex location)
3. Model inference time in Vertex AI logs
