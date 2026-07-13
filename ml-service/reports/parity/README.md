# Runtime parity reports

The shared fixture `packages/ml-local-runtime/tests/fixtures/sleep-parity.json` is consumed by both TypeScript and Python tests. It verifies duplicate-date replacement, cross-midnight duration/midpoint, adjacent circular bedtime/wake drift, regularity, full-window sleep debt, sample count, and readiness. On 2026-07-14 the TypeScript deterministic suite passed 6/6 and the Python hybrid-contract suite passed 4/4. Predictive numeric parity is not applicable until an approved artifact exists.
