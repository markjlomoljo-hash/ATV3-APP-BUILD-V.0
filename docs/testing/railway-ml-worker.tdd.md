# Railway ML worker TDD evidence

## Source and journey

This work was derived from the live continuation audit rather than a separate plan file.

As an AcneTrex user, I need a queued ML analysis to survive a worker crash and be processed by a continuously running worker, so that the durable job can eventually produce one stable result.

## RED and GREEN evidence

| Behavior | RED evidence | GREEN evidence | Test type |
|---|---|---|---|
| An expired processing lease can be reclaimed after a worker crashes | `npm test -- src/lib/acnetrex/ml-analysis-worker.test.ts` failed because the claim required `j.status = 'queued'` | Same command passed 8/8 after matching expired `processing` outbox and job state | unit/SQL contract |
| Persistent runtime rejects missing server configuration without exposing values | `npm test -- src/lib/acnetrex/ml-worker-runtime.test.ts` failed because the runtime module did not exist | Runtime contract suite passed | unit/security |
| Runtime recovers after a failed database-backed cycle and separates liveness from readiness | Compile-time RED from the missing runtime module | Runtime contract suite passed | unit/reliability |
| Railway uses a pinned non-root worker image and `/health/ready` | Runtime suite failed with `ENOENT` for `railway.worker.json` | Runtime suite passed after adding the service-specific deployment contract | configuration contract |

Final focused command:

```text
npm test -- src/lib/acnetrex/ml-worker-runtime.test.ts src/lib/acnetrex/ml-analysis-worker.test.ts
Test Files 2 passed (2)
Tests 13 passed (13)
```

Additional validation:

```text
npm run typecheck
PASS

npm exec -- eslint scripts/ml-worker.ts src/lib/acnetrex/ml-worker-runtime.ts src/lib/acnetrex/ml-worker-runtime.test.ts src/lib/acnetrex/ml-analysis-worker.ts src/lib/acnetrex/ml-analysis-worker.test.ts
PASS
```

## Guarantees and remaining gaps

The tests guarantee bounded runtime configuration, privacy-safe cycle errors, readiness only after a successful database-backed batch, graceful loop termination, and reclaim eligibility for an expired processing lease. Railway build, deployment, service variables, live readiness, graceful SIGTERM behavior, and an authenticated end-to-end job still require deployment evidence. The tests do not yet prove `consumer_inbox` deduplication, administrative dead-letter replay, or mobile result delivery.

Checkpoint commits:

- `87c10c6` — abandoned-lease RED
- `f8b4d50` — abandoned-lease GREEN
- `e0f337f` — persistent-runtime RED
- `b0ef1e8` — deployment-contract RED
- `f8b8872` — persistent-runtime and deployment-contract GREEN
