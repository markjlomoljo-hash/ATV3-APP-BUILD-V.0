import type { PoolClient } from "pg";
import { describe, expect, it, vi } from "vitest";
import { extractExplicitMemoryFacts, persistExtractedMemoryFacts } from "./memory-extraction";

const userId = "00000000-0000-0000-0000-000000000001";
const messageId = "22222222-2222-4222-8222-222222222222";

describe("CutisAI explicit memory fact extraction", () => {
  it("extracts only facts the user explicitly stated", () => {
    expect(extractExplicitMemoryFacts("My skin type is oily and it bothers me")).toEqual([
      { factKey: "stated_skin_type", value: "oily", statement: "My skin type is oily" },
    ]);
    expect(extractExplicitMemoryFacts("I am allergic to benzoyl peroxide.")).toEqual([
      { factKey: "stated_allergy", value: "benzoyl peroxide", statement: "I am allergic to benzoyl peroxide" },
    ]);
    expect(extractExplicitMemoryFacts("my sleep goal is 8 hours")).toEqual([
      { factKey: "stated_sleep_goal_hours", value: "8", statement: "my sleep goal is 8 hours" },
    ]);
    expect(extractExplicitMemoryFacts("I think dairy triggers my breakouts")).toEqual([
      { factKey: "stated_trigger_suspicion", value: "dairy", statement: "I think dairy triggers my breakouts" },
    ]);
  });

  it("extracts multiple facts from one message, at most one per fact key", () => {
    const facts = extractExplicitMemoryFacts("My skin is dry. I'm allergic to adapalene.");
    expect(facts.map((fact) => fact.factKey).sort()).toEqual(["stated_allergy", "stated_skin_type"]);
  });

  it("never infers facts from non-explicit language", () => {
    expect(extractExplicitMemoryFacts("my skin looks oily today")).toEqual([]);
    expect(extractExplicitMemoryFacts("could dairy be a trigger?")).toEqual([]);
    expect(extractExplicitMemoryFacts("people with oily skin often struggle")).toEqual([]);
    expect(extractExplicitMemoryFacts("what is my streak?")).toEqual([]);
    expect(extractExplicitMemoryFacts("")).toEqual([]);
  });

  it("rejects out-of-range sleep goals instead of storing junk", () => {
    expect(extractExplicitMemoryFacts("my sleep goal is 0 hours")).toEqual([]);
    expect(extractExplicitMemoryFacts("my sleep goal is 99 hours")).toEqual([]);
  });

  it("persists provenance events and upserts the current fact row", async () => {
    const eventId = "33333333-3333-4333-8333-333333333333";
    const factId = "44444444-4444-4444-8444-444444444444";
    const query = vi
      .fn()
      .mockResolvedValueOnce({ rows: [{ id: eventId }] })
      .mockResolvedValueOnce({ rows: [{ id: factId }] });
    const client = { query } as unknown as PoolClient;

    const persisted = await persistExtractedMemoryFacts(client, {
      userId,
      sourceMessageId: messageId,
      facts: [{ factKey: "stated_skin_type", value: "oily", statement: "My skin type is oily" }],
    });

    expect(persisted).toEqual([
      { factKey: "stated_skin_type", value: "oily", statement: "My skin type is oily", eventId, factId },
    ]);
    const [eventSql, eventParams] = query.mock.calls[0];
    expect(String(eventSql)).toContain("insert into public.user_memory_events");
    expect(eventParams).toEqual([
      userId,
      messageId,
      "My skin type is oily",
      JSON.stringify({ factKey: "stated_skin_type", value: "oily" }),
    ]);
    const [factSql, factParams] = query.mock.calls[1];
    expect(String(factSql)).toContain("insert into public.user_memory_facts");
    expect(String(factSql)).toContain("on conflict (user_id, fact_key) where deleted_at is null");
    expect(factParams).toEqual([userId, "stated_skin_type", JSON.stringify("oily"), eventId]);
  });

  it("persists nothing when no explicit facts were extracted", async () => {
    const query = vi.fn();
    const client = { query } as unknown as PoolClient;
    const persisted = await persistExtractedMemoryFacts(client, {
      userId,
      sourceMessageId: messageId,
      facts: [],
    });
    expect(persisted).toEqual([]);
    expect(query).not.toHaveBeenCalled();
  });
});
