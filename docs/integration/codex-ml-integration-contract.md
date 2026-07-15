# AcneTrex v3 ML integration and Railway deployment contract

Status: Design A is authoritative. This document replaces the earlier handoff that assigned database writes to FastAPI.

## Ownership boundary

AcneTrex uses a transactional outbox and one versioned inference contract.

1. Expo submits an authenticated, idempotent request to Next.js `POST /api/ml/jobs`.
2. Next.js validates Supabase Auth and consent, creates `ml_analysis_jobs` plus `outbox_events` in one transaction, and returns the durable job UUID.
3. Exactly one scheduler runs the TypeScript outbox processor. It claims a job with a lease, loads only owner-scoped source rows, and constructs the canonical inference request.
4. The processor calls the stateless FastAPI service on Railway at `POST /predict`. `POST /api/v1/inference` is a compatibility alias to the same handler; `/v1/predict` remains a legacy alias.
5. Next.js validates lineage, persists `ml_analysis_results` and any domain projection, completes the job and inbox record, then closes the outbox event in a transaction.
6. Expo polls the owner-scoped job endpoint and durably caches the result.

FastAPI must not connect to Supabase, claim outbox rows, load user records, or write job, result, forecast, hypothesis, snapshot, or conversation tables. It receives only the minimum owner-derived feature payload and consent snapshot supplied by Next.js.

## Identity and idempotency

The `ml_analysis_jobs.id` UUID is the single inference identity. The outbox processor sends that value as:

- JSON `request_id`
- JSON `idempotency_key`
- `Idempotency-Key` header
- `X-Request-ID` header

FastAPI returns that same UUID as both `request_id` and `job_id`. Next.js rejects and does not persist a response when either identity or its module/task/schema lineage differs.

## FastAPI contract

The canonical route is `POST /predict`, protected by a server-only bearer secret in `ACNETREX_ML_SHARED_SECRET`. Required request fields are defined by `packages/ml-local-runtime/src/contracts.ts` and the matching Pydantic models. Responses disclose readiness, runtime, model and data lineage, coverage, calibration, uncertainty, limitations, safety, and latency. Missing or unapproved learned artifacts fail closed; deterministic engines never masquerade as learned predictions.

The inference service is stateless with respect to application data. Its local idempotency store only prevents duplicate execution for the shared request identity; it is not the system of record.

## Deployment topology

- Railway web service: complete Next.js web application and API.
- Railway ML service: Python FastAPI inference runtime from `ml-service/`.
- Railway scheduler service: the sole TypeScript outbox processor, unless the web service is explicitly configured as the sole scheduler instead.
- Supabase: canonical Auth, PostgreSQL, RLS, and private Storage.
- Vercel: retained as a tested rollback target during Railway cutover; it must not run a second scheduler.
- Cloud Run: retained only as a rollback inference target until Railway ML verification is complete.

Server secrets must never use `NEXT_PUBLIC_*`, `EXPO_PUBLIC_*`, or `VITE_*` names. Mobile receives only the public Railway web/API base URL and Supabase publishable configuration.

## Completion gate

Deployment is complete only when one trace shows authenticated creation, consent snapshot, job/outbox commit, a single lease claimant, owner-scoped feature loading, Railway FastAPI inference, matching request/job identity, result/domain persistence, terminal job/outbox state, replay without duplicate inference, cross-user denial, and the same result after refresh or re-login. Restart and expired-lease recovery, mobile offline replay/cache, security checks, and both Railway-to-Vercel and Railway-ML-to-Cloud-Run rollback procedures must also be exercised or recorded as explicit blockers.
