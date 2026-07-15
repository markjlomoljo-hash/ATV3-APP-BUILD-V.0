# Repository Scout Findings — AcneTrex V3

Audited read-only on 2026-07-15 (Asia/Manila). The only file created by this scout is this report. Remote refs were refreshed with `git fetch --all --prune`; no application code, production service, database, or credential state was changed.

## Decision summary

1. **There is no live ANN or ensemble implementation in this checkout.** The canonical registry has `active_models: []`; all four predictive entries are `0.0.0-untrained`, rejected, and have no artifact URI/hash. The dataset manifest has `training_eligible_datasets: []`. Cloud execution in `ml-service/acnetrex_ml/service/app.py` calls deterministic dispatch only; unsupported tasks return an explicit unavailable/queued state. `ml-service/acnetrex_ml/training/gate.py` only prepares a governed run plan and currently fails closed with `no_approved_training_dataset`.
2. **The durable deterministic inference foundation is substantial and coherent.** Canonical flow is Expo (`apps/mobile`) → authenticated Next `/api/ml/jobs` → Supabase `ml_analysis_jobs` + `outbox_events` → leased worker → Cloud Run `/predict` alias → validated `ml_analysis_results` → mobile polling/cache. Direct `/api/ml/predict` is intentionally HTTP 410.
3. **The branch contains a committed Railway worker recovery stack, but the working tree contains a much larger uncommitted second phase.** Do not reset or overwrite it. The uncommitted set spans ML delivery-state reconciliation, consent, deletion lifecycle, mobile durable polling/cache/presentation, Skin Twin completion, Cloud Run idempotency recovery, research registers, and dependency overrides.
4. **The most authoritative handoff is `CODEX_CONTINUATION_HANDOFF.md` dated 2026-07-14.** `C:\Users\USER\Downloads\CODEX_CONTINUATION_BLOCKERS.md` is dated 2026-07-13 and describes Cloud Run as a placeholder and durable ML jobs as missing; those claims are superseded by the later handoff and current code. Treat live checks as final authority.
5. **Current TypeScript validation is green.** 60 Vitest files / 299 tests pass; root TypeScript, ESLint, and Expo TypeScript pass. Python tests were not runnable locally because `.venv` lacks `pytest` and no system Python is registered; this is an environment gap, not observed test failure. Build/E2E were not rerun in this scout because the lead requested immediate finalization.

## Git and remote state

- Repository: `https://github.com/markjlomoljo-hash/ATV3-APP-BUILD-V.0.git`
- Branch: `codex/railway-ml-worker-recovery`
- HEAD and tracked remote: `893f6f0`, exactly aligned with `origin/codex/railway-ml-worker-recovery` (`0/0` divergence after fetch).
- Relative to refreshed `origin/main` (`86c4808`): current branch is 7 commits ahead and 0 behind.
- Branch-only commits, oldest to newest:
  - `87c10c6` test: reproduce abandoned ML lease recovery failure
  - `f8b4d50` fix: recover abandoned ML worker leases
  - `e0f337f` test: define persistent ML worker runtime contract
  - `b0ef1e8` test: require Railway worker deployment contract
  - `f8b8872` feat: add persistent Railway ML worker runtime
  - `a084728` docs: record Railway worker TDD evidence
  - `893f6f0` fix: preserve Railway always-restart policy
- Branch delta versus main: 10 files, +489/-3. It adds `Dockerfile.worker`, `railway.worker.json`, `scripts/ml-worker.ts`, runtime/tests, and abandoned-lease recovery.
- Uncommitted tracked delta: 29 files, approximately +2,353/-391.
- Untracked delta: 23 files, including consent/deletion routes and services, mobile caches/presentation, Python idempotency recovery tests, route-smoke typing/test, and two forward-only migrations.
- `git diff --check` found no whitespace errors; it emitted CRLF normalization warnings only.

## Uncommitted work that must be preserved and reviewed as separate slices

### ML delivery reconciliation

- `supabase/migrations/20260714143000_ml_delivery_state_reconciliation.sql` adds explicit personal/raw-image processing scopes; reconciles outbox states to `pending|leased|processed|failed_retryable|dead_letter`; adds lease/attempt/payload constraints; narrows RLS/grants.
- `src/lib/acnetrex/ml-analysis-jobs.ts` now snapshots consent and lineage into the queued job and returns durable stable references.
- `src/lib/acnetrex/ml-analysis-worker.ts` has grown to 691 lines and now verifies input ownership, constructs canonical inputs from database records, enforces consent, claims with leases, distinguishes retry/terminal states, transactionally persists result/job/inbox/outbox, and updates Skin Twin snapshots.
- `packages/ml-local-runtime/src/mobile-job-coordinator.ts` now queues before submission, preserves idempotency/request identities, distinguishes terminal submission failures, polls terminal jobs, caches results, and replays offline operations.
- `apps/mobile/src/lib/ml.ts` wires the coordinator to authenticated APIs, encrypted offline storage, pending-job cache, and real `sleep_logs` input extraction.
- `ml-service/acnetrex_ml/service/idempotency.py` and new `test_idempotency_recovery.py` add recovery behavior at the Cloud Run service layer.

### Consent and deletion lifecycle

- New `/api/consents` and `/api/deletions` routes plus `consents.ts`, `deletion-requests.ts`, and `deletion-worker.ts` are present but untracked.
- `supabase/migrations/20260714150000_deletion_delivery_lifecycle.sql` is a large forward-only state/lease/tombstone/audit/RLS migration. It explicitly does not erase data by itself.
- This is materially separate from “make live ANN prediction” and should be reviewed/committed independently unless it is an explicit release gate.

### Research/dependency work

- Research CSV/log files contain new candidates but retain the decisive state: zero production-approved training datasets and zero approved acne weights.
- `package.json` adds dependency overrides for `@babel/core`, `postcss`, `esbuild`, and `js-yaml`; `bun.lock` changes heavily. Keep this security/dependency slice separate from worker semantics.

## Canonical implementation map

| Concern | Canonical implementation | Current truth |
|---|---|---|
| Native product | `apps/mobile` | Expo app; physical-device/EAS proof remains external |
| Local deterministic/offline | `packages/ml-local-runtime` | Deterministic logic, encrypted SQLite queue, identity-preserving replay |
| Mobile ML adapter | `apps/mobile/src/lib/ml.ts` | Uncommitted durable polling/cache integration |
| Authenticated job API | `src/app/api/ml/jobs/route.ts`, `[id]/route.ts` | Supabase-auth owner boundary; DB required before reporting queued |
| Job/outbox persistence | `src/lib/acnetrex/ml-analysis-jobs.ts` | Durable idempotent enqueue and owner-scoped retrieval |
| Worker logic | `src/lib/acnetrex/ml-analysis-worker.ts` | Leased, retry-bounded, canonical-input and result persistence path |
| Persistent worker host | `scripts/ml-worker.ts`, `src/lib/acnetrex/ml-worker-runtime.ts`, `railway.worker.json` | Committed Railway worker path; requires environment configuration/deployment proof |
| Compatibility worker trigger | `src/app/api/internal/ml/worker/route.ts` | Authenticated Vercel/cron invocation of same worker logic |
| Cloud inference | `ml-service/main.py`, `acnetrex_ml/service/app.py` | Deterministic engines and honest abstention; `/predict` is compatibility alias for `/v1/predict` |
| Model registry | `ml-service/manifests/model-registry.json` | No active artifacts; all predictive candidates rejected/untrained |
| Training gate | `ml-service/acnetrex_ml/training/gate.py` | Governance gate only; does not train/promote |
| Data authority | `ml-service/manifests/dataset-manifest.json` | No eligible dataset; V4 pack accepted for non-training only |

## Duplicate or potentially conflicting surfaces

1. **Two worker hosts, one worker implementation:** the Railway process and `/api/internal/ml/worker` both call `processMlAnalysisBatch`. Leases make concurrent consumers conceptually safe, but deployment responsibility must be explicit to avoid operational ambiguity, duplicate cost, and split monitoring. The older blocker document explicitly warned against competing Railway/Vercel/Cloud Run responsibility.
2. **Two Cloud prediction routes:** `/v1/predict` is canonical; `/predict` is a tested compatibility alias. The Next direct prediction route is separately deprecated with 410. Preserve this distinction and do not create another client.
3. **Two idempotency layers are intentional but must stay scoped:** Next/Supabase job idempotency prevents duplicate durable commands; Cloud Run idempotency prevents repeated service execution. They are not interchangeable and should use stable identities/lineage.
4. **Stale documentation conflicts:** the July 13 blocker file and older execution reports still say Cloud Run is a placeholder and durable replay is absent. The July 14 handoff says deterministic Cloud Run and durable inference are production verified. Do not copy stale claims into a new plan; rerun live verification.
5. **`runtime/selector.py` is not the active call path in `_predict_core`.** `_predict_core` directly dispatches deterministic engines and otherwise returns unavailable/queued states. The selector/Vertex adapter are prepared architecture components, not evidence that Vertex inference runs.
6. **Cloud Run has its own `service/jobs.py` SQLite/Postgres job store while the product’s canonical durable orchestration is Next/Supabase.** Current app path uses the latter. Avoid evolving both into competing orchestration authorities.

## Fail-closed, placeholder, mock, and incomplete paths

- No production `TODO`/`FIXME`/stub signal was found in the targeted non-test ML/application search.
- Predictive work deliberately fails closed:
  - `active_models: []`, `active_predictive_models: []`.
  - Forecast engine returns `prediction: None`.
  - Unsupported/heavy work returns `model_unavailable`, `unsupported_offline`, `queued_for_cloud`, or consent-restricted states.
  - Safe-output validation rejects predictive fields from unvalidated deterministic engines.
  - Training gate refuses synthetic/unlicensed/unconsented/unhashed/unsplit data.
- Test files use mocks extensively, as expected; those mocks are not production inference.
- Older docs mention placeholders historically. The rollback Cloud Run revision is intentionally a placeholder/no-ML emergency target per the July 14 handoff.
- Physical iOS/Android build/device validation remains unproven; EAS was not authenticated at handoff.
- Clerk remained unconfigured at handoff (optional for deterministic Supabase-auth ML, relevant if web/admin RBAC is required).
- Vertex endpoint existed but had zero deployed models at handoff. No legitimate evaluated artifact exists in this checkout.

## Test evidence gathered now

- `npm.cmd test -- --run`: **PASS**, 60 files / 299 tests.
- `npm.cmd run typecheck`: **PASS**.
- `npm.cmd run lint`: **PASS**.
- `npm.cmd --prefix apps/mobile run typecheck`: **PASS**.
- Python: **NOT RUN**. `C:\Users\USER\Documents\AcneTrex V3\.venv\Scripts\python.exe -m pytest` reports `No module named pytest`; system `python` and `py` are unavailable. CI remains the authoritative Python 3.11 wall until a correct local environment is provisioned.
- Not rerun in this scout: Next production build, route smoke E2E, coverage, Ruff, container build/scan, live services, migrations, or physical devices.

## Highest-value execution implications

1. Preserve the working tree and capture ownership/scope before any edits. It is not a clean recovery branch anymore.
2. Split/review the uncommitted work into at least: (a) ML delivery reconciliation, (b) mobile cache/presentation, (c) Cloud idempotency recovery, (d) consent/deletion lifecycle, (e) research registers, and (f) dependency overrides.
3. Apply and verify the ML delivery migration before expecting the uncommitted worker code to operate against production; generated Supabase types are already modified in the working tree, but migration application was not proven here.
4. Choose a single operational worker host (Railway persistent worker is the branch’s stated recovery path) and leave the internal route as an explicit fallback/admin trigger only if needed.
5. Do not spend implementation time looking for a hidden ANN/ensemble: none exists. The path to a genuine learned prediction begins with rights-approved patient-level data, governed snapshot/splits, training code beyond the current gate, evaluation/calibration, immutable artifact registration, manual approval, deployment, and end-to-end mobile result proof.
6. In the meantime, the fastest honest live result is the existing deterministic flow; rerun live health/job/persistence/worker checks against the current branch/migrations before claiming it is deployed.

## Measurable repository-side completion signal for learned inference

A learned prediction is not repository-complete until all of the following are evidenced: a nonempty governed dataset manifest; implemented training/evaluation pipeline; patient/temporal leakage-safe split and untouched holdout; calibration/subgroup/OOD evidence; non-rejected registry entry with immutable artifact URI and SHA-256; `active_models` containing the approved version; runtime actually loading/calling it; response lineage naming model/data versions; deterministic abstention on invalid/OOD inputs; passing Python/TypeScript/security/E2E walls; and installed mobile retrieval/display of the persisted result. None of those learned-model activation conditions is currently met.
