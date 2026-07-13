# AcneTrex V3 Build Evidence Report

## Session result

Implemented a broad PRD app-body pass:

- Replaced the generic starter homepage with an AcneTrex module dashboard.
- Added a central PRD module registry used by dashboard/navigation and route resolution.
- Added a catch-all route for required PRD module screens.
- Added shared readiness/status panels with explicit unavailable states.
- Added Zod schemas for daily logs, FaceAtlas, Skin Twin, CutisAI, treatment drafts, and reports.
- Added tests for route coverage, registry honesty, completion snapshot behavior, and schema validation.
- Added PRD module coverage matrix.

## Validation commands

Commands were run with local Node tooling from `.tooling/node-v22.23.1-win-x64` because `node`, `npm`, and `git` were not on the default shell `PATH`.

| Command | Result |
|---|---|
| `npm.cmd test` | Pass: 2 files, 7 tests |
| `npm.cmd run typecheck` | Pass |

## 2026-07-13 Post-push deployment verification for `fde143a`

- Pushed `fde143a feat(ml): add durable analysis job boundary` to
  `origin/feat/phase7-profile-reports`.
- Vercel deployment `dpl_G12ftRosfykvD35bPg7GSr6T8qU1` reached `READY` for the
  production target and was aliased to `https://atv-3-app-build-v-0.vercel.app`.
- Vercel build-log inspection returned only `Build Completed in
  /vercel/output [34s]`; GitHub combined status for the commit is `Vercel:
  success`; no Vercel runtime-error clusters were reported in the inspected
  hour.
- Production `/api/health` returned HTTP 503 with database `connected` and all
  canonical, legacy, compatibility, memory, and ML-lineage tables present. The
  only health warnings remain `ml_api_degraded` from the Cloud Run provider
  placeholder and `clerk_not_configured`.
- Production `GET /api/ml/jobs` returned HTTP 405, confirming the route is
  deployed and intentionally method-scoped; authenticated POST/GET-by-ID
  behavior remains protected by the Supabase bearer boundary.
- Supabase migration inspection reports the live reliability, memory/ML, and
  Clerk/RBAC migrations applied through `phase7_canonical_memory_contract_reconcile`.
| `npm.cmd run build` | Pass |
| `npm.cmd run lint` | Pass with 4 pre-existing warnings |
| `git diff --check` | Pass |

## Scan results

- Secret scan: no committed plaintext production secret found in new code. Findings are documentation placeholders, lockfile package names, or server-boundary env references.
- Fake-output scan: no production fake intelligence path added. Findings are no-fake policy copy, UI placeholder CSS strings, and existing starter placeholder in legacy TanStack route files.
- Storage scan: existing browser Supabase client still uses `localStorage`; this remains a native secure-storage blocker and was not worsened.
- Conflict-marker scan: clean.

## External blockers

- Git push remains dependent on local Git credentials.
- Vercel env/deploy verification requires project linkage/auth.
- Supabase live migration and RLS verification require CLI/MCP/database credentials.
- Cloud Run and Vertex verification require authenticated GCP tooling and deployed ML service source.

## 2026-07-05 Live Preview + Module Body Pass

Implemented a second app-body pass focused on making the PRD routes visibly useful in local preview:

- Started the Next dev server with local tooling at `http://localhost:3000`.
- Verified local preview with system Chrome through Playwright using `http://127.0.0.1:3000`.
- Added a typed module workflow model for primary action, form fields, history empty state, readiness checks, safety notes, and service endpoint.
- Added reusable module layout panels for action, forms, readiness, history, and operational boundaries.
- Replaced generic module route bodies with module-specific form/readiness/history content.
- Added concrete no-fake surfaces for SleepDerm, DermDiet, FaceAtlas, Skin Twin, CutisAI, reports, treatments, tasks, readiness, and FormulaLens/product workflows.
- Expanded `/api/health` to report app status, environment configuration flags, database availability, critical table presence when reachable, and Cloud Run health without exposing secret values.

### Preview route evidence

Mobile-width browser smoke checks passed for:

`/`, `/readiness`, `/log/sleep`, `/log/food`, `/face-atlas`, `/face-atlas/capture`, `/face-atlas/annotations`, `/skin-twin`, `/skin-twin/scenarios`, `/cutisai`, `/reports`, `/reports/export`, `/treatments`, `/treatments/checkins`, `/tasks`, `/formula-lens`, `/privacy`, and `/oauth/consent`.

Each checked route returned HTTP 200, rendered an `h1`, avoided `undefined`/`null` body text, and the module routes rendered at least one form plus readiness content.

### Live infrastructure evidence

- Local `/api/health` returned HTTP 503 with `database_not_configured`, `database.configured=false`, and `cloudRun.status=not_configured`, which is the expected fail-closed local state.
- `https://mlatv-pudz4xjzxa-ew.a.run.app/` returned HTTP 200 but still served Google Cloud Run placeholder HTML.
- `https://mlatv-pudz4xjzxa-ew.a.run.app/health` also returned placeholder HTML, so the Cloud Run service is still not serving the AcneTrex ML API.
- `vercel`, `supabase`, and `gcloud` CLIs were not available on PATH in this shell, so production deploy, migration, and Vertex checks remain externally blocked.
- `npx vercel@latest --prod --yes` was available and successfully deployed production after commit `1b9393e`.
- Vercel production alias: `https://atv-3-app-build-v-0.vercel.app`.
- Production homepage returned HTTP 200 after deploy.
- Production `/api/health` returned HTTP 503 because `DATABASE_URL` is configured but the database is unavailable from the deployment.
- Production `/api/ml/predict` returned HTTP 503 with `ml_api_unexpected_response` because upstream returned metadata keys instead of a prediction payload.
- The health route was tightened so Cloud Run is only considered healthy when `/health` returns JSON with `ok: true`; placeholder HTML or metadata-only JSON is degraded.

### Validation commands

| Command | Result |
|---|---|
| `npm.cmd test -- module-service module-registry schemas` | Pass: 3 files, 10 tests |
| `npm.cmd test` | Pass: 3 files, 10 tests |
| `npm.cmd run typecheck` | Pass |
| `npm.cmd run build` | Pass |
| `npm.cmd run lint` | Pass with 4 pre-existing warnings |
| `git diff --check` | Pass |
| `npm.cmd run test:coverage` | Missing script |
| `npm.cmd run test:e2e` | Missing script |

### Scan classification

- Secret scan: no plaintext production secret added. Findings are env-var names, server-only Supabase key references, and existing auth token handling.
- Fake-output scan: no fake intelligence path added. Findings are no-fake safety copy, UI placeholder attributes/classes, and existing legacy starter placeholders.
- localStorage scan: existing browser Supabase client uses `localStorage`; still a native secure-storage blocker and not worsened.
- Conflict-marker scan: clean.

## 2026-07-05 Full Module Code-Body Acceleration

Implemented app-code completion work that does not depend on live Supabase or Cloud Run credentials:

- Added deterministic module computation contracts:
  - SleepDerm duration, midnight crossing, midpoint, sleep debt, rolling 3/7/14/30 day debt, circadian/readiness limits.
  - DermDiet meal baseline completion, snack sub-events, explicit missingness, and category exposure counts.
  - FaceAtlas five-angle capture readiness, consent handling, derived-only/raw retention mode, and queued-cloud state.
  - Skin Twin source-record readiness, missing input reporting, derived-only visualization state, and no-projection limitations.
  - Report missing-data/readiness state.
  - Task credit logic that awards no points or streak eligibility without durable task completion.
- Added service adapters returning structured `ModuleResult` values for deterministic previews and unavailable external services.
- Added visible "Local capability contract" panels to module pages so users can see which safe local logic exists and which outputs remain blocked.
- Added `scripts/route-smoke.mjs` and `npm run test:e2e` for dependency-light route smoke testing across 44 PRD routes.
- Added `docs/execution/PRD_MODULE_COMPLETION_MATRIX.md` tracking actual route, form, schema, adapter, persistence, ML/readiness, tests, and remaining blockers by module.

### Additional validation

| Command | Result |
|---|---|
| `npm.cmd test -- computations module-service schemas` | Pass: 3 files, 13 tests |
| `npm.cmd test` | Pass: 5 files, 22 tests |
| `npm.cmd run typecheck` | Pass |
| `npm.cmd run build` | Pass |
| `npm.cmd run lint` | Pass with 4 pre-existing warnings |
| `npm.cmd run test:e2e` | Pass: 44 routes |

## 2026-07-05 Live Integration Hardening Pass

Implemented code-level fixes for the current live blockers while preserving fail-closed behavior:

- Verified branch `feat/phase7-profile-reports` was clean and synced with origin at `987a77e`.
- Verified local `npm.cmd run build` passed before changes.
- Verified live Supabase project `alobmstvqutteypusmuo` through the Supabase connector:
  - Existing public tables include `profiles`, `consents`, `sleep_logs`, `food_logs`, `face_scans`, `reports`, `skin_twin_snapshots`, `treatment_plans`, `treatment_tasks`, `trigger_hypotheses`, and `ml_runtime_events`.
  - RLS is enabled on inspected public tables.
  - Private storage buckets exist: `face-scans-raw`, `reports`, and `skin-twin`.
- Confirmed live schema drift: the remote project contains the earlier AcneTrex schema, while the app server expects Phase 7 canonical tables such as `users`, `consent_settings`, `profile_sections`, `daily_logs`, `report_requests`, and `deletion_requests`.
- Added tracked Supabase migration `supabase/migrations/20260710233648_phase7_memory_ml_contracts.sql` for missing Phase 7, persistent memory, and ML lineage tables with RLS enabled.
- Added infrastructure health classification so `/api/health` distinguishes:
  - DB unavailable,
  - canonical table gaps,
  - legacy operational table presence,
  - memory/ML lineage table gaps,
  - Cloud Run placeholder or unexpected health payloads.
- Added `/api/cutisai/memory/status` to report persistent memory readiness without fabricating memory availability.
- Replaced inline browser `localStorage` Supabase auth storage with an explicit adapter and added a native SecureStore-compatible adapter for mobile integration.
- Verified Vercel production remains deployed but `/api/health` still returns HTTP 503 because the production DB is configured but unavailable from the deployment.
- Verified Cloud Run `https://mlatv-pudz4xjzxa-ew.a.run.app/health` still serves Google placeholder HTML, not the AcneTrex ML API.
- Verified `npx supabase` is available, but local `supabase status` is blocked by Docker daemon access. Remote migration application still requires DB credentials or a migration-capable connector.

### Additional validation

| Command | Result |
|---|---|
| `npm.cmd test -- infrastructure-health` | RED first, then pass: 3 tests |
| `npm.cmd test -- supabase-migration-contract` | RED first, then pass: 2 tests |
| `npm.cmd test -- auth-storage` | RED first, then pass: 3 tests |
| `npm.cmd test -- readiness auth-storage infrastructure-health supabase-migration-contract` | Pass: 4 files, 10 tests |
| `npm.cmd run typecheck` | Pass |
| `npm.cmd test` | Pass: 9 files, 32 tests |
| `npm.cmd run build` | Pass |
| `npm.cmd run lint` | Pass with 4 pre-existing warnings |
| `npm.cmd run test:e2e` | First attempt server readiness timeout; rerun passed 44 routes |

## 2026-07-13 Production Infrastructure Verification

Verified the live state after rebasing onto the current remote branch and pushing
`c653f1f fix(supabase): harden canonical migration and db diagnostics`:

- Vercel deployment `dpl_9NWN2788BKxEKXMzUZ7Fgu5qr9XR` for `c653f1f` reached
  `READY` on the production target.
- Production `https://atv-3-app-build-v-0.vercel.app/api/health` returned HTTP
  503 for the correct reason: Supabase is connected and schema-ready, but the
  Cloud Run health payload is still the provider placeholder metadata.
- Production database diagnostics reported connected status with no missing
  canonical, legacy, web-compatibility, or persistent-memory tables. The live
  schema includes the memory, ML lineage, CutisAI conversation, and Clerk/RBAC
  table groups required by the current server contracts.
- Production `https://atv-3-app-build-v-0.vercel.app/api/cutisai/memory/status`
  returned HTTP 200 with all expected memory tables present and evidence
  retrieval marked ready. This is schema readiness, not proof that a user
  conversation has been persisted.
- Cloud Run `https://mlatv-pudz4xjzxa-ew.a.run.app/` and `/health` both returned
  HTTP 200 provider placeholder HTML, not the checked-in FastAPI contract. The
  app correctly classifies this as degraded and the ML proxy fails closed.
- Added a bounded `VERTEX_AI_TIMEOUT_SECONDS` setting (default 20 seconds,
  clamped to 1-60 seconds) to the FastAPI Vertex request and propagated it
  through `cloudbuild.yaml`. This prevents an unavailable endpoint from
  hanging a Cloud Run request indefinitely.
- Vercel runtime error inspection for `/api/health`, `/api/ml/predict`, and
  `/api/cutisai/memory/status` returned no runtime error clusters in the
  inspected window.

### 2026-07-13 validation

| Command / check | Result |
|---|---|
| `npm.cmd test` | Pass: 20 files, 99 tests |
| `npm.cmd run typecheck` | Pass |
| `npm.cmd run build` | Pass: Next.js production build |
| `npm.cmd run lint` | Pass |
| `npm.cmd run test:coverage` | Pass: 99 tests; 77.23% statements, 72.83% branches |
| `npm.cmd run test:e2e` | Pass: route smoke for 66 routes |
| `git diff --check` | Pass |
| Python ML tests | Not run: Python is not installed on this workstation |
| Cloud Run root/health | HTTP 200 placeholder HTML; blocked deployment state |

## 2026-07-13 Durable ML Job Boundary

Implemented a server-only durable enqueue/status boundary without enabling
direct prediction against the still-placeholder Cloud Run service:

- `POST /api/ml/jobs` authenticates the Supabase bearer, validates the bounded
  engine request, requires an idempotency key, and writes `ml_analysis_jobs`
  and `outbox_events` through the existing transactional idempotency helper.
- `GET /api/ml/jobs/:id` scopes reads by both job ID and authenticated owner;
  it never exposes another user's job.
- A successful new request returns `202 queued_for_cloud` with a durable job
  reference. Replays return the stored idempotent reference. Missing database
  configuration returns `503 database_unavailable` before acknowledgement.
- The direct `/api/ml/predict` route remains disabled until a worker can claim
  queued jobs, invoke Cloud Run/Vertex, persist `ml_analysis_results`, and
  complete replay-safe result delivery. It now requires both the existing
  proxy flag and an explicit `ML_PREDICTION_WORKER_ENABLED=true` gate.

## 2026-07-13 ML worker boundary

- Added `POST /api/internal/ml/worker`, protected by the server-only
  `ACNETREX_ML_WORKER_SECRET` and explicit
  `ACNETREX_ML_WORKER_ENABLED=true` configuration.
- The worker claims only queued `ml.analysis.requested` outbox events with a
  two-minute lease, forwards the stored request to the real Cloud Run `/predict`
  endpoint, and persists only validated upstream prediction payloads into
  `ml_analysis_results` before marking the outbox event processed.
- HTTP 408/429/5xx and network timeout failures are requeued with bounded
  backoff until `max_attempts`; malformed or exhausted responses become
  terminal `failed` states. No fallback payload is generated.
- `/api/health` now exposes non-secret worker configuration status and reports
  `ml_worker_not_configured` while the worker is not deployed/configured.
- The worker route also accepts Vercel's bearer-style cron secret as well as
  the explicit `x-worker-secret` header, so it can be invoked by an approved
  external scheduler. A five-minute `vercel.json` Cron declaration was
  rejected by the linked Vercel plan check and was removed; no scheduled
  production execution is claimed.
- This is source-level worker readiness, not a claim that Railway, Vercel Cron,
  Cloud Run Jobs, or another production scheduler is active.

### Worker validation

| Command / check | Result |
|---|---|
| `npm.cmd test` | Pass: 26 files, 130 tests |
| `npm.cmd run test:coverage` | Pass: 80.84% statements, 74.15% branches |
| `npm.cmd run typecheck` | Pass |

### Durable ML job validation

| Command / check | Result |
|---|---|
| `npm.cmd test -- src/app/api/ml/predict/route.test.ts src/lib/acnetrex/ml-analysis-jobs.test.ts src/app/api/ml/jobs/route.test.ts src/app/api/ml/jobs/[id]/route.test.ts` | Pass: 4 files, 21 tests |
| `npm.cmd run typecheck` | Pass |

## 2026-07-13 post-push production verification

- Commit `b8f4f1c` was pushed to `feat/phase7-profile-reports`.
- Vercel deployment `dpl_2wmbiVrhr465sycjKqd7fEUwE1cR` reached `READY`, is
  aliased to `https://atv-3-app-build-v-0.vercel.app`, and its error-only build
  log contained only the successful build-completed event.
- Production `/api/health` returned HTTP 503 with database status `connected`,
  all canonical/legacy/web-compatibility/memory table groups present, and
  explicit warnings for Cloud Run degradation, disabled worker configuration,
  and missing Clerk configuration. No secret values were returned.
- Production `GET /api/ml/jobs` returned HTTP 405, confirming the deployed
  route is present and remains POST-only.
- Cloud Run `mlatv` root and `/health` still return HTTP 200 provider
  placeholder HTML. The CORS preflight also returns placeholder HTML without
  the checked-in API contract headers. Cloud Run deployment remains blocked;
  no Vertex prediction readiness is claimed.

## 2026-07-13 CutisAI durable conversation boundary

Implemented and locally validated the first durable CutisAI conversation path:

- `POST /api/cutisai/conversations` authenticates the Supabase bearer, validates
  the bounded message schema, requires a scoped idempotency key, checks the
  existing `consents.personal_learning` field, and records the conversation and
  user message in one database transaction.
- `GET /api/cutisai/conversations` and `GET /api/cutisai/conversations/:id`
  require the same consent and scope every query by the verified Supabase
  user ID. A missing or foreign conversation returns a non-disclosing 404.
- Conversation writes are server-side through `getPool()` and the existing
  idempotency transaction helper. Audit metadata contains requested tool names
  only; message content is not copied into audit payloads or memory facts.
- The response deliberately contains no assistant answer. It returns an
  explicit `assistant_generation_not_configured` state with
  `evidence_unavailable` until a real backend tool/evidence worker is deployed.
- The `/cutisai` page now exposes a client conversation panel that loads and
  saves only with an authenticated Supabase session, and shows explicit
  `auth_required`, `consent_required`, `database_unavailable`, and
  `not_configured` states. It does not use browser state as production truth.

### CutisAI validation

| Command / check | Result |
|---|---|
| `npm.cmd test -- src/app/api/cutisai/conversations src/lib/acnetrex/memory/conversations.test.ts` | Pass: 3 files, 17 tests |
| `npm.cmd run typecheck` | Pass |
| `npm.cmd run build` | Pass: Next.js production build includes both conversation routes |
| `npm.cmd run lint` | Pass |
| `npm.cmd run test:e2e` | Pass: route smoke for 66 routes |
| `git diff --check` | Pass |
| `GET http://127.0.0.1:3200/api/cutisai/conversations` without bearer | HTTP 401, as required |
| Playwright visual browser | Not run: the environment has no installed Playwright browser binary |

This proves the server boundary and no-fabrication behavior locally. It does
not prove a real signed-session write until an authenticated Supabase user
session is available in the environment.

## 2026-07-13 CutisAI post-push verification

- Commit `2c75ce2 feat(cutisai): persist consented conversations` was pushed to
  `feat/phase7-profile-reports`.
- Vercel deployment `dpl_95MvvvuboMWBv85xDbkXMgXTbkPD` reached `READY`, is
  aliased to `https://atv-3-app-build-v-0.vercel.app`, and GitHub reports the
  Vercel check as successful.
- Production `GET /cutisai` returned HTTP 200 and production
  `GET /api/cutisai/conversations` without a bearer returned HTTP 401. This
  verifies the route is deployed and still protected by authentication.
- Production `/api/health` remains HTTP 503 for the previously verified
  external blockers: Cloud Run still serves provider placeholder HTML, the
  durable worker is disabled, and Clerk production configuration is absent.
  This deployment did not change those infrastructure states.
