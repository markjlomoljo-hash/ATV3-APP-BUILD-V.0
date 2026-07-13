# Live verification record

Date: 2026-07-14. This file records evidence, not an assertion of deployment.

Local: root TypeScript check passed; Next.js webpack production build passed; focused API/worker/local-runtime tests passed; mobile clean npm install and TypeScript check passed; Python Ruff and six FastAPI tests passed; ten static migration-policy tests passed. Docker, Supabase CLI, and a local PostgreSQL service were unavailable, so container execution and SQL execution are not verified.

Previously observed live state: the Cloud Run root served a placeholder rather than `acnetrex-ml`; the Vercel health endpoint was degraded. Vertex endpoint/model/IAM prediction was not verified. No deployment, migration apply, push, EAS build, or live mutation has been performed in this worktree.

Production verification must capture timestamp, URL/resource name (without secrets), revision, image digest, root/live/ready results, authenticated prediction and replay/conflict tests, unauthenticated rejection, queue/result persistence, cross-user denial, private-object denial, Vertex prediction or exact blocker, rollback target, and iOS/Android build/device evidence.

