# AcneTrex V3 PRD Module Coverage Matrix

This matrix tracks the current code body, not production-live status. A module can be routed, typed, and visibly interactive while still blocked by live Supabase, Cloud Run, Vertex, native device, or evidence-service validation.

| Module | Screen/Route | Schema | Service Adapter | Persistence Contract | AI/ML Contract | Tests | Status |
|---|---|---|---|---|---|---|---|
| Account/Auth | `/auth` | module registry | account/auth adapters | users, consent settings | readiness only | registry coverage | partial |
| Onboarding/Skin History | `/onboarding` | module registry | profile adapters | profile sections, consent settings | readiness only | registry coverage | partial |
| Consent/Privacy | `/privacy`, `/research`, `/delete-account` | module registry | consent/deletion services | consent/deletion/audit tables | consent gates | registry coverage | partial |
| Supabase/RLS/Storage | API health and module contracts | table mappings | Drizzle/Supabase adapters | reports, exports, scans, logs | telemetry target | registry coverage | blocked by live verification |
| SleepDerm | `/log/sleep` | daily log schema | sleep log adapter | daily_logs, sleep_logs | deterministic readiness | schema coverage | partial |
| DermDiet | `/log/food` | daily log schema | food log adapter | food_logs, daily_logs | feature readiness | schema coverage | partial |
| Stress/Activity/Hydration/Cycle/Contact/Routine/Skin State | `/log/*` routes | daily log schema | module contracts | daily_logs plus future dedicated tables | feature readiness | registry/schema coverage | scaffolded |
| FaceAtlas | `/face-atlas`, `/face-atlas/capture`, `/face-atlas/annotations`, `/face-atlas/history` | capture and annotation schemas | face scan adapter | face scans, annotations, raw bucket | queued cloud contract | registry/schema coverage | partial scaffold |
| FormulaLens/Products | `/products`, `/formula-lens` | module registry | product search adapter | products, ingredients | OCR/evidence unavailable | registry coverage | scaffolded |
| BarrierGuard | `/barrier` | module registry | contract only | daily_logs/profile sections | readiness contract | registry coverage | scaffolded |
| TriggerGraph/Forecasting | `/triggers`, `/forecast` | module registry | contract only | trigger hypotheses, forecasts | insufficient-data gates | registry coverage | scaffolded |
| Skin Twin Lab | `/skin-twin`, `/skin-twin/scenarios`, `/skin-twin/history` | scenario schema | snapshot adapter | skin twin snapshots | no-fake scenario contract | schema coverage | partial scaffold |
| CutisAI/AI Workspace | `/cutisai`, `/ai`, `/intelligence` | message schema | contract only | conversations/memory/ML tables planned | evidence unavailable state | schema coverage | scaffolded |
| Treatment Plan Center | `/treatments`, `/treatments/checkins`, `/log/treatment` | treatment draft schema | treatment adapters | treatment plans/check-ins/tasks | safety readiness | registry coverage | partial |
| Task Board/Gamification | `/tasks`, `/gamification` | module registry | gamification adapters | tasks, streak state, badges | real-data-only gates | registry coverage | partial |
| Reports/Exports/Profile | `/reports`, `/reports/history`, `/reports/export`, `/export`, `/profile` | report request schema | report/export/profile services | report/export/profile tables | missing-data report contract | schema coverage | partial |
| Native Mobile/Secure Storage | `/mobile` | module registry | contract only | offline/telemetry targets | local fallback readiness | registry coverage | scaffolded |
| CI/Security/Release | docs and local scripts | not applicable | local validation | deployment contracts | no-fake policy | pending command results | blocked by external auth |

## Latest app-body upgrade

The 2026-07-05 live-preview pass added module-specific workflow bodies across the catch-all route system:

- Reusable action, form, readiness, history, and operational-boundary panels.
- Typed workflow models for primary action, form fields, missing-data actions, safety notes, service endpoints, and integration checks.
- FaceAtlas capture/annotation forms and queued-cloud/no-fake-inference status.
- Skin Twin scenario form with supported windows/variables and insufficient-data projection boundaries.
- CutisAI message form with memory/evidence/backend readiness states.
- Report request, treatment/check-in, task, product/FormulaLens, SleepDerm, and DermDiet form bodies.
- Expanded `/api/health` diagnostics for database, environment flags, Cloud Run health, and critical tables when reachable.

These additions increase visible module completeness and local preview inspectability, but they do not replace live signed-session persistence, Cloud Run/Vertex inference, native secure storage, or production deployment validation.
