# AcneTrex V3 App Completion Estimate

## Current estimate

- Starting estimate for the current Skin Twin scenario boundary session: 57%
- Ending estimate: 58%
- Confidence: medium

## Evidence

- The app now has a registry-driven AcneTrex dashboard instead of a generic starter homepage.
- Required PRD routes are reachable through a catch-all module route and mapped to typed module contracts.
- Shared readiness states now represent `auth_required`, `consent_required`, `database_unavailable`, `ml_unavailable`, `evidence_unavailable`, `queued_for_cloud`, `not_configured`, and `insufficient_data`.
- FaceAtlas, Skin Twin, CutisAI, AI workspace, TriggerGraph, Forecasting, FormulaLens, BarrierGuard, reports, exports, treatment, tasks, gamification, research, native readiness, and daily log modules now have navigable app surfaces.
- Zod schemas now cover daily logging, FaceAtlas capture/annotations, Skin Twin scenarios, CutisAI messages, treatment plan drafts, and report requests.
- Tests cover required route registry coverage, honest readiness/missing-surface language, no live-infrastructure overclaiming, and schema validation.
- The local preview now shows module-specific bodies, validated-input form surfaces, history empty states, safety notes, and integration readiness panels across the highest-impact PRD modules.
- `/api/health` now reports database, environment, critical table, and Cloud Run readiness without exposing secret values.
- Browser route smoke checks confirm key modules render with forms and no crash at mobile width.
- Deterministic local contracts now exist for SleepDerm, DermDiet, FaceAtlas capture readiness, Skin Twin readiness, report readiness, and task credit.
- Service adapters now return structured `ModuleResult` values for deterministic previews and fail-closed unavailable states.
- A dependency-light `test:e2e` route smoke script validates 44 PRD routes.
- The PRD module completion matrix now tracks actual routes, forms, schemas, adapters, API/persistence/ML contracts, tests, and blockers.
- Live Supabase connector inspection verified RLS-enabled legacy AcneTrex tables and private storage buckets.
- A tracked Supabase migration now defines missing canonical Phase 7 tables plus persistent memory and ML lineage tables.
- `/api/health` now distinguishes schema mismatch, memory table gaps, and Cloud Run placeholder/unexpected payloads.
- `/api/cutisai/memory/status` now exposes persistent memory readiness without fake assistant memory.
- Supabase browser auth storage is now behind an explicit adapter with a native SecureStore-compatible path for mobile.
- Live Supabase production connectivity is now verified through `/api/health`:
  the database is connected and all canonical, legacy, web-compatibility,
  memory, ML-lineage, and RBAC table groups are present.
- The live `ml_runtime_events`/memory schema is applied and the production
  memory readiness route returns HTTP 200 with no missing expected tables.
- Vercel deployment for `b8f4f1c` reached `READY` and Vercel build-log inspection
  found no errors for the health, ML proxy, or memory readiness routes.
- Cloud Run remains explicitly degraded because both `/` and `/health` return
  Google placeholder HTML; no Vertex readiness or prediction claim is made.
- The Cloud Run source now bounds Vertex RPC timeouts and carries the setting
  through the Cloud Build deployment manifest.
- Durable ML analysis enqueue/status routes now create a queued job and outbox
  event in one idempotent transaction, with authenticated owner scoping and
  no acknowledgement when the database is unavailable. Direct prediction
  remains disabled until the worker is deployed and configured.
- A server-only ML worker boundary now claims leased analysis jobs, calls the
  real Cloud Run contract, persists validated results, retries transient
  failures, and exposes worker configuration through `/api/health`. A
  Vercel Cron-compatible GET trigger can be used by an approved external
  scheduler; Vercel's plan check rejected a five-minute `vercel.json` Cron
  declaration, so no scheduled production execution is claimed.
- CutisAI now has an authenticated, consent-gated, idempotent conversation
  persistence boundary with owner-scoped list/detail reads and an honest
  assistant-not-configured response. The `/cutisai` UI consumes that boundary
  without fabricating assistant content.
- FaceAtlas now has an authenticated, idempotent scan-metadata boundary,
  owner-scoped detail/history reads, user-only annotation writes, explicit raw-
  retention consent enforcement, a live Supabase annotation-zone migration,
  and a capture UI that remains `pending_upload` until real storage and ML
  finalization are available.
- Skin Twin now has an authenticated, idempotent scenario request boundary,
  personal-learning consent enforcement, owner-scoped history/detail reads, a
  live scenario lineage migration, minimum-data gating from real FaceAtlas,
  SleepDerm, and DermDiet records, and a UI that never displays a projection
  before a validated worker result exists.

## Category breakdown

| Category | Estimate | Evidence | Main blocker |
|---|---:|---|---|
| Auth/onboarding/profile/consent | 6.5/10 | Routes and contracts present; prior account/profile work remains | live signed-session validation |
| Supabase/database/storage contracts | 9.25/12 | production `/api/health` confirms DB connectivity; live FaceAtlas zone and Skin Twin scenario migrations plus memory/ML lineage schema are present; ML job/outbox and CutisAI conversation writes are transactionally contracted | signed-session write/read proof, durable memory facts, export/deletion workflows |
| Core logging modules | 7/12 | all log routes represented; SleepDerm and DermDiet have deterministic computation contracts | live writes and feature snapshots for secondary logs |
| FaceAtlas | 6.25/12 | authenticated scan metadata and detail/history APIs, consent-gated raw-retention request, user-only zone annotations, live `annotations.zone` migration, and capture UI | signed upload/finalization, camera, cloud lesion inference, image quality validation |
| AI/ML, TriggerGraph, Forecasting, Skin Twin | 9.25/15 | AI workspace, readiness, Skin Twin readiness-gated scenario persistence, bounded ML proxy, durable queued-job/status boundary, leased worker/result persistence source | Cloud Run/Vertex/local model execution and live worker scheduler |
| CutisAI/evidence/memory | 5/8 | CutisAI route, validated conversation UI, authenticated consent-gated conversation create/list/detail APIs, production memory schema readiness, `/api/cutisai/memory/status` | backend tools, evidence retrieval, assistant generation, memory fact extraction |
| Treatment/task/gamification | 4.25/8 | treatment/check-in/task route bodies, task credit no-fake adapter | durable task generation and streak rules |
| Reports/exports/profile | 4/8 | report/export/profile routes, schemas, request/history bodies, missing-data report readiness | PDF/export storage verification |
| Native mobile/device readiness | 2.25/7 | native readiness route plus SecureStore-compatible Supabase auth storage adapter | Expo/device validation and offline queue |
| Testing/security/release | 7/8 | 164 unit tests, 79.91% statement coverage, production build/typecheck/lint, 66-route smoke, READY Vercel deployment, live migration verification | Python ML tests, Cloud Run/Vertex deployment, native device, remote CI promotion |

## Remaining release blockers

- Supabase signed-session write/read validation for a real user and durable memory-fact extraction are still needed; the server conversation boundary is implemented and locally tested, while schema and database connectivity are verified.
- Vercel production deployment is green, but `/api/health` remains HTTP 503 until Cloud Run serves the checked-in ML contract and Clerk/worker production configuration is supplied.
- Cloud Run `mlatv` still needs source deployment and endpoint verification.
- Vertex endpoint readiness is still unverified.
- Native SecureStore adapter exists, but Expo/device validation, offline queue, production FaceAtlas inference, Skin Twin simulation, CutisAI tools, report export worker, and treatment/task generation remain incomplete.
- FaceAtlas currently stops at `pending_upload`; no raw bytes, model detections, Skin Twin projection, or clinical interpretation are generated by this slice.

## Why not 75-80% yet

The app-code body is materially broader and the live database/schema boundary is now verified, but a 75-80% estimate would require signed-session persistence proof, production ML execution, native device validation, and report/task workers. Those remain external-live blockers or deeper persistence integrations, so the honest estimate is 58%.
