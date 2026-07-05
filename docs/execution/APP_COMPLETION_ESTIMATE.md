# AcneTrex V3 App Completion Estimate

## Current estimate

- Starting estimate for the latest live-preview session: 38%
- Ending estimate after the live-preview/module-body pass: 40%
- Confidence: medium-low

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

## Category breakdown

| Category | Estimate | Evidence | Main blocker |
|---|---:|---|---|
| Auth/onboarding/profile/consent | 6.5/10 | Routes and contracts present; prior account/profile work remains | live signed-session validation |
| Supabase/database/storage contracts | 5.25/12 | table/storage mappings, existing services, expanded health diagnostics | production migration/RLS verification |
| Core logging modules | 6.25/12 | all log routes represented with daily log schema and visible form bodies | dedicated persistence and live writes for secondary logs |
| FaceAtlas | 4.25/12 | capture/history/annotation routes, schemas, and capture/annotation workflow UI | live camera/upload/inference |
| AI/ML, TriggerGraph, Forecasting, Skin Twin | 6.75/15 | AI workspace, readiness, Skin Twin schemas/routes/forms, ML proxy boundaries | Cloud Run/Vertex/local runtime execution |
| CutisAI/evidence/memory | 2.5/8 | CutisAI route, message schema, memory/evidence readiness body | backend tools, evidence, conversation persistence |
| Treatment/task/gamification | 3.5/8 | treatment/check-in/task route bodies and real-data-only states | durable task generation and streak rules |
| Reports/exports/profile | 3.5/8 | report/export/profile routes, schemas, request/history bodies | PDF/export storage verification |
| Native mobile/device readiness | 1.5/7 | native readiness route only | Expo/SecureStore/device validation |
| Testing/security/release | 5/8 | tests, typecheck, build, lint, scans run locally | remote CI/Vercel/GCP/Supabase auth blockers |

## Remaining release blockers

- Git credential auth is still needed to push local commits.
- Vercel project linkage/env deployment is still unverified in this shell.
- Supabase CLI or database credentials are still needed for live migration/RLS/table verification.
- Cloud Run `mlatv` still needs source deployment and endpoint verification.
- Vertex endpoint readiness is still unverified.
- Native secure storage, offline queue, production FaceAtlas inference, Skin Twin simulation, CutisAI tools, report export worker, and treatment/task generation remain incomplete.
