# Railway ML cutover gap-closure TDD evidence

Source: `CODEX_MASTER_RAILWAY_ML_PRODUCTION_EXECUTION_PROMPT.md` and the production completion audit on 2026-07-15.

## User journeys

- As an authenticated mobile user, my durable ML work resumes after login, foreground, or network reconnection without opening a developer screen.
- As the dispatch worker, I can exhaust retries without writing Railway-owned job state or leaving a mobile poll pending forever.
- As the Railway inference service, I reject any disagreement among the stored job UUID, stored request/idempotency identity, headers, payload, and response lineage.
- As a FaceAtlas user, quality and annotation summaries use owner-scoped stored records rather than client-forged metadata.

## RED/GREEN evidence

| Guarantee | RED evidence | GREEN evidence |
| --- | --- | --- |
| App-wide lifecycle recovery coalesces overlapping signals and retries later after failure | Missing module caused focused Vitest import failure | `npm test -- src/lib/acnetrex/mobile-ml-recovery-lifecycle.test.ts`: 3 passed; mobile typecheck passed |
| Railway owns bounded retry-exhaustion terminalization | Three worker tests failed; FastAPI route returned 404; repository method was absent | Worker slice: 49 passed; endpoint/repository tests: 2 passed; focused lines 85.43% |
| Stored identity and Zod/Pydantic/JSON Schema constraints are aligned | Python parity/identity slice: 4 failed; TypeScript parity: 2 failed | Python parity/identity: 4 passed; TypeScript parity: 2 passed; schema hashes verified |
| FaceAtlas ignores client quality metadata and loads owner-scoped annotations | Focused Python run: 2 failed | Focused Python run: 2 passed |
| Enqueue stores the job UUID as both request and inference-idempotency identity | Live Railway returned `stored_job_idempotency_key_mismatch`; focused Vitest failed | Focused job/worker suite: 67 passed; live Railway and Vercel flows returned `insufficient_data` with exact identity binding |
| Fail-closed RBAC downgrade retains `default_user` provenance | Full Vitest had one failing RBAC expectation | Focused RBAC run: 18 passed |

## Final regression

- `npm test`: 62 files, 317 tests passed.
- `.venv/Scripts/python.exe -m pytest ml-service/tests -q`: 65 passed; one upstream Starlette deprecation warning.
- Root and mobile TypeScript typechecks passed.
- Ruff passed.
- Mobile `npm audit`: zero findings. Root audit has seven moderate development/transitive findings; available forced fixes are breaking downgrades, with no high or critical finding.
- Tracked secret-pattern scan: zero matches.

## Commit checkpoints

- `47093f6` — lifecycle RED reproducer.
- `bdb1f6f` — lifecycle GREEN implementation.
- `8ebcfb8` — integrated Railway ownership, contract parity, and FaceAtlas GREEN implementation.
- `78b2467` — live-discovered stored identity RED reproducer.
- `acfc60c` — stored identity GREEN fix.

## Known external gaps

Physical iOS/Android device validation and iOS signing/export-compliance require owner/device access. Learned inference remains unavailable until a licensed, de-identified, expert-labeled dataset and independently evaluated artifact pass registry approval; synthetic or metadata-only research inputs are not eligible.
