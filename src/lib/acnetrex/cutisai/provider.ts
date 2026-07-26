// AcneTrex V3 — CutisAI response provider contract.
//
// The generation worker talks to a provider through this interface only. In
// this deployment no LLM API key exists, so the only real provider is the
// deterministic evidence-grounded responder. A future LLM tier slots in
// behind the same contract by adding a provider id here and setting
// CUTISAI_LLM_PROVIDER; until such a provider actually exists, any non-empty
// CUTISAI_LLM_PROVIDER value resolves to an honest
// llm_provider_not_configured failure — never a fabricated "AI".
import type { PoolClient } from "pg";
import type { CutisAiIntentId } from "./intents";
import type { CutisAiEvidenceRef } from "./evidence";

export type CutisAiEvidenceStatus =
  | "grounded"
  | "curated_content"
  | "insufficient_data"
  | "outside_evidence_base";

export type CutisAiReply = {
  intentId: CutisAiIntentId;
  content: string;
  evidenceRefs: CutisAiEvidenceRef[];
  evidenceStatus: CutisAiEvidenceStatus;
  /** Ids of user_memory_facts rows cited by the reply (for retrieval logs). */
  retrievedMemoryFactIds: string[];
  runtimeMode: string;
  modelName: string;
  modelVersion: string;
};

export type CutisAiGenerationInput = {
  client: PoolClient;
  userId: string;
  message: string;
};

export type CutisAiGenerationResult =
  | { status: "generated"; reply: CutisAiReply }
  | { status: "model_unavailable"; reason: string };

export interface CutisAiResponseProvider {
  readonly id: string;
  readonly runtimeMode: string;
  generate(input: CutisAiGenerationInput): Promise<CutisAiGenerationResult>;
}

export type CutisAiProviderResolution =
  | { ok: true; provider: CutisAiResponseProvider }
  | { ok: false; error: "llm_provider_not_configured"; requested: string };

export const DETERMINISTIC_PROVIDER_ID = "deterministic";

/**
 * Env-gated provider activation. CUTISAI_LLM_PROVIDER unset (or explicitly
 * "deterministic") selects the deterministic tier. Any other value is a
 * request for an LLM tier that is not configured in this deployment, so
 * resolution fails closed instead of silently downgrading or fabricating.
 */
export async function resolveCutisAiProvider(
  env: Record<string, string | undefined> = process.env,
): Promise<CutisAiProviderResolution> {
  const requested = env.CUTISAI_LLM_PROVIDER?.trim() ?? "";
  if (requested === "" || requested === DETERMINISTIC_PROVIDER_ID) {
    const { deterministicCutisAiProvider } = await import("./responder");
    return { ok: true, provider: deterministicCutisAiProvider };
  }
  return { ok: false, error: "llm_provider_not_configured", requested };
}
