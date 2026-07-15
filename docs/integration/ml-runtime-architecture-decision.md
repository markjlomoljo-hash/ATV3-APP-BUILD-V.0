# ADR: Railway owns durable ML finalization

- Status: accepted
- Date: 2026-07-15
- Scope: Expo/mobile ML job path

## Decision

Use Design B. Next.js owns authenticated enqueue, polling, outbox dispatch, and post-response commit verification. Railway FastAPI owns stored-job validation, owner-scoped consented feature loading, inference, domain/result/lineage persistence, and the terminal job transition. The job UUID is the request and idempotency identity everywhere.

The separate Railway worker remains because the mobile app needs a durable asynchronous dispatcher. It is not a second inference or persistence owner. Exactly one scheduler is enabled. `ACNETREX_ML_WORKER_ENABLED=false` pauses it for cutover; `ACNETREX_ML_PERSISTENCE_OWNER=nextjs` is the temporary persistence rollback switch.

## Rationale

Keeping inference and its durable finalization under one owner prevents acknowledged-but-uncommitted results and duplicate domain writes after timeouts, restarts, or lost responses. Next.js readback verification prevents an outbox message from closing until the Railway commit is visible. The browser application is not part of this delivery, but its server deployment remains necessary as the mobile backend-for-frontend.

## Model provider decision

Cloud Run is the default cloud-hosted learned-model provider. Local predictive fallback is prohibited. Registry approval, dataset eligibility, immutable artifact checksum, schema compatibility, evaluation, and explicit activation are runtime gates. If those inputs do not exist, learned inference stays unavailable while deterministic modules may return transparent, non-learned output or abstain. Vertex AI is not active until a deployed model receives traffic.

## Consequences

- FastAPI requires server-only PostgreSQL access and must not expose browser CORS.
- Result, domain projection, lineage/audit, and terminal job state commit atomically and replay from stored state.
- The dispatcher sends identifiers and contract metadata, not user-derived feature payloads.
- Deployment order is compatibility images, paused dispatcher, database/config wiring, owner switch, authenticated proof, then scheduler resume.
- Any future online learning must use an auditable, consent-aware, versioned training pipeline and a newly approved immutable artifact; live requests never mutate the serving model.
