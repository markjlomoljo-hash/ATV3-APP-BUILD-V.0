# Hybrid ML architecture decision

Status: software foundation and deterministic cloud integration deployed and production verified on 2026-07-14; predictive-model and physical-mobile validation remain blocked as documented in `LIVE_VERIFICATION.md`.

AcneTrex uses one versioned inference contract across the Expo app, Next.js API, worker, and `acnetrex-ml` FastAPI service. The Supabase Auth UUID is the canonical subject. Clients create consent-bound jobs through `/api/ml/jobs`; the server claims the outbox job and calls `/v1/predict`. The deprecated direct proxy returns 410. Clients never call Vertex AI.

The runtime order is: local deterministic engine when supported; durable cloud job for heavy or unavailable work; explicit `model_unavailable`, `insufficient_data`, `unsupported_offline`, or `consent_restricted` otherwise. There is no silent heuristic-to-model substitution. Cloud Run hosts deterministic engines and is the only prospective Vertex caller. The Vertex endpoint and runtime IAM are verified, but the endpoint has zero deployed models because no approved predictive artifact exists.

Boundaries: Expo owns encrypted device state and sync intent; Next.js owns user authentication, authorization, job creation, and persistence; Supabase owns governed records and private objects; Cloud Run owns deterministic execution; Vertex may own approved heavyweight artifacts later.

## Predictive-path decision (2026-07-26)

The 2026-07-26 resource pass (see `docs/ml-research/`) fixed two candidate paths for the first predictive model. Neither changes production behavior today: `active_models` stays empty and the training gate stays authoritative.

- Path A (recommended, the only production-eligible path): `google/derm-foundation` frozen embeddings (BiT-M ResNet101x3, 6144-dim output; gated Hugging Face repo under HAI-DEF commercial-with-conditions terms, currently `needs_legal_review`) feeding a scikit-learn `CalibratedClassifierCV` head (BSD-3, accepted) trained on a rights-cleared dataset — a signed ACNE04 commercial licence or the DermNet paid dataset licence plus DPA. Nothing on this path may download weights, train, or promote until counsel approves the HAI-DEF conditions, a dataset licence is signed, and `acnetrex_ml.training.gate` accepts a governed manifest.
- Path B (interim, research-only, non-shippable): a torchvision MobileNetV3-Small or EfficientNet-B0 architecture instantiated with `weights=None` and trained on ACNE04 strictly under its academic terms. Its outputs are baseline references for internal comparison only; they must never enter `manifests/model-registry.json`, Vertex, or any user-facing surface, and no metric from this path may be presented as product performance.

The `acnetrex_ml/pipeline` package (being built in the same wave as this decision) implements the scaffold for both paths under a fixed contract: every run consumes a licence-gated dataset/backbone manifest; only clearly-labelled synthetic demo data can execute end to end today; runs write nothing to `manifests/model-registry.json` active models; and the production path remains blocked by the training gate, which continues to exit `training_blocked/no_approved_training_dataset`. Pipeline-only heavy dependencies are declared in `ml-service/requirements-pipeline.txt` behind graceful import guards, so the serving `requirements.txt` and the running service are unchanged. The gated backbone is fetched only with an owner-supplied `HF_TOKEN` environment variable; no token is stored in the repository.
