import { describe, expect, it } from "vitest";
import { resolveCutisAiProvider } from "./provider";

describe("CutisAI provider resolution", () => {
  it("selects the deterministic tier when CUTISAI_LLM_PROVIDER is unset", async () => {
    const resolution = await resolveCutisAiProvider({});
    expect(resolution.ok).toBe(true);
    if (resolution.ok) {
      expect(resolution.provider.id).toBe("deterministic");
      expect(resolution.provider.runtimeMode).toBe("deterministic_local");
    }
  });

  it("selects the deterministic tier when explicitly requested", async () => {
    const resolution = await resolveCutisAiProvider({ CUTISAI_LLM_PROVIDER: "deterministic" });
    expect(resolution.ok).toBe(true);
  });

  it("fails closed for any LLM provider that is not configured in this deployment", async () => {
    const resolution = await resolveCutisAiProvider({ CUTISAI_LLM_PROVIDER: "external-llm" });
    expect(resolution).toEqual({
      ok: false,
      error: "llm_provider_not_configured",
      requested: "external-llm",
    });
  });
});
