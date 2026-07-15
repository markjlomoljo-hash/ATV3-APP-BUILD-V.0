# AcneTrex v3: Codex ML Integration & Railway Deployment Brief

This document serves as the canonical handoff for **Codex** to deploy the ML intelligence layer on Railway and wire it to the live AcneTrex v3 infrastructure. The application layer (mobile + web) and database schema are **100% complete and production-ready**. 

The app operates on a **zero-fabrication contract**: if the ML layer is offline or hasn't processed data, the app displays honest `not_configured` or `insufficient_data` states. Codex's objective is to bring the ML layer online to populate these tables.

---

## 1. System Architecture & The Outbox Pattern

AcneTrex v3 uses a decoupled **Transactional Outbox Pattern** to guarantee reliable ML execution without blocking the client.

1. **Client Request:** The mobile app requests analysis (e.g., a new Skin Twin scenario).
2. **API Gateway:** The Next.js API (`/api/ml/jobs`) writes a row to `ml_analysis_jobs` (status: `queued`) and a row to `outbox_events` in a single database transaction.
3. **Outbox Processor:** A server-side cron job (`/api/internal/ml/worker`) claims pending `outbox_events` and forwards them via HTTP POST to the external ML Worker.
4. **ML Worker (Railway/Cloud Run):** Receives the payload, performs inference, and writes the results back to the database.

**Codex Objective:** You are building the **ML Worker** (Step 4). You do not need to modify the Next.js app or the mobile app.

---

## 2. Supabase Database Contracts

The ML worker must read from and write to the following live Supabase tables. 

### Core ML Tables

| Table | Purpose | ML Worker Responsibility |
|-------|---------|---------------------------|
| `ml_analysis_jobs` | Tracks the state of all ML requests. | Read input features; update `status` to `processing`, then `completed` or `failed`. |
| `ml_analysis_results` | Stores the universal result lineage. | Insert a new row for every completed job containing confidence, limitations, and the JSON result. |
| `trigger_hypotheses` | TriggerGraph output. | Insert/update rows when the `triggergraph` engine completes a job. |
| `forecasts` | ClearPath forecast output. | Insert new 7-day severity forecasts when the `forecast` engine completes. |
| `forecast_summaries` | Human-readable forecast context. | Insert summary text alongside the forecast. |
| `skin_twin_snapshots` | Skin Twin scenario output. | Update the `simulation` JSONB column and `status` when a `skin_twin` job completes. |

### The `ml_analysis_jobs` Schema

When the ML worker receives a payload, it will include the `jobId`. The worker must query this table:

```sql
SELECT engine, operation, features, input_record_refs 
FROM public.ml_analysis_jobs 
WHERE id = $1;
```

**Supported Engines:**
- `faceatlas`: Lesion analysis and capture quality.
- `triggergraph`: Association analysis (diet/sleep/stress vs. breakouts).
- `forecast`: ClearPath 7-day severity prediction.
- `skin_twin`: Scenario validation and simulation.
- `cutisai`: Evidence retrieval and RAG assistance.

---

## 3. The ML Worker API Contract (Railway)

The Next.js outbox processor expects the ML Worker to expose a specific HTTP endpoint.

### Endpoint: `POST /api/v1/inference`

**Authentication:**
The worker must require a Bearer token matching the `ACNETREX_ML_SHARED_SECRET` environment variable.

**Request Payload (from Next.js to ML Worker):**
```json
{
  "contract_version": "1.0.0",
  "request_id": "uuid-v4",
  "idempotency_key": "uuid-v4",
  "module": "skin_twin",
  "task": "scenario_validation",
  "runtime_preference": "cloud",
  "feature_schema_version": "1.0.0",
  "input_record_refs": ["skin_state_logs:123", "treatment_plans:456"],
  "inputs": {
    "scenarioId": "uuid-v4",
    "targetDurationDays": 90
  },
  "context": { "timezone": "UTC", "locale": "en" },
  "consent": {
    "personal_processing": true,
    "raw_image_processing": false,
    "anonymous_learning": true
  }
}
```

**Response Payload (from ML Worker to Next.js):**
The worker must return a `200 OK` with the following schema, confirming it has processed the job and updated the database.

```json
{
  "ok": true,
  "request_id": "uuid-v4",
  "job_id": "uuid-v4",
  "module": "skin_twin",
  "task": "scenario_validation",
  "result_type": "skin_twin_simulation",
  "result": { /* Engine specific output */ },
  "runtime_mode": "cloud_run",
  "runtime_provider": "vertex_ai",
  "readiness_state": "ready",
  "model_name": "gemini-1.5-pro",
  "model_version": "001",
  "training_data_version": null,
  "feature_schema_version": "1.0.0",
  "input_record_refs": ["skin_state_logs:123"],
  "features_used": ["scenarioId"],
  "features_missing": [],
  "sample_count": 42,
  "coverage": 1.0,
  "confidence": 0.85,
  "confidence_label": "high",
  "calibration_state": "not_applicable",
  "uncertainty": ["Individual response to retinoids varies"],
  "limitations": [],
  "confounders": [],
  "evidence_state": "available",
  "safety_state": "ready",
  "sync_status": "synced",
  "latency_ms": 1450,
  "created_at": "2026-07-15T12:00:00Z"
}
```

---

## 4. Railway Deployment Instructions

Codex should deploy the ML Worker (typically a Python FastAPI application) to Railway.

### Required Environment Variables (Railway)

Codex must configure these variables in the Railway project:

```env
# Server authentication
ACNETREX_ML_SHARED_SECRET=<GENERATE_A_SECURE_RANDOM_STRING>

# Supabase connection (Direct PostgreSQL connection for pgvector/RAG)
DATABASE_URL=postgresql://postgres.[project-ref]:[password]@aws-0-[region].pooler.supabase.com:6543/postgres?pgbouncer=true

# Supabase service role (for bypassing RLS during background processing)
SUPABASE_URL=https://[project-ref].supabase.co
SUPABASE_SERVICE_ROLE_KEY=ey...

# AI Provider (Choose one based on implementation)
OPENAI_API_KEY=sk-...
# OR
VERTEX_AI_PROJECT_ID=...
```

### Vercel Configuration Updates

Once the Railway service is deployed, the Vercel Next.js application must be updated to point to it.

**Update these variables in Vercel:**
```env
# Enable the outbox processor
ACNETREX_ML_WORKER_ENABLED=true
CRON_SECRET=<A_SECURE_STRING_FOR_VERCEL_CRON>

# Point to the Railway deployment
ACNETREX_ML_API_URL=https://[your-railway-app-url]
NEXT_PUBLIC_ACNETREX_ML_API_URL=https://[your-railway-app-url]
VITE_ACNETREX_ML_API_URL=https://[your-railway-app-url]

# Authentication matching Railway
ACNETREX_ML_SHARED_SECRET=<THE_SAME_SECRET_FROM_RAILWAY>
```

---

## 5. Implementation Priorities for Codex

1. **TriggerGraph (Highest Impact):** Implement the `triggergraph` engine first. Query the user's `food_logs`, `sleep_logs`, and `skin_state_logs`, run correlation analysis, and insert rows into `trigger_hypotheses`.
2. **ClearPath Forecast:** Implement the `forecast` engine. Analyze the recent trajectory and insert a 7-day prediction into `forecasts` and `forecast_summaries`.
3. **Skin Twin:** Implement the `skin_twin` engine. Update the `skin_twin_snapshots` table with the simulation JSON based on the requested scenario.
4. **CutisAI (RAG):** Implement the `cutisai` engine. Read from `cutisai_conversations` and `cutisai_messages`, perform pgvector similarity search on `user_memory_facts` and external medical guidelines, and insert the assistant's response back into `cutisai_messages`.

**Crucial Rule:** The ML worker MUST update the `ml_analysis_jobs` row `status` to `completed` (or `failed`) when finished. If it fails to do this, the Next.js outbox will consider the job stalled and attempt to retry it.
