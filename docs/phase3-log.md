# Phase 3 Log — Backend API & Database

## Summary

Phase 3 builds the persistent backend for AcneTrex V3 on top of the
Supabase schema delivered in Phase 2. Implementation uses **TanStack
Start server functions** (the stack standard) rather than Supabase Edge
Functions; this preserves the monorepo's single-process developer
experience and avoids cross-runtime drift.

## What was implemented

- `src/lib/api/*.functions.ts` — 13 modules covering every PRD entity:
  profile/onboarding, consents, FaceAtlas (scans + annotations + storage),
  daily logs (sleep, food), routines, treatment plans + tasks,
  gamification, notifications, trigger hypotheses, forecasts, Skin Twin,
  weather snapshots, products/ingredients, reports.
- Every server function uses `requireSupabaseAuth`, which validates the
  caller's JWT and produces an RLS-scoped Supabase client. Combined with
  the Phase 2 RLS policies, each user can only read/write their own rows.
- **Raw-image privacy enforcement**: `finalizeFaceScan` checks the user's
  `consents.raw_image_retention` flag and physically deletes the raw image
  from the private `face-scans-raw` bucket immediately after analysis when
  retention is not granted. `raw_image_deleted_at` is stamped for audit.
- **Signed URLs only**: storage objects (FaceAtlas raw, Skin Twin previews,
  report PDFs) are never made public. Reads issue short-lived signed URLs
  (5–10 minutes).
- **Coarsened geolocation**: `weather.functions.ts` truncates lat/lon to
  ~0.1° before persisting, so we never store a user's precise location.
- **Zero-fabrication boundary**: `forecasts` and `trigger_hypotheses` are
  exposed read-only to the client. Writes are reserved for the Phase 5
  AI/ML modules; nothing in Phase 3 generates synthetic scores.
- `.env.example` documents every required environment variable. Secrets
  (`SUPABASE_SERVICE_ROLE_KEY`, `LOVABLE_API_KEY`, etc.) are managed via
  Lovable Cloud's secret store and never committed.
- `docs/api-reference.md` documents each function, its inputs, the table
  it touches, and traces it back to the PRD module.

## Architecture decisions

1. **Server functions over Edge Functions.** This stack already ships a
   server runtime via TanStack Start; running app-internal RPCs through
   `createServerFn` keeps types end-to-end and avoids managing a separate
   Deno deployment for routine CRUD.
2. **Loose typing of `supabase.from(...)`.** A small `sb()` helper in
   `_helpers.ts` casts the client to `any` for table writes. The generated
   `Database` types reject any optional field with the wrong literal
   shape and would force ~50 hand-typed insert payloads. With RLS +
   Zod validators guarding inputs, the runtime safety story is unchanged
   and the maintenance cost is much lower.
3. **Validators with Zod.** Every input is parsed by a Zod schema so a
   malformed client payload fails fast with a structured error before
   touching Postgres.
4. **Upsert-by-user_id for singleton onboarding tables.** profile,
   acne_history, skin_type_barrier, lifestyle_triggers, goals_constraints,
   consents, notification_preferences, gamification all upsert on
   `user_id` for an idempotent client API.
5. **Gamification streak math lives server-side.** The client cannot
   reliably compute streaks across devices/timezones; `recordAction`
   computes streak transitions from `last_action_at` server-side and
   updates `pet_stage` based on cumulative XP.

## Known limitations / hand-offs

- **No Phase 5 AI/ML writes yet.** `forecasts` and `trigger_hypotheses`
  remain read-only from the client. Phase 5 will introduce server fns
  that call the Lovable AI Gateway and persist results.
- **Report compilation pending.** `requestReport` only inserts a `queued`
  row. The actual PDF builder is a Phase 7 worker that will pick up
  queued rows, write to the `reports` bucket, and flip state to `ready`.
- **Notification dispatch pending.** This phase exposes preferences +
  inbox reads. Push/email fan-out is owned by Phase 6.
- **No admin curation endpoints.** Catalog writes for `products` and
  `product_ingredients` will land with the FormulaLens importer.
- **Unit tests.** Server-fn handlers are pure-ish but require a Supabase
  test project to be meaningful (RLS + auth are the whole behavior under
  test). A `vitest` harness against a local Supabase instance is queued
  for Phase 4 alongside the frontend integration tests.

## GitHub workflow

This Phase 3 deliverable was generated inside the Lovable preview
sandbox, which manages git state internally. The next contributor
should branch as `feat/phase3-backend-api` off `dev`, run
`bun install`, and open a PR into `dev`. CI must pass typecheck + lint
before promotion to `staging`.

## Prompts used

- "Phase 3: implement backend services and database schema for all PRD
  entities (users, profiles, consents, face scans, annotations, sleep,
  food, routines, treatment, gamification, notifications, triggers,
  forecasts, Skin Twin, weather, reports). Enforce RLS, signed-URL
  storage, raw-image deletion under consent."
- "Write server functions as TanStack `createServerFn` modules under
  `src/lib/api/*.functions.ts`, one per domain group, each authed via
  `requireSupabaseAuth`."
- "Document every endpoint in `docs/api-reference.md` and trace each
  back to the PRD module + Phase 2 table."

## Files added

```
src/lib/api/_helpers.ts
src/lib/api/profile.functions.ts
src/lib/api/consents.functions.ts
src/lib/api/face-scans.functions.ts
src/lib/api/logs.functions.ts
src/lib/api/routines.functions.ts
src/lib/api/treatment.functions.ts
src/lib/api/gamification.functions.ts
src/lib/api/notifications.functions.ts
src/lib/api/triggers.functions.ts
src/lib/api/skin-twin.functions.ts
src/lib/api/weather.functions.ts
src/lib/api/products.functions.ts
src/lib/api/reports.functions.ts
docs/api-reference.md
docs/phase3-log.md
.env.example
```
