# Codex Continuation Handoff — AcneTrex V3 Hybrid ML

Last verified: 2026-07-14 (Asia/Manila)

This document is the operational handoff for the next Codex session. It is intentionally evidence-heavy. Treat live services, the current repository, and the authoritative objective files as the source of truth; do not infer completion from this document alone.

## 1. Mission and controlling objective

The full objective is to finish AcneTrex V3 as a mobile-first native iOS/Android hybrid ML product, not merely a web demo or a plan. The objective requires:

- validating and integrating the supplied ML foundation and V4 representation data;
- preserving zero-fabrication behavior;
- using only legitimate, licensed, consented, representative data for trained models;
- integrating deterministic local/cloud engines, authenticated application APIs, durable Supabase jobs/results, Cloud Run, optional Vertex AI, and Expo iOS/Android;
- enforcing consent, identity, RLS, private Storage, idempotency, durable retries, telemetry, rollback, and safe deletion;
- proving behavior through repository tests, live checks, container evidence, and installed-device testing;
- leaving only genuine owner, legal/data, clinical-validation, or external-account blockers.

The original goal was marked `blocked` only after the same external blockers persisted across multiple continuation audits. If the user supplies the missing owner/data state, treat the resumed run as a fresh audit and continue rather than assuming the blockers remain.

## 2. Mandatory files to read first

Read these before changing anything:

1. `C:\Users\USER\.codex\attachments\3a38841e-f433-4131-b4de-4d085b09ce53\goal-objective.md`
2. `C:\Users\USER\.codex\attachments\3a38841e-f433-4131-b4de-4d085b09ce53\pasted-text-1.txt`
3. `C:\Users\USER\.codex\codex-remote-attachments\019f5b65-a832-7973-b43f-049cdcf61d79\6983CCC6-DCE8-415E-AE1C-62BD225D76D9\1-ML-EXECUTION.md`
4. `C:\Users\USER\Downloads\CODEX_CONTINUATION_BLOCKERS.md`
5. `C:\Users\USER\Downloads\acnetrex-v3-mobile-prd-v1.5-interface-sleep-food-skin-twin-integrated.md`
6. `C:\Users\USER\Downloads\AcneTrex Development Workflow Constitution.md`
7. `C:\Users\USER\Downloads\STRESS_VALIDATION_2026-07-13.md`
8. `C:\Users\USER\Downloads\reliability-security-coverage-matrix.md`

The two supplied archives are:

- `C:\Users\USER\Downloads\V4AcneTrex_ML_Representation_Pack_v4.zip`
- `C:\Users\USER\Downloads\AcneTrex_ML_Brain_Foundation_v1 (1).zip`

Do not print secrets or credential-bearing URLs while inspecting them. The last verified SHA-256 values were:

| Archive/file | SHA-256 |
|---|---|
| V4 representation pack | `DA937A31C3751312F38E0F8EBB37ED444608ECAEC64C980A0DB4F9B07AA3DA14` |
| ML foundation archive | `112AF3EA7B18A6D9B495D01B1F36037C6FA2292ED9B270C6F938CFC5502B0C7A` |

## 3. Repository and branch state

Repository: `https://github.com/markjlomoljo-hash/ATV3-APP-BUILD-V.0`

Current local checkout at handoff:

- directory: `C:\Users\USER\Documents\AcneTrex V3`
- branch: `main`
- `HEAD`: `48360f60d284b0a4f62765a6513fda07844d4345`
- `origin/main`: same commit
- worktree: clean
- final promotion chain: feature branch → `dev` → `staging` → `main`
- PR #4: feature → dev, merged as `a3dd10e`
- PR #12: dev → staging, merged as `3e9e70f`
- PR #13: staging → main, merged as `b50e1dd`
- PR #14: security/workflow/dependency repair → main, merged as `7d8d951`
- PR #15: final live-verification documentation → main, merged as `48360f6`

Use the Git executable at `C:\Program Files\Git\cmd\git.exe` if Git is not on PATH. Always begin a continuation with:

```powershell
$git = 'C:\Program Files\Git\cmd\git.exe'
& $git fetch --all --prune
& $git status -sb
& $git branch --show-current
& $git log -12 --oneline --decorate
```

Never reset, force-push, or discard user work. The working tree was clean at handoff; stop and inspect if that changes unexpectedly.

## 4. Live infrastructure identifiers

### Cloud Run

- GCP project: `project-09bedce3-3c99-4a2b-aad`
- service: `mlatv`
- region: `europe-west1`
- canonical URL: `https://mlatv-pudz4xjzxa-ew.a.run.app`
- incorrect URL that must never be used: `https://mlatv-pudz4xjxa-ew.a.run.app`
- production revision: `mlatv-00012-biw`
- production traffic: 100%
- rollback tag: `rollback`, revision `mlatv-00002-4ww`
- production image digest: `sha256:2aa79e1a9f8f20b4d7861a2b399da93c2e9a7556650d8c56761df3cc090d418f`
- Artifact Analysis: finished successfully; 0 critical, 11 high, 9 medium, 56 low; SLSA level 3
- platform request timeout: 60 seconds
- internal prediction deadline: 20 seconds

The old rollback revision is the historical placeholder. It is retained only as a tested zero-traffic emergency target; rolling back to it restores the old placeholder behavior and is not an ML promotion.

### Vercel

- project: `atv-3-app-build-v-0`
- project ID: `prj_jgVeEYxJm0U53Luk4X1Duo7VHVKK`
- team slug: `dvvsj6v2s8-9316s-projects`
- canonical production URL: `https://atv-3-app-build-v-0.vercel.app`
- health route: `https://atv-3-app-build-v-0.vercel.app/api/health`

Production and Preview contain canonical ML URL variables, sensitive shared/worker secrets, worker enablement, and bounded worker timeout. Secret values must never be pulled into chat, logs, or this file.

### Supabase

- project ref: `alobmstvqutteypusmuo`
- URL: `https://alobmstvqutteypusmuo.supabase.co`
- rotated database credential is in Secret Manager version 2
- production TLS uses the published Supabase 2021 CA and `sslmode=verify-full`
- forward-only ML governance and legacy-grant revocation migrations are applied
- disposable SQL probe job was deleted after verification

### Vertex AI

- project: `project-09bedce3-3c99-4a2b-aad`
- location: `us-central1`
- endpoint ID: `5976620302904328192`
- display name: `acnetrex-endpoint`
- runtime service account: `724627131846-compute@developer.gserviceaccount.com`
- IAM verified: `roles/aiplatform.user`
- deployed models: zero

Do not deploy a dummy model, reuse a placeholder container, manufacture labels, or claim a Vertex prediction. The exact blocker is absence of a legitimate, evaluated, approved artifact and training dataset.

## 5. Current production behavior

Cloud Run currently proves:

- `GET /` identifies `acnetrex-ml`;
- `/health/live` returns 200;
- `/health/ready` returns 200 with artifact integrity, registry, and persistence ready;
- authenticated `/v1/predict` returns a deterministic response;
- same idempotency key/payload replays the same logical result and sets `Idempotency-Replayed: true`;
- same key with a changed payload returns 409;
- unauthenticated inference returns 401;
- `/v1/models`, `/v1/metrics`, `/v1/batch`, and `/v1/explain` are authenticated and available;
- durable job creation, fetch, replay, and retryable timeout persistence work;
- temporary timeout revision testing returned 504 and persisted `error_retryable`/`prediction_timeout`, then was removed;
- post-promotion sampled logs had no ERROR entries and no 5xx responses.

Vercel currently proves:

- `/api/health` returns 200 and `ok=true`;
- database is `connected`;
- schema is `ready` across canonical, legacy, web-compatibility, and memory contracts;
- Cloud Run is `healthy` and identifies `acnetrex-ml`;
- durable worker is `configured` and enabled;
- unauthenticated `/api/ml/jobs` returns 401 `auth_required`;
- only remaining health warning is `clerk_not_configured`.

The exact sanitized check to rerun is:

```powershell
$h = Invoke-RestMethod 'https://atv-3-app-build-v-0.vercel.app/api/health'
[pscustomobject]@{
  ok=$h.ok; database=$h.database.status; schema=$h.database.schema.status
  cloudRun=$h.cloudRun.status; service=$h.cloudRun.service
  worker=$h.mlWorker.status; warnings=($h.warnings -join ',')
} | ConvertTo-Json -Compress

$r = Invoke-RestMethod 'https://mlatv-pudz4xjzxa-ew.a.run.app/health/ready'
[pscustomobject]@{
  ok=$r.ok; service=$r.service; artifact=$r.artifactIntegrity.state
  registry=$r.modelRegistryState; persistence=$r.persistence.state
  vertex=$r.vertex.state; predictive=$r.predictiveModels
} | ConvertTo-Json -Compress
```

Expected: Vercel `ok=true`, database `connected`, schema `ready`, Cloud Run `healthy`, worker `configured`; Cloud Run `ok=true`, service `acnetrex-ml`, artifact/registry/persistence `ready`, Vertex `verification_required`, predictive `unavailable`.

## 6. Code architecture now in production

- Native app: `apps/mobile`
- shared local runtime: `packages/ml-local-runtime`
- mobile auth storage: Expo SecureStore
- mobile private/offline storage: Expo SQLite/SQLCipher with SecureStore key
- native job adapter: `apps/mobile/src/lib/ml.ts`
- public coordinator API: `@acnetrex/ml-local-runtime/mobile-job-coordinator`
- mobile coordinator tests: `src/lib/acnetrex/mobile-ml-coordinator.test.ts`
- application job route: `src/app/api/ml/jobs/route.ts`
- durable job service: `src/lib/acnetrex/ml-analysis-jobs.ts`
- worker: `src/lib/acnetrex/ml-analysis-worker.ts`
- canonical contracts: `packages/ml-local-runtime/src/contracts.ts` and `ml-service/schemas/*`
- ML service: `ml-service/main.py` and `ml-service/acnetrex_ml/service/*`
- migration source: `supabase/migrations/*`

Native runtime behavior:

1. Validate request and preserve request/idempotency identities.
2. Refuse local processing when consent/readiness is not sufficient.
3. Run supported deterministic logic locally.
4. Submit authenticated cloud work through `/api/ml/jobs` when connected.
5. Store the exact validated payload and original identities in encrypted SQLite when offline.
6. Replay later with the same idempotency key.
7. Return honest `insufficient_data`, `queued_for_cloud`, `model_unavailable`, or other allowed readiness states; never substitute a fabricated numeric prediction.

## 7. Data/model truth

The V4 pack is not a clinical training cohort. It contains static ontology/aliases, retrieval/reference content, synthetic metadata/annotations, fixtures, malformed/header-only/duplicate/contradictory records, and no legally cleared real longitudinal image/outcome cohort.

The repository therefore intentionally has:

- no active predictive model;
- rejected/untrained model registry entries;
- untrained model cards;
- a training gate that exits with `training_blocked/no_approved_training_dataset`;
- deterministic engines for readiness, SleepDerm, DermDiet, TriggerGraph, Skin Twin, FormulaLens, BarrierGuard, treatment support, and related descriptive work;
- abstention for lesion/severity/forecast models.

Never turn synthetic fixtures into claimed clinical metrics. Never use behavior-tuning conversations as flare or lesion labels. Never accept a Kaggle/mirror copy as legally trainable without original license, consent, provenance, representation, and redistribution review.

Research artifacts:

- `docs/ml-research/resource-discovery-log.md`
- `docs/ml-research/open-source-resource-matrix.csv`
- `docs/ml-research/dataset-candidate-register.csv`
- `docs/ml-research/pretrained-model-candidate-register.csv`
- `docs/ml-research/rejected-resources.md`
- `ml-service/manifests/dataset-manifest.json`
- `ml-service/manifests/model-registry.json`
- `ml-service/reports/model-cards/*`
- `ml-service/reports/evaluation/*`

## 8. Validation evidence

At final main promotion:

- GitHub app/mobile/ML CI passed;
- GitHub CodeQL passed;
- APIsec gate passed in explicit not-configured mode because owner credentials/project are absent;
- Dependency Graph passed;
- Gitar passed;
- Vercel deployment passed;
- Dependabot open alerts: zero;
- local app suite: 49 Vitest files, 238 tests passed;
- root TypeScript and ESLint passed;
- mobile clean install/typecheck passed;
- mobile npm audit: zero vulnerabilities;
- ML Ruff check/format and Python tests passed in GitHub’s Python 3.11 environment;
- container scan: zero critical findings;
- tracked high-signal secret scan: no private keys, OpenAI keys, or GitHub tokens.

The local bundled Python is not a valid ML test runtime: it is Python 3.14 and cannot install the pinned Python-3.11 `psycopg-binary` dependency. Do not alter production pins to accommodate that local alias; use GitHub’s Python 3.11 job or a Python 3.11 environment.

## 9. Remaining work — do not claim complete until addressed

### A. EAS and physical-device validation (owner/account blocker)

Current evidence:

```powershell
$env:PATH = 'C:\Users\USER\.codex\tooling\node-v24.18.0-win-x64;C:\Users\USER\.codex\tooling\npm-global;' + $env:PATH
& 'C:\Users\USER\.codex\tooling\npm-global\eas.cmd' whoami
```

Last result: `Not logged in`.

Required owner action:

1. Owner signs into EAS in the authorized environment.
2. Verify `eas whoami`.
3. Run development/internal builds for both platforms.
4. Install builds on at least one representative iPhone and Android device.
5. Verify SecureStore key creation, SQLCipher reopen, logout/session refresh, camera permission/capture, background/resume/termination, airplane-mode queue/replay, idempotency reuse, memory, battery, thermal, latency, and accessibility.
6. Record build IDs, runtime versions, device models/OS versions, and pass/fail evidence without recording secrets or raw face data.

Do not ask the user to paste passwords, tokens, OAuth codes, service-account JSON, or credential-bearing URLs. Use the owner’s normal EAS login flow.

### B. Clerk owner configuration (optional but still visible)

Vercel health warning: `clerk_not_configured`.

If Clerk is required for web/admin/RBAC:

- owner configures `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY`, and owner bootstrap variables in Vercel Production and Preview;
- verify sign-in/session claims/RBAC/owner bootstrap and rerun `/api/health`;
- never print the values.

If Clerk is intentionally deferred, keep the warning documented; it does not block deterministic ML or Supabase Auth job processing.

### C. Legitimate predictive-model data and clinical validation

Required before Vertex/model activation:

- legally cleared, consented, representative patient-level longitudinal outcomes;
- licensed, consented real image corpus for FaceAtlas tasks;
- dermatologist-reviewed labels/taxonomy and annotation QC;
- identity-safe grouped/episode/temporal splits and untouched external holdout;
- baseline and stronger candidate comparison;
- calibration, abstention/OOD, subgroup/fairness, latency, size, memory, battery, and cost evidence;
- immutable snapshot hash, provenance, consent/de-identification, retention and deletion policy;
- manual approval, registry record, model card, checksum, canary, monitoring, and rollback target.

Until every gate passes, leave `active_models=[]`, keep Vertex at zero deployed models, and return honest unavailable/readiness states.

## 10. Safe continuation workflow

### Before any edit

1. Read the mandatory files in section 2.
2. Check goal status with the goal system; if the user has supplied new owner/data state, resume the blocked goal as a fresh audit.
3. Fetch all remotes and inspect branch/worktree state.
4. Confirm no secrets are present in output.
5. Make a narrow plan tied to the actual remaining requirement.

### For code changes

Use TDD:

1. Add a focused failing test.
2. Run it and capture the intended RED result.
3. Commit the RED checkpoint when practical.
4. Implement the smallest correct fix.
5. Rerun the same test and capture GREEN.
6. Run typecheck/lint/full relevant tests.
7. Review `git diff --check`, security impact, and changed files.
8. Commit and push without force.
9. Wait for app/mobile/ML CI, CodeQL/APIsec/Dependency Graph as applicable, Vercel, and reviewer checks.

### For deployment changes

- Do not rotate the already-working database credential or CA unless new direct evidence and owner authorization justify it.
- Do not create a new backend, database, model, or cache merely to satisfy a checklist.
- Do not deploy a model without legitimate data and approval.
- Do not expose secret values in commands, logs, docs, screenshots, or chat.
- Use Cloud Run Secret Manager references and server-only Vercel variables.
- Verify root/live/ready/auth/predict/replay/timeout/rollback after any service mutation.
- If a canary fails, remove temporary traffic/tag state and restore the known-good revision.

### For branch promotion

Use normal PRs and protected merges:

```powershell
gh pr create --base staging --head dev ...
gh pr create --base main --head staging ...
gh pr checks <number>
gh pr merge <number> --merge
```

If GitHub reports a merge conflict, resolve it in a local promotion branch. Preserve main-only security workflows and production-verified staging files. Never force-push.

## 11. Useful commands

```powershell
# Repository
$git = 'C:\Program Files\Git\cmd\git.exe'
& $git status -sb
& $git log --oneline --decorate -20
& $git diff --check

# Cloud Run
$g = 'C:\Users\USER\.codex\tooling\google-cloud-sdk\bin\gcloud.cmd'
& $g run services describe mlatv --region=europe-west1 --project=project-09bedce3-3c99-4a2b-aad --format='yaml(status.latestReadyRevisionName,status.traffic,spec.template.spec.timeoutSeconds)'
& $g ai endpoints describe 5976620302904328192 --region=us-central1 --project=project-09bedce3-3c99-4a2b-aad --format=json

# GitHub
$env:PATH = 'C:\Program Files\Git\cmd;' + $env:PATH
gh run list --branch main --limit 10 --json databaseId,headSha,status,conclusion,workflowName
gh api 'repos/markjlomoljo-hash/ATV3-APP-BUILD-V.0/dependabot/alerts?state=open&per_page=100'

# Vercel
$env:PATH = 'C:\Users\USER\.codex\tooling\node-v24.18.0-win-x64;C:\Users\USER\.codex\tooling\npm-global;' + $env:PATH
vercel ls atv-3-app-build-v-0 --yes
vercel inspect <deployment-url>
```

## 12. Completion and handoff criteria

Do not call the goal complete while EAS/device evidence, required Clerk owner setup, or legitimate predictive-data/clinical validation remains missing. When owner/data blockers are still unchanged after the required repeated audit threshold, keep the goal blocked and provide the exact next owner action.

When all requirements are actually satisfied:

1. rerun the full completion audit against the objective line by line;
2. verify current live state, not historical output;
3. update `docs/ml/LIVE_VERIFICATION.md` with final commit/revision/build/device evidence;
4. produce the exact required `# Codex Handoff - AcneTrex V3 Hybrid ML Integration and Live Deployment` format;
5. call `update_goal` with `complete` only after every requirement is proven.

The strongest currently supported claim is: **software foundation, deterministic ML integration, Cloud Run deployment, Vercel/Supabase connectivity, branch promotion, security gates, and durable authenticated inference are production verified; predictive modeling and installed physical mobile validation remain externally blocked.**
