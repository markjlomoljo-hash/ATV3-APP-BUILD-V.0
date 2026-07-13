# AcneTrex V3 reliability and security coverage matrix

Supabase Auth is canonical. Every protected server action derives `user_id` from a verified JWT. `api_idempotency_keys`, `outbox_events`, `consumer_inbox`, and worker leases are server-only. “Blocked” means the unsafe mutation is intentionally unavailable rather than simulated.

| Module/action | Caller → route/service | Auth / authorization | Idempotency / transaction / async | Retry / audit / test | Status |
|---|---|---|---|---|---|
| Onboarding save | onboarding → profile sections API | verified JWT; own row | required; version transaction | stable key; profile audit | integration needed |
| Profile update | profile → section API | verified JWT; own row | required; version + outbox | bounded retry | integration needed |
| Consent update | privacy → consent API | verified JWT; own row | required; consent + audit | no blind retry | integration needed |
| Sleep log | SleepDerm server function | verified JWT + RLS | same-night unique upsert | stable offline key | partial: DB uniqueness |
| Food meal | DermDiet server function | verified JWT + RLS | logical meal event ID | stable offline key | integration needed |
| Food snack | DermDiet server function | verified JWT + RLS | unique snack event ID | stable offline key | integration needed |
| Stress/activity/hydration/cycle/contact | daily log functions | verified JWT + RLS | per-event or same-day key | stable offline key | integration needed |
| Routine / skin state | daily log functions | verified JWT + RLS | same-day/versioned | stable offline key | integration needed |
| FaceAtlas upload initiation | capture → upload API | JWT, consent, owner path | capture + slot key | bounded storage retry | API missing |
| FaceAtlas scan creation | capture → scan API | JWT + RLS | scan key + outbox | analysis job dedupe | API missing |
| Annotation submission | annotation UI → API | JWT; scan ownership | submission key + transaction | audit event | API missing |
| ML analysis request | app → `/api/ml/predict` | server boundary | job dedupe + outbox | circuit/timeout | proxy exists; persistence missing |
| Skin Twin scenario | lab → scenario API | JWT + RLS | scenario key | honest insufficient-data | API missing |
| Forecast request | forecast → job API | JWT + RLS | job key + outbox | ML circuit | API missing |
| CutisAI message | chat → conversation API | JWT + RLS | stable message/tool keys | retrieval audit | API missing |
| Treatment creation | treatment → API | JWT + own row | command key + transaction | audit | integration needed |
| Treatment check-in | check-in → API | JWT + own plan | check-in key | bounded retry | integration needed |
| Task completion | board → task command | JWT + own task | completion + ledger + outbox atomically | concurrency test required | blocked until durable command |
| Points award | server reward consumer | server-only | unique source event | inbox dedupe | blocked |
| Badge award | server evaluator | server-only | unique user/badge/source | inbox dedupe | blocked |
| Report request | reports → dermatologist route | verified JWT | request key; worker/outbox required | report audit | synchronous legacy; hardening needed |
| Export request | export → API | verified JWT | request key; worker/outbox required | export audit | synchronous legacy; hardening needed |
| Deletion request | privacy → deletion command | JWT + recent auth | one active request; grace job | deletion audit | live schema; API/worker needed |
| Deletion cancellation | privacy → cancellation command | JWT; own request | idempotent transition | audit | legacy service partial |
| Notification scheduling | event → delivery worker | server-only | dedupe user/type/source/window | provider circuit | worker missing |
| Research contribution | consent event → queue | JWT + current consent | outbox + dedupe | revocation removes queued work | worker missing |
| Admin role mutation | admin UI → admin API | verified JWT + authoritative role | command key + audit | never trust stale client role | API review needed |
| Feature flag mutation | admin UI → admin API | authoritative admin | command key + audit | terminal 403 | API missing |
| Webhook event | provider → webhook | verified provider signature | provider event inbox | provider-window retry | handler missing |

## Central contracts

- Client: `src/lib/reliability/api-client.ts`
- Retry: `src/lib/reliability/retry-policy.ts`
- Circuit breaker: `src/lib/reliability/circuit-breaker.ts`
- Server idempotency: `src/lib/reliability/idempotency.ts`
- Live schema: `api_idempotency_keys`, `outbox_events`, `consumer_inbox`, `deletion_jobs`
- Destructive legacy deletion and client-directed rewards fail closed until their durable workers exist.

## ML job boundary update

`POST /api/ml/jobs` is now the durable entrypoint for authenticated analysis
requests. It validates the request, requires a stable idempotency key, inserts
`ml_analysis_jobs`, publishes `ml.analysis.requested` to `outbox_events`, and
completes the idempotency record in one transaction. `GET /api/ml/jobs/:id`
filters by the verified owner. The direct `/api/ml/predict` proxy remains
disabled behind both `ML_PROXY_ENABLED` and `ML_PREDICTION_WORKER_ENABLED`
until a worker claims jobs, invokes the real Cloud Run/Vertex service, persists
`ml_analysis_results`, and supports replay-safe result delivery.
