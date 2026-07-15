# Live verification record

Date: 2026-07-14. Evidence below was captured from the named live resources; no secret values are recorded.

## Cloud Run

- Project/service/region: `project-09bedce3-3c99-4a2b-aad` / `mlatv` / `europe-west1`.
- Production revision: `mlatv-00012-biw`, 100% traffic.
- Rollback revision: `mlatv-00002-4ww`, retained and reachable through the zero-traffic `rollback` tag.
- Image: `us-central1-docker.pkg.dev/project-09bedce3-3c99-4a2b-aad/acnetrex-ml/ml-engine@sha256:2aa79e1a9f8f20b4d7861a2b399da93c2e9a7556650d8c56761df3cc090d418f`.
- Artifact Analysis: finished successfully with 0 critical, 11 high, 9 medium, and 56 low findings; SLSA build level 3. The high findings are in the distroless Debian runtime rather than Python packages.
- Production smoke: `/` identifies `acnetrex-ml`; `/health/live`, `/health/ready`, and authenticated `/v1/predict` return 200. Readiness reports artifact integrity, registry, and PostgreSQL persistence ready while predictive models remain honestly unavailable.
- Contract wall: deterministic predict 200, same-key replay 200 with `Idempotency-Replayed: true`, changed-payload reuse 409, unauthenticated request 401, models/metrics/batch/explain 200, and durable job create/fetch/replay 200.
- A temporary zero-traffic revision with a near-zero internal prediction deadline returned 504 and persisted a failed job with `error_retryable`, `prediction_timeout`, and `retryable=true`. The temporary tag was removed and the 20-second internal prediction deadline restored before promotion; the Cloud Run platform request timeout remains 60 seconds.
- Post-promotion revision logs: 8 sampled requests, all 2xx, with zero ERROR entries and zero 5xx responses.

## Vercel application integration

- Project: `atv-3-app-build-v-0`; production: `https://atv-3-app-build-v-0.vercel.app`.
- Production deployment for commit `92c57bc` is READY.
- Production and Preview have canonical server/public ML URL variables. `ACNETREX_ML_SHARED_SECRET` and the independently generated worker secret are sensitive server-only variables; the durable worker is enabled with a bounded timeout.
- `GET /api/health` returns 200 with `ok=true`, database `connected`, schema `ready`, Cloud Run `healthy`/`acnetrex-ml`, and worker `configured`.
- `POST /api/ml/jobs` without Supabase authentication returns 401 `auth_required`.
- The latest production deployment yielded 88 queried runtime events with zero error/fatal or 5xx events.
- Clerk is not configured and remains an explicit non-ML owner action; health reports this warning without masking the green ML/database state.

## Supabase

- Project: `alobmstvqutteypusmuo`; the rotated database credential is used through Secret Manager version 2 and verified with `sslmode=verify-full` plus the published Supabase 2021 CA.
- The forward-only ML governance and legacy-grant revocation migrations are applied.
- Vercel health confirms database connectivity and complete canonical, legacy, web-compatibility, and persistent-memory table contracts.
- A same-image Cloud Run SQL assertion completed successfully only when all of these counts were zero: public tables without RLS, anonymous public-table grants, authenticated public-table write grants, public Storage buckets, and PUBLIC-executable security-definer functions in `public`.
- The disposable database probe job was deleted after verification.

## Vertex AI

- Endpoint `5976620302904328192` (`acnetrex-endpoint`) exists in `us-central1`.
- Runtime service account `724627131846-compute@developer.gserviceaccount.com` has `roles/aiplatform.user`.
- The endpoint has no `deployedModels` field and therefore zero deployed models. No Vertex prediction is claimed; readiness correctly reports `verification_required`, and predictive tasks remain unavailable until a legitimate evaluated artifact is manually approved and deployed.

## Repository and validation

- Promotion chain completed through `feat/phase7-profile-reports` -> `dev` (PR #4) -> `staging` (PR #12) -> `main` (PR #13). The production-main merge is `b50e1dd`; security follow-up PR #14 merged as `7d8d951`.
- Main-branch CI, CodeQL, APIsec configuration gate, Dependency Graph, Vercel, and Gitar checks completed successfully for `7d8d951`.
- The imported empty duplicate CodeQL workflow was removed; GitHub default CodeQL remains authoritative. The unrelated APIsec `VAmPI` starter configuration was replaced with an owner-configured fail-safe gate.
- Dependabot reported zero open alerts after pinning PostCSS `8.5.15` and pytest `9.0.3`.
- Deployed Cloud Run evidence originated from commit `92c57bc`; native coordinator integration and clean-checkout package-boundary fixes were promoted with the branch.
- CI covers the app test/lint/typecheck/build/route smoke, mobile clean install/typecheck, and ML-service Ruff format/lint plus Python tests.
- Local app verification after native job integration: 49 Vitest files and 238 tests passed, root and mobile TypeScript passed, and ESLint passed. Mobile npm audit reports zero vulnerabilities.
- Tracked-file secret scan found no private keys, OpenAI keys, or GitHub tokens. Four credential-shaped PostgreSQL URLs were confirmed to be documentation examples or test fixtures, not live credentials.

## Unverified owner-dependent evidence

- The Expo readiness console is wired to the shared deterministic runtime, authenticated `/api/ml/jobs`, and encrypted offline queue with stable replay identities. EAS CLI is not authenticated in this session, so signed iOS/Android development/release builds and physical-device camera, lifecycle, battery, thermal, memory, and offline replay checks remain unverified.
- No clinically validated predictive model exists because the supplied data lacks a legally cleared, representative patient-level outcome cohort and production image corpus. Deterministic modules are live; predictive modules abstain honestly.
