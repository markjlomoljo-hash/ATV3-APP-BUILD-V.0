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

## Validation evidence

- `npm test`: 44 files, 216 tests passed.
- `npm run test:coverage -- --reporter=dot`: 81.62% statements, 84.46% functions, 86.7% lines; branch coverage is 68.19%.
- `npm run typecheck`, `npm run lint`, and `npm run build -- --webpack`: passed.
- `npm run test:e2e`: 66 route smoke checks passed.
- Python Ruff check/format and pytest: 21 tests passed.
- Mobile clean `npm ci` and `npm run typecheck`: passed.
- Mobile Expo config/native build-tool API check passed; production npm audit reports zero vulnerabilities after the pinned `uuid@11.1.1` override.

Known gaps: branch coverage is below 80%; no Docker runtime/scanner, local PostgreSQL/Supabase CLI execution, EAS builds, or physical devices were available. Live push, migration, secrets, Cloud Run deployment, and device testing require external authorization/resources.
