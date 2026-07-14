# ADR-001: Native mobile is the AcneTrex product authority

- Status: Accepted
- Date: 2026-07-11
- Decision owner: Mark Joseph Lomoljo

## Context

AcneTrex V3 must ship as a native, mobile-first application for both iOS and
Android. The repository currently contains a Next.js deployment surface and a
recovered Expo React Native application. Treating the web surface as the main
product would contradict the PRD's device, privacy, offline, camera, secure
storage, notification, and one-handed interaction requirements.

## Decision

The canonical product architecture is:

```text
apps/mobile (Expo React Native + TypeScript)
  -> typed HTTPS API client
  -> backend (FastAPI)
  -> Supabase Auth/Postgres/pgvector/private Storage
  -> workers and Cloud Run ML API
  -> Vertex AI

apps/web (secondary compatibility/admin/operational surface)
packages/shared (Zod contracts, readiness states, non-sensitive domain logic)
```

The existing root Next.js app remains a temporary secondary compatibility and
operational-health surface. It must not determine navigation, persistence,
authentication, camera behavior, offline behavior, or native UX.

## Mobile constraints

- Expo Router with typed routes and mandatory auth/onboarding/consent gates.
- Supabase Auth tokens stored with Expo SecureStore, never AsyncStorage or web
  storage.
- TanStack Query for server state; Zustand only for non-sensitive UI state.
- SQLite-backed offline mutation queue with idempotency keys and explicit sync
  state.
- `expo-camera`, `expo-image-manipulator`, and `expo-file-system` for FaceAtlas.
- `expo-notifications` and `expo-location` behind education and permission gates.
- No database password, service-role key, Vertex credential, or ML shared secret
  in a mobile bundle.
- Mobile calls the FastAPI application boundary; it never calls Vertex directly.
- Raw images use private storage paths beginning with the authenticated user ID.

## Backend boundaries

- Supabase Auth UUID is the canonical `user_id`.
- FastAPI validates with Pydantic, derives ownership from the verified session,
  and never trusts a client-supplied owner.
- Supabase RLS remains defense in depth even when server code performs writes.
- Cloud Run `/predict` requires server-only authentication and returns real
  Vertex results or an explicit unavailable state.
- Derived intelligence, gamification credit, report jobs, and ML lineage are
  server-written; clients cannot manufacture them.

## Transition plan

1. Stabilize and merge the current compatibility branch to `dev`.
2. Create `feat/mobile-native-foundation` from `dev`.
3. Import the recovered Expo UI into `apps/mobile` while removing embedded
   Express/tRPC/MySQL/Manus backend coupling.
4. Extract shared Zod/readiness contracts into `packages/shared`.
5. Add `backend/` FastAPI modules around the verified Supabase schema.
6. Keep `apps/web` secondary and promote through `dev -> staging -> main` only
   after mobile and API gates pass.

## Consequences

- The current web route coverage is useful compatibility evidence, not proof of
  mobile completion.
- Physical iOS and Android validation, EAS builds, camera permissions, offline
  recovery, deep links, and notifications are release gates.
- The recovered mobile source is a visual/behavioral foundation, not authority
  for its obsolete MySQL/tRPC/Manus service coupling.
