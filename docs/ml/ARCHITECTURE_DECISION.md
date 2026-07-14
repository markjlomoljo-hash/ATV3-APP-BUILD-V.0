# Hybrid ML architecture decision

Status: software foundation and deterministic cloud integration deployed and production verified on 2026-07-14; predictive-model and physical-mobile validation remain blocked as documented in `LIVE_VERIFICATION.md`.

AcneTrex uses one versioned inference contract across the Expo app, Next.js API, worker, and `acnetrex-ml` FastAPI service. The Supabase Auth UUID is the canonical subject. Clients create consent-bound jobs through `/api/ml/jobs`; the server claims the outbox job and calls `/v1/predict`. The deprecated direct proxy returns 410. Clients never call Vertex AI.

The runtime order is: local deterministic engine when supported; durable cloud job for heavy or unavailable work; explicit `model_unavailable`, `insufficient_data`, `unsupported_offline`, or `consent_restricted` otherwise. There is no silent heuristic-to-model substitution. Cloud Run hosts deterministic engines and is the only prospective Vertex caller. The Vertex endpoint and runtime IAM are verified, but the endpoint has zero deployed models because no approved predictive artifact exists.

Boundaries: Expo owns encrypted device state and sync intent; Next.js owns user authentication, authorization, job creation, and persistence; Supabase owns governed records and private objects; Cloud Run owns deterministic execution; Vertex may own approved heavyweight artifacts later.
