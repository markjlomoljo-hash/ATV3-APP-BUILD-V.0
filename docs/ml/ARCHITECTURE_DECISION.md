# Railway-owned ML persistence architecture decision

Status: Design B is deployed and production verified for deterministic/bootstrap inference. Governed learned-model activation and physical-device release validation remain gated in `LIVE_VERIFICATION.md`.

AcneTrex uses one strict versioned inference contract across Expo, Next.js, the outbox worker, and the Railway `acnetrex-ml` FastAPI service. The Supabase Auth UUID is the canonical subject. Clients create consent-bound jobs through `/api/ml/jobs`; the sole Railway scheduler claims the outbox and calls canonical `POST /api/v1/inference`. Temporary `POST /predict` and `POST /v1/predict` compatibility routes use the same handler. The stored `ml_analysis_jobs.id` is bound to `request_id`, `idempotency_key`, `Idempotency-Key`, `X-Request-ID`, and response `job_id`.

Ownership boundaries:

- Expo owns encrypted device state, durable offline intent, reconnect replay, and polling.
- Next.js owns authenticated enqueue, outbox claiming, bounded dispatch retries, committed-state verification, and outbox completion.
- Railway FastAPI locks and validates the stored job, derives its owner and consent, loads owner-scoped inputs, runs inference or honest abstention, and atomically writes domain results, feature/result lineage, idempotency state, audit evidence, and terminal job state.
- In Railway-persistence mode, Next.js does not write domain results, ML results, or terminal job state.
- Supabase owns governed records, RLS, and private objects.

The runtime order is local deterministic support where available, then a durable Railway cloud job, otherwise an explicit `model_unavailable`, `insufficient_data`, `unsupported_offline`, `consent_restricted`, or error state. There is no silent heuristic-to-model substitution. Vercel remains a scheduler-disabled web/API rollback. Cloud Run and Vertex are inactive research/rollback infrastructure; neither is evidence of a trained or validated model.
