# Owner actions checklist

Exact actions only the project owner can perform, current as of 2026-07-26.
This document names environment variables and flows only — never put secret
values in this file, in chat, or in any commit.

## A. EAS builds and physical-device validation

Blocker: `eas whoami` last returned `Not logged in` (see
`CODEX_CONTINUATION_HANDOFF.md` section 9A).

1. Sign in with your normal Expo/EAS login flow: `eas login`
2. Verify: `eas whoami`
3. Run development/internal builds for both platforms from `apps/mobile`:
   - `eas build --profile development --platform ios`
   - `eas build --profile development --platform android`
4. Install the builds on at least one representative iPhone and one Android
   device.
5. Work through the device test matrix from `CODEX_CONTINUATION_HANDOFF.md`
   section 9A: SecureStore key creation, SQLCipher reopen, logout/session
   refresh, camera permission/capture, background/resume/termination,
   airplane-mode queue/replay, idempotency reuse, memory, battery, thermal,
   latency, and accessibility.
6. Record build IDs, runtime versions, device models/OS versions, and
   pass/fail evidence — never record secrets or raw face data.

Do not paste passwords, tokens, OAuth codes, service-account JSON, or
credential-bearing URLs anywhere; only the interactive `eas login` flow.

## B. Clerk configuration on Vercel

The only remaining `/api/health` warning is `clerk_not_configured`.

Set these in Vercel (Production and Preview). Three key/bootstrap variables:

- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`
- `CLERK_SECRET_KEY` (secret — Vercel encrypted env only)
- `ACNETREX_OWNER_CLERK_USER_ID` (server-side, the confirmed owner user ID)

Four routing variables (values per `.env.example`):

- `NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in`
- `NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up`
- `NEXT_PUBLIC_CLERK_SIGN_IN_FALLBACK_REDIRECT_URL=/`
- `NEXT_PUBLIC_CLERK_SIGN_UP_FALLBACK_REDIRECT_URL=/`

Then redeploy, verify sign-in/session claims/RBAC/owner bootstrap, and confirm
`https://atv-3-app-build-v-0.vercel.app/api/health` no longer lists the
`clerk_not_configured` warning.

## C. ML data rights and gated backbone access

Nothing can train for production until one dataset licence is signed AND the
backbone terms are accepted. Both tracks:

1. Dataset licence (pick one):
   - ACNE04 commercial licence: contact the author, Xiaoping Wu
     (`xpwu95@163.com`); the public repo grants academic use only. A signed
     commercial licence must cover training, deployment, derivatives,
     retention, and redistribution, plus consent/provenance documentation.
   - OR the DermNet paid AI dataset licence
     (`https://dermnetnz.org/dermatology-image-dataset`) plus a signed DPA,
     with consent, de-identification, split-key, and redistribution scope
     confirmed in the contract.
2. Backbone access (Path A):
   - Create/use a Hugging Face account and accept the HAI-DEF terms on
     `https://huggingface.co/google/derm-foundation` (gated repo). Have
     counsel review the commercial-with-conditions clauses (Health Regulatory
     Authorization for clinical/severity claims; medical-device manufacturer
     clause; no-diagnosis) before any weight download or use.
   - Provide the token as the `HF_TOKEN` environment variable in the
     environment where the pipeline runs. Code reads it from env only; never
     commit it or paste it into chat.

Until both are done, the training gate keeps exiting
`training_blocked/no_approved_training_dataset` — this is correct behavior.

## D. Cloud Run redeploy for pending ml-service commits

From the repository root, with `gcloud` authenticated to project
`project-09bedce3-3c99-4a2b-aad`:

```bash
gcloud config set project project-09bedce3-3c99-4a2b-aad
gcloud builds submit --config cloudbuild.yaml
```

This builds `ml-service/Dockerfile` and deploys the `mlatv` service in
`europe-west1` with the pinned env vars and Secret Manager references in
`cloudbuild.yaml`.

Post-deploy re-verification:

```bash
curl -s https://mlatv-pudz4xjzxa-ew.a.run.app/health/live
curl -s https://mlatv-pudz4xjzxa-ew.a.run.app/health/ready
```

Expected: `/health/ready` returns 200 with artifact integrity, registry, and
persistence ready, Vertex `verification_required`, and predictive models
`unavailable` (no predictive artifact is approved).

## E. Vercel environment variables (storage, worker, cron)

Set in Vercel (Production and Preview) using the exact names from
`.env.example`; values live only in Vercel's encrypted env store:

- Storage backend: `ACNETREX_STORAGE_BACKEND=supabase`, plus `SUPABASE_URL`
  and `SUPABASE_SERVICE_ROLE_KEY` (secret) that it requires; missing config
  fails closed.
- Database TLS: `DATABASE_URL` (secret, transaction pooler URL) and
  `SUPABASE_DB_CA_CERT` (server-only PEM).
- Sessions: `SESSION_SIGNING_SECRET` (secret, at least 32 random characters).
- ML worker: `ACNETREX_ML_WORKER_ENABLED=true`, `ACNETREX_ML_WORKER_SECRET`
  (secret), `ACNETREX_ML_SHARED_SECRET` (secret, must match the Cloud Run
  side), `ML_WORKER_TIMEOUT_MS`, `ML_WORKER_KICK_MAX_JOBS`,
  `ML_WORKER_KICK_BUDGET_MS`.
- Cron: `CRON_SECRET` (secret) — Vercel sends
  `Authorization: Bearer $CRON_SECRET` with the daily cron in `vercel.json`
  that backstops `/api/internal/ml/worker`.

After setting variables, redeploy and re-check
`https://atv-3-app-build-v-0.vercel.app/api/health` (expect `ok=true`,
database `connected`, schema `ready`, Cloud Run `healthy`, worker
`configured`).
