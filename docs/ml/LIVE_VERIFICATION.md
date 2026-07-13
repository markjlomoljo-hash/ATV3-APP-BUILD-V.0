# Live verification record

Date: 2026-07-14. This file records evidence, not an assertion of deployment.

Local: root TypeScript check passed; Next.js webpack production build passed; focused API/worker/local-runtime tests passed; mobile clean npm install and TypeScript check passed; Python Ruff and six FastAPI tests passed; ten static migration-policy tests passed. Docker, Supabase CLI, and a local PostgreSQL service were unavailable, so container execution and SQL execution are not verified.

Read-only Google Cloud inspection used the existing active account and project without changing configuration. Cloud Run service `mlatv` routes 100% to ready revision `mlatv-00002-4ww`, but its image is `gcr.io/cloudrun/placeholder`; ingress is all and invoker IAM enforcement is disabled. Artifact Registry repository `us-central1/acnetrex-ml` exists. Neither required Secret Manager entry (`acnetrex-ml-shared-secret`, `acnetrex-ml-database-url`) exists.

Vertex endpoint `5976620302904328192` (`acnetrex-endpoint`) exists in `us-central1` but has zero deployed models. Two model resources named `acnetrex-ml-v1` point to the same `ml-engine:latest` custom container; they do not establish a trained, evaluated, approved artifact and must not be treated as valid predictive models. No controlled Vertex prediction was possible. The Vercel health endpoint was previously observed degraded. No deployment, migration apply, push, EAS build, or live mutation has been performed in this worktree.

Production verification must capture timestamp, URL/resource name (without secrets), revision, image digest, root/live/ready results, authenticated prediction and replay/conflict tests, unauthenticated rejection, queue/result persistence, cross-user denial, private-object denial, Vertex prediction or exact blocker, rollback target, and iOS/Android build/device evidence.
