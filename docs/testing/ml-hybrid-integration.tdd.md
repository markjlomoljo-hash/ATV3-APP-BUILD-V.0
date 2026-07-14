# Hybrid ML integration TDD evidence

Source: the controlling ML execution objective and supplied foundation, not a separate plan file.

## Journeys

- A mobile user receives the same deterministic sleep semantics locally and from Cloud Run.
- An operator sees readiness fail closed when artifacts or persistence are invalid.
- A user never receives fabricated predictive fields from a deterministic engine.
- A retried mobile job keeps one canonical identity, consent, request, and idempotency contract.

## RED/GREEN checkpoints

| Guarantee | RED commit/evidence | GREEN commit/evidence | Test |
|---|---|---|---|
| Next route modules satisfy the production compiler | `c4c9c2e` | `0f68bb1` | root TypeScript and Next build |
| Cloud and shared responses expose readiness explicitly | `717c48e` | `3fe02fe` | shared contract tests |
| Worker sends the canonical consent-bound durable request | `c6e7a67` | `2821cce` | worker/job tests |
| Legacy upstream responses and direct proxy cannot compete | `99fa61a`, `a2a4414` | `511b39c` | worker and `/api/ml/predict` tests |
| ML governance and private artifacts are server-only | `dfcdb10` | `c27c2ab` | migration contract tests |
| Readiness fails on checksum mismatch | `ec58a9e` (200 instead of 503) | `be1dd42` | `test_readiness_fails_closed_on_artifact_checksum_mismatch` |
| Readiness probes both durable stores | `f3d5030` (unsupported injection/no probe) | `9c22668` | `test_readiness_fails_closed_when_persistence_probe_fails` |
| Python and TypeScript sleep features match | `a04b7e7` (missing/different parity fields) | `ab04eb5` | shared `sleep-parity.json` fixture in both suites |
| Deterministic engines reject predictive fabrication | `60d52fd` (five forbidden fields accepted) | `2f5ea37` | `test_safety_contract.py` |
| Training cannot start without an approved immutable snapshot | `47603b2` (training module absent) | `2952750` | `test_training_gate.py` and blocked CLI run |
| Service compatibility jobs complete/replay instead of remaining queued | `3e05324` | `a9dbc02` | completed job create/get/replay integration test |
| Service job timeouts persist a retryable terminal state | `41cac3f` (500 and queued row) | `8457a79` | timeout create/get integration test |
| Expo submits or durably queues the same ML job identity | `5443037` (coordinator module missing) | `59b6d8c`, clean-CI portability `832ac1b` | `mobile-ml-coordinator.test.ts` (2 tests) and mobile typecheck |

## Validation evidence

- `npm test`: 44 files, 216 tests passed.
- `npm run test:coverage -- --reporter=dot`: 81.62% statements, 84.46% functions, 86.7% lines; branch coverage is 68.19%.
- `npm run typecheck`, `npm run lint`, and `npm run build -- --webpack`: passed.
- `npm run test:e2e`: 66 route smoke checks passed.
- Python Ruff check/format and pytest: 21 tests passed.
- Mobile clean `npm ci` and `npm run typecheck`: passed.
- Mobile Expo config/native build-tool API check passed; production npm audit reports zero vulnerabilities after the pinned `uuid@11.1.1` override.
- GitHub Actions push and pull-request CI for `92c57bc` passed the deployed app, mobile, and ML-service wall. After native job integration, the local app suite passed 49 Vitest files/238 tests plus root/mobile TypeScript and ESLint; final remote CI is recorded in `LIVE_VERIFICATION.md` after push.
- Artifact Analysis completed successfully for the promoted image digest with 0 critical findings; Cloud Run root/live/ready/auth/predict/replay/conflict/durable-job/timeout and rollback checks passed.
- Supabase live assertions passed for RLS, anonymous/write grants, private Storage, and public security-definer execution; Vercel production health reports database/schema/Cloud Run/worker ready.
- Expo coordinator focused test: 2/2 passed; online work uses `/api/ml/jobs`, while offline work retains the original operation, request, idempotency key, and validated payload in encrypted SQLite.

Known gaps: branch coverage is below 80%. EAS is not authenticated, so signed iOS/Android builds and physical-device SecureStore/SQLCipher, camera, lifecycle, offline replay, battery, thermal, memory, and performance checks remain owner-dependent. Clerk credentials and owner bootstrap are also unconfigured. Vertex has no deployed model because no legitimate approved training dataset/artifact exists; deterministic inference remains live and predictive tasks abstain honestly.
