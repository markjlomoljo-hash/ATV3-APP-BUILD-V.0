# AcneTrex V3 integration recovery — 2026-07-11

This report records verified live state and implemented fixes. It intentionally
contains no passwords, tokens, service-role keys, or private connection strings.

## Gmail evidence reviewed

The connected project mailbox was searched and 100 relevant messages across 54
threads were read. The repeated CI failures for PR #4 were caused by a missing
npm lockfile. CodeQL was also configured to scan GitHub Actions as a language in
a repository with no eligible Actions source for that matrix entry. Subsequent
bot threads identified valid session, ownership, CSV injection, storage path,
report/export, deletion, and client-boundary issues; these were cross-checked
against current code rather than accepted blindly.

No email proved that Cloud Run or Vertex inference had ever become live. Vercel
mail only showed build notifications, and Supabase mail contained account/setup
messages rather than migration evidence.

## GitHub state recovered

- Working branch: `feat/phase7-profile-reports`.
- PR #4 targeted `main` even though the required flow is feature -> `dev`.
- PR #5 also targeted `main` and should target `dev`.
- PR #6 targets `dev` but contains broad deletions and must not be merged without
  a fresh diff/review.
- PR #1 and #3 are documentation PRs to `dev`; PR #2 is merged to `dev`.
- The CI workflow now uses the committed npm lockfile, read-only default token
  permissions, concurrency cancellation, timeouts, and build/type/lint/test gates.
- Vercel is standardized on `npm ci` and `npm run build` so local, GitHub, and
  Vercel dependency resolution use the same lockfile.

## Code fixes implemented

- Signed and timing-safe compatibility-session cookie; invalid or unsigned user
  IDs are rejected rather than trusted.
- Serializable profile updates with row locking and retry for concurrent writes.
- Deterministic profile aggregation and immutable default objects.
- Consent validation is strict and writes the actual persisted result to audit.
- Failed report/export jobs return non-success HTTP status.
- Report idempotency and treatment-consent enforcement.
- CSV spreadsheet-formula injection protection.
- Storage traversal/root-containment protection and raw-image deletion fail-close.
- Deletion processing isolates per-record failures and audits completion/failure.
- UI client boundaries, button default type, and progress semantics corrected.
- Full readiness label coverage restored.
- Route-smoke process shutdown fixed.
- Cloud Run health rejects placeholders and now requires Vertex and service-auth
  configuration before it can be considered healthy.

## Supabase live verification and remediation

Project `alobmstvqutteypusmuo` was ACTIVE_HEALTHY. Before remediation it had 28
useful legacy tables, three private buckets, and only four migrations. The Phase
7 memory/ML schema was absent. `ml_runtime_events` had RLS but no policy, an
infrastructure `SECURITY DEFINER` RPC was executable by anonymous users, and the
legacy RLS policies had 28 auth init-plan warnings.

Applied migrations:

- `phase7_memory_ml_contracts` (live version `20260710233648`)
- `supabase_security_performance_hardening`
- `admin_policy_initplan_hardening`

Verified result:

- 24 Phase 7 report/export/deletion/memory/ML tables exist.
- 25 relevant new/runtime tables have RLS.
- `ml_runtime_events` has an authenticated owner-read policy.
- Anonymous grants on public tables: zero.
- The public security-definer RPC path was removed; the role helper is private.
- All 28 RLS init-plan warnings and all 12 unindexed-FK warnings were resolved.
- Storage buckets remain private with owner-folder policies and UPDATE `WITH
  CHECK`.
- `face-scans-raw`: 4 MiB, image MIME allowlist.
- `reports`: 50 MiB, PDF/ZIP/JSON/CSV allowlist.
- `skin-twin`: 10 MiB, image/JSON allowlist.

Two advisor warnings are explicitly retained pending a controlled architecture
change: pgvector is installed in `public`, and authenticated tables are visible
in GraphQL metadata. RLS still restricts rows. Moving pgvector or revoking all
authenticated direct reads could break existing clients and requires its own ADR
and migration.

## Vercel live root causes

- Production served an older READY deployment while newer deployments failed.
- One failure was the readiness-label TypeScript mismatch now fixed locally.
- PR #6 preview build failed because `DATABASE_URL` was absent at build-time.
- Production runtime logs show `getaddrinfo ENOTFOUND` for
  `aws-l-ap-northeast-1.pooler.supabase.com`.
- Root cause: the configured pooler hostname contains lowercase `l` where the
  correct Supabase transaction-pooler host uses the provider-generated value
  (commonly `aws-0-...`). The secret must be replaced from Supabase's Connect
  panel; editing the hostname without preserving the exact encoded password and
  project-qualified username is unsafe.
- The connected Vercel inspection API does not expose secret mutation, and the
  local CLI has no authenticated session. This remains a secret-holder action.

## Cloud Run and Vertex

`https://mlatv-pudz4xjzxa-ew.a.run.app/health` still returns Google's placeholder
HTML stating that continuous deployment is configured but application code has
not deployed. The FastAPI service was tested locally after these fixes:

- The invalid FastAPI union response annotation that prevented route
  registration was fixed.
- `/predict` now requires a server-only bearer secret.
- Wildcard Vercel CORS is no longer enabled by default.
- Cloud Build injects the shared secret from Secret Manager.
- The proxy fails closed when its matching server secret is absent.
- Python contract suite: 6 passing tests.

No Google Cloud connector or authenticated `gcloud` session is available in this
workspace, so deployed model count, runtime service-account IAM, secret binding,
and live prediction remain externally unverified.

## Required secret-holder actions

1. In Vercel, replace `DATABASE_URL` for Production and Preview using the exact
   Supabase transaction-pooler URI from the Supabase Connect panel. Do not paste
   it into Git, chat, logs, or documentation.
2. Create Secret Manager secret `acnetrex-ml-shared-secret`, grant the Cloud Run
   runtime account secret access, and set the identical value as server-only
   Vercel `ACNETREX_ML_SHARED_SECRET`.
3. Grant the runtime service account `roles/aiplatform.user`.
4. Deploy `cloudbuild.yaml`, then verify `/`, `/health`, unauthorized `/predict`,
   and an authorized real inference request.
5. Verify endpoint `5976620302904328192` has a deployed model. If it does not,
   keep `vertex_model_missing`/503 behavior; never create fake output.
