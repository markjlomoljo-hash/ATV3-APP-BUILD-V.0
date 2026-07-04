import os
import json
import logging
from fastapi import FastAPI, HTTPException
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from google.cloud import aiplatform
from typing import Optional

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI()

# ---- CORS Configuration ----
CORS_ORIGINS = os.getenv("CORS_ORIGINS", "https://atv-3-app-build-v-0.vercel.app").split(",")
CORS_ORIGIN_REGEX = os.getenv("CORS_ORIGIN_REGEX", "https://.*\\.vercel\\.app")

app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_origin_regex=CORS_ORIGIN_REGEX,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---- Vertex AI Configuration ----
VERTEX_AI_PROJECT_ID = os.getenv("VERTEX_AI_PROJECT_ID")
VERTEX_AI_LOCATION = os.getenv("VERTEX_AI_LOCATION", "us-central1")
VERTEX_AI_ENDPOINT_ID = os.getenv("VERTEX_AI_ENDPOINT_ID")

# Initialize Vertex AI client if credentials are available
vertex_endpoint: Optional[aiplatform.Endpoint] = None
if VERTEX_AI_PROJECT_ID and VERTEX_AI_ENDPOINT_ID:
    try:
        aiplatform.init(project=VERTEX_AI_PROJECT_ID, location=VERTEX_AI_LOCATION)
        vertex_endpoint = aiplatform.Endpoint(VERTEX_AI_ENDPOINT_ID)
        logger.info(f"Vertex AI endpoint initialized: {VERTEX_AI_ENDPOINT_ID}")
    except Exception as e:
        logger.error(f"Failed to initialize Vertex AI endpoint: {e}")
        vertex_endpoint = None
else:
    logger.warning(
        "VERTEX_AI_PROJECT_ID or VERTEX_AI_ENDPOINT_ID not configured. "
        "Vertex AI predictions will return 503."
    )


@app.get("/")
def root():
    """Root endpoint returning service metadata."""
    return {
        "ok": True,
        "service": "acnetrex-ml",
        "version": "1.0.0",
        "health": "/health",
        "predict": "/predict",
    }


@app.get("/health")
def health():
    """Health check endpoint."""
    vertex_status = "configured" if vertex_endpoint else "not_configured"
    return {
        "ok": True,
        "service": "acnetrex-ml",
        "vertexEndpointId": VERTEX_AI_ENDPOINT_ID or "not_configured",
        "vertexLocation": VERTEX_AI_LOCATION,
        "vertexStatus": vertex_status,
    }


@app.post("/predict")
async def predict(payload: dict):
    """
    Prediction endpoint. Forwards requests to Vertex AI endpoint if available.
    Returns 503 if Vertex AI is not configured or unavailable.
    """
    if not vertex_endpoint:
        logger.warning(
            "Vertex AI endpoint not available. Request cannot be processed. "
            f"PROJECT_ID={VERTEX_AI_PROJECT_ID}, ENDPOINT_ID={VERTEX_AI_ENDPOINT_ID}"
        )
        raise HTTPException(
            status_code=503,
            detail={
                "ok": False,
                "error": "vertex_endpoint_unavailable",
                "message": "Vertex AI endpoint is not configured or unavailable.",
            },
        )

    try:
        logger.info(f"Sending prediction request to Vertex AI endpoint {VERTEX_AI_ENDPOINT_ID}")
        
        # Prepare the instance for Vertex AI prediction
        instances = [payload]
        
        # Call the Vertex AI endpoint
        response = vertex_endpoint.predict(instances=instances)
        
        # Extract predictions
        predictions = response.predictions if hasattr(response, "predictions") else []
        
        logger.info(f"Vertex AI prediction successful. Got {len(predictions)} prediction(s).")
        
        return {
            "ok": True,
            "predictions": predictions,
            "model_version": os.getenv("MODEL_VERSION", "unknown"),
        }
    except Exception as e:
        logger.error(f"Vertex AI prediction failed: {e}", exc_info=True)
        raise HTTPException(
            status_code=503,
            detail={
                "ok": False,
                "error": "vertex_prediction_failed",
                "message": str(e),
            },
        )


if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", 8080))
    uvicorn.run(app, host="0.0.0.0", port=port)
