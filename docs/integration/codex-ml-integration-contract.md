# AcneTrex v3 mobile ML integration and Railway deployment contract

Status: Design B is authoritative. The Expo mobile app is the product client; the Next.js deployment remains a private backend-for-frontend and outbox dispatcher required by that app.

## Ownership boundary

AcneTrex uses a transactional outbox and one versioned inference contract.

1. Expo submits an authenticated, idempotent request to Next.js `POST /api/ml/jobs`.
2. Next.js validates Supabase Auth and consent, creates `ml_analysis_jobs` plus `outbox_events` in one transaction, and returns the durable job UUID.
3. Exactly one TypeScript scheduler claims the outbox event with a lease and sends only the job identity and contract metadata to Railway FastAPI at `POST /api/v1/inference`.
4. FastAPI validates the bearer secret and correlated identity, loads the stored job and owner-scoped consented records from Supabase PostgreSQL, and executes inference outside a long database transaction.
5. FastAPI atomically persists the domain projection, `ml_analysis_results`, audit/lineage record, and terminal `ml_analysis_jobs` state. A repeated identity returns the committed result without another inference.
6. Next.js reads back the committed owner/job/lineage result before completing its inbox and outbox records. A missing or mismatched commit is retried rather than acknowledged.
7. Expo polls the owner-scoped job endpoint and durably caches the result for refresh, reconnect, and re-login.

The previous stateless FastAPI/Next.js-persistence topology is rollback-only. `ACNETREX_ML_PERSISTENCE_OWNER=railway` selects Design B; `nextjs` temporarily restores the old owner during rollback. Only one owner may be active.

## Identity and idempotency

The `ml_analysis_jobs.id` UUID is also the request UUID. The dispatcher sends it as JSON `request_id`, JSON `job_id`, JSON `idempotency_key`, `Idempotency-Key`, and `X-Request-ID`. FastAPI rejects disagreement among any of those identities or the stored row.

FastAPI returns the same UUID as `request_id` and `job_id`. A terminal result is acknowledged only after committed readback. The inference call, domain write, result write, terminal job transition, lineage/audit write, inbox close, and outbox close are therefore replay-safe across concurrency, restart, retry, and lost responses.

## FastAPI contract

The canonical route is `POST /api/v1/inference`, protected by server-only `ACNETREX_ML_SHARED_SECRET`. `POST /predict` remains a compatibility alias during migration; `/v1/predict` is legacy only. Health routes are `/health/live` and `/health/ready`, with `/live`, `/ready`, and `/health` compatibility aliases.

Responses disclose readiness, runtime, model and data lineage, coverage, calibration, uncertainty, limitations, safety, and latency. Learned inference is permitted only when the approved registry entry, immutable checksum-verified artifact, compatible preprocessing schema, and runtime approval gates all agree. Incomplete or unapproved learned artifacts fail closed. Honest deterministic/bootstrap engines may abstain but never masquerade as a trained prediction. No local predictive fallback is enabled.

## Deployment topology

- Expo mobile app: sole user-facing client for this delivery.
- Railway web service: authenticated Next.js API, durable enqueue/poll endpoints, and backend-for-frontend; its browser UI is out of scope.
- Railway ML service: private-contract FastAPI inference and persistence owner.
- Railway worker service: sole outbox dispatcher, independently pausable with `ACNETREX_ML_WORKER_ENABLED=false` for cutover and recovery.
- Supabase: canonical Auth, PostgreSQL, RLS, and private Storage.
- Cloud Run: default cloud-hosted learned-inference provider when an approved artifact exists; it fails closed otherwise.
- Vertex AI: unavailable unless a model is deliberately deployed and assigned traffic; an empty endpoint must never be reported as active.
- Vercel: tested rollback target only and never a second scheduler.

FastAPI and the worker use server-only database credentials. Secrets must never use `NEXT_PUBLIC_*`, `EXPO_PUBLIC_*`, or `VITE_*` names. Mobile receives only the public Railway API base URL and Supabase publishable configuration. FastAPI does not expose browser CORS.

## Completion gate

Deployment is complete only when a single correlated trace proves authenticated mobile creation, consent snapshot, job/outbox commit, one lease claimant, owner-scoped feature loading, Railway FastAPI execution, checksum-gated Cloud Run routing, atomic result/domain persistence, terminal job/outbox state, replay without duplicate inference, cross-user denial, and the same result after reconnect or re-login. Restart, expired-lease, lost-response, provider-failure, concurrency, rollback, and EAS device-build evidence are also required. An unavailable learned artifact is reported as a blocker, not replaced with a local model or an unsupported predictive claim.
