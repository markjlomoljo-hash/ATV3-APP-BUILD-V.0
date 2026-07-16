# Phase 1 Production Blockers — TDD Evidence

Date: 2026-07-16 (Asia/Manila)

## Scope

- Export Clerk public/private metadata types and use the real Clerk environment contract.
- Split public and authenticated health diagnostics.
- Align the ML worker restart policy contract with Railway (`ON_FAILURE`, 10 retries).
- Standardize Drizzle primary keys as generated UUIDs and declare explicit foreign keys.
- Enforce exact-origin API CORS with a deny-by-default allowlist.
- Remove hardcoded Supabase project URLs from the environment template.
- Add the missing SCIN split/consent governance schema without inventing approval evidence.

## RED evidence

Focused tests failed before implementation for:

- missing CORS module;
- secret-presence flags in the public health response;
- absent authenticated internal health route;
- missing/hardcoded environment contracts;
- mismatched restart policy;
- missing UUID and foreign-key metadata;
- missing SCIN governance migration.

The SCIN governance contract specifically rejects migrations that insert approval rows or assert `approved`, `verified`, or `passed` review outcomes.

## GREEN evidence

Commands executed from the target branch worktree:

```text
npm.cmd run typecheck
PASS

npm.cmd run test
65 test files passed
328 tests passed

npm.cmd run lint
0 errors
1 warning in an untracked skill template outside application code

next.cmd build --webpack
PASS — optimized production build and route generation completed
```

The normal Turbopack command cannot run from this temporary Codex worktree because its shared `node_modules` junction points outside the worktree root. Webpack proves the production application code compiles; the final branch checkout must repeat the normal build with its local dependency tree.

## Live Supabase verification

Project: `alobmstvqutteypusmuo`

Applied migration: `scin_governance_schema`

Verified state after application:

| Table | RLS | Rows |
|---|---:|---:|
| `ml_dataset_versions` | enabled | 0 |
| `split_manifest` | enabled | 0 |
| `consent_review` | enabled | 0 |

`split_manifest` and `consent_review` each expose one `ALL` policy to `service_role` only. Both remain empty until an authorized human review supplies evidence.

## Dependency security note

`npm audit --package-lock-only --omit=dev` reports three moderate advisories through Next.js 16.2.6's pinned PostCSS 8.4.31. The latest stable Next.js release still pins that version; the first available override-free resolution observed was a Next.js canary. A production canary was not introduced.
