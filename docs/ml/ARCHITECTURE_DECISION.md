# Hybrid ML architecture decision

Status: implemented software foundation; not production verified.

AcneTrex uses one versioned inference contract across the Expo app, Next.js API, worker, and `acnetrex-ml` FastAPI service. The Supabase Auth UUID is the canonical subject. Clients create consent-bound jobs through `/api/ml/jobs`; the server claims the outbox job and calls `/v1/predict`. The deprecated direct proxy returns 410. Clients never call Vertex AI.

The runtime order is: local deterministic engine when supported; durable cloud job for heavy or unavailable work; explicit `model_unavailable`, `insufficient_data`, `unsupported_offline`, or `consent_restricted` otherwise. There is no silent heuristic-to-model substitution. Cloud Run hosts deterministic engines and is the only prospective Vertex caller. Vertex remains unverified and no approved predictive model exists.

Boundaries: Expo owns encrypted device state and sync intent; Next.js owns user authentication, authorization, job creation, and persistence; Supabase owns governed records and private objects; Cloud Run owns deterministic execution; Vertex may own approved heavyweight artifacts later.

