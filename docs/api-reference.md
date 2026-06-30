# AcneTrex V3 — Backend API Reference (Phase 3)

All endpoints are implemented as **TanStack Start server functions**
(`createServerFn`) under `src/lib/api/*.functions.ts`. They are invoked via
typed RPC from the React Native / mobile-web client. Every function requires
authentication through `requireSupabaseAuth`, which validates the Supabase
bearer token, injects `context.supabase` (RLS-scoped as the user), and
exposes `context.userId`.

> Per PRD §Privacy & Zero-Fabrication: backend stores **no fabricated**
> values. AI/ML outputs (forecast, lesion counts, trigger hypotheses) are
> written only by AI/ML modules in Phase 5; this phase exposes reads and
> manual annotation paths only.

## Authentication

- Client signs in via Supabase Auth (email/password, Google OAuth broker).
- Every server function call receives an `Authorization: Bearer <jwt>` header
  via `attachSupabaseAuth` registered in `src/start.ts`.
- Row-Level Security policies on every table scope rows by `auth.uid()`.
- Admin-only RPCs use the `public.has_role(user, 'admin')` security-definer
  function defined in Phase 2.

## Storage Buckets

| Bucket | Visibility | Purpose |
| --- | --- | --- |
| `face-scans-raw` | private | Raw FaceAtlas captures. Auto-deleted on `finalizeFaceScan` unless `consents.raw_image_retention = true`. |
| `skin-twin` | private | Skin Twin preview renders. Signed URLs (5 min). |
| `reports` | private | Generated clinical-report PDFs. Signed URLs (10 min). |

## Modules

### Profile & Onboarding — `profile.functions.ts`
| Function | Method | Purpose |
| --- | --- | --- |
| `getProfile` / `upsertProfile` | GET / POST | Display name, timezone, sex, skin tone, climate, imaging calibration, onboarding_completed. |
| `getAcneHistory` / `upsertAcneHistory` | GET / POST | Onset, duration, severity, flare frequency. |
| `getSkinType` / `upsertSkinType` | GET / POST | Oiliness, dryness, sensitivity, barrier symptoms, allergies. |
| `getLifestyle` / `upsertLifestyle` | GET / POST | Sleep schedule, stress, diet patterns, hydration, exercise, occlusion exposures. |
| `getGoals` / `upsertGoals` | GET / POST | Primary goals, urgency, budget, fragrance/texture preference, free-form constraints. |

### Consents — `consents.functions.ts`
| Function | Notes |
| --- | --- |
| `getConsents` | Returns flags: `anonymous_learning`, `personal_learning`, `raw_image_retention`, `research_share`, `marketing`. |
| `updateConsents` | Sets `consented_at = now()` on every write for auditability. |

### FaceAtlas — `face-scans.functions.ts`
| Function | Purpose |
| --- | --- |
| `createFaceScan` | Creates a `face_scans` row with `status = pending_upload`. |
| `getScanUploadUrl` | Returns short-lived signed upload URL into `face-scans-raw/<user>/<scan>.jpg`. |
| `finalizeFaceScan` | Writes analysis fields (oiliness, lesion_counts, labels, model_confidence, user_certainty, image_quality). **Deletes the raw image** unless `consents.raw_image_retention` is true, and stamps `raw_image_deleted_at`. |
| `listFaceScans` / `getFaceScan` / `deleteFaceScan` | CRUD reads; delete also removes raw storage object if still present. |
| `createAnnotation` / `listAnnotations` / `deleteAnnotation` | Per-scan lesion annotations (user or model source). |

### Daily Logs — `logs.functions.ts`
| Function | Purpose |
| --- | --- |
| `upsertSleepLog` | Upsert by `(user_id, log_date)`. SleepDerm fields: sleep_time, wake_time, quality, disturbances, naps. |
| `listSleepLogs` | Range query `[from, to]` + `limit`. |
| `createFoodLog` / `updateFoodLog` / `deleteFoodLog` / `listFoodLogs` | Meal entries with categories, baseline flag, completion. |

### Routines — `routines.functions.ts`
CRUD over `routine_products` (slot ∈ cleanser, moisturizer, sunscreen, active, prescription, other).

### Treatment — `treatment.functions.ts`
Plans (`createTreatmentPlan`, `updateTreatmentPlan`, `listTreatmentPlans`) and tasks
(`createTreatmentTask`, `completeTreatmentTask`, `listTreatmentTasks`). Adherence %
is computed by the client until Phase 5 worker takes over.

### Gamification — `gamification.functions.ts`
| Function | Notes |
| --- | --- |
| `getGamification` | Returns the user's row (auto-creates on first call). |
| `recordAction` | Bumps points + pet_xp by `points` (default 10) and recomputes streak. Pet stages: egg → juvenile → adult → ascended at 500 / 2000 / 5000 XP. |
| `listBadges` / `listMyBadges` / `claimBadge` | Read catalog, read owned, claim by code. |

### Notifications — `notifications.functions.ts`
`getNotificationPrefs`, `updateNotificationPrefs`, `listNotifications`,
`markNotificationRead`. Scheduling is owned by a Phase 5 worker; this phase
exposes read + ack.

### Triggers & Forecast — `triggers.functions.ts`
`listTriggerHypotheses`, `updateTriggerHypothesisStatus` (proposed | confirmed |
rejected | watching), `getLatestForecast`. Writes for hypotheses & forecasts
are reserved for Phase 5 inference jobs.

### Skin Twin — `skin-twin.functions.ts`
`createSkinTwinSnapshot`, `listSkinTwinSnapshots`, `getSkinTwinPreviewUrl`
(returns 5-min signed URL into private `skin-twin` bucket).

### Weather — `weather.functions.ts`
`recordWeatherSnapshot` (coarsens lat/lon to ~0.1°, never stores precise
location) and `listWeatherSnapshots`.

### Products / FormulaLens — `products.functions.ts`
Authenticated reads: `searchProducts(q | barcode)`, `getProduct(id)`,
`lookupIngredient(inci)`. Catalog writes performed only by admin curation
jobs (out of scope this phase).

### Reports — `reports.functions.ts`
`requestReport` (queues a compile job), `listReports`, `getReportDownloadUrl`
(10-min signed URL from `reports` bucket).

## Error Conventions

Server functions throw `Error`. Zod validation errors surface as `ZodError`.
The bearer middleware throws `Unauthorized: ...` for missing/invalid tokens
— the client should treat these as `401` and redirect to `/auth`.

## Zero-Fabrication Contract

- Every write originates from authenticated user input or an explicit
  AI/ML module call. No server function fabricates scores, severities, or
  forecasts.
- AI/ML output tables (`forecasts`, `trigger_hypotheses`) are read-only in
  this phase except for user-controlled status changes on hypotheses.
- Raw images are deleted by default; retention requires explicit consent.

## PRD Traceability

| PRD module | Tables | Server-fn module |
| --- | --- | --- |
| Onboarding / Skin History | profiles, acne_history, skin_type_barrier, lifestyle_triggers, goals_constraints | profile.functions |
| Consent management | consents | consents.functions |
| FaceAtlas | face_scans, annotations + bucket `face-scans-raw` | face-scans.functions |
| SleepDerm | sleep_logs | logs.functions |
| Food logging | food_logs | logs.functions |
| FormulaLens | products, product_ingredients, routine_products | products.functions, routines.functions |
| Treatment plans | treatment_plans, treatment_tasks | treatment.functions |
| Gamification | gamification, badges, user_badges | gamification.functions |
| Notifications | notifications, notification_preferences | notifications.functions |
| N-of-1 triggers + forecast | trigger_hypotheses, forecasts | triggers.functions |
| Skin Twin | skin_twin_snapshots + bucket `skin-twin` | skin-twin.functions |
| Weather context | weather_snapshots | weather.functions |
| Clinical reports | reports + bucket `reports` | reports.functions |
