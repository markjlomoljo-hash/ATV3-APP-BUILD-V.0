import type { PoolClient } from "pg";
import { describe, expect, it, vi } from "vitest";
import {
  CUTISAI_CAPABILITY_STATEMENT,
  CUTISAI_REFUSAL_MESSAGE,
  deterministicCutisAiProvider,
} from "./responder";

const userId = "00000000-0000-0000-0000-000000000001";

type Handler = { match: string; rows: unknown[] };

function fixtureClient(handlers: Handler[]) {
  const query = vi.fn(async (sql: string) => {
    const handler = handlers.find((candidate) => sql.includes(candidate.match));
    return { rows: handler?.rows ?? [] };
  });
  return { client: { query } as unknown as PoolClient, query };
}

async function generate(client: PoolClient, message: string) {
  const result = await deterministicCutisAiProvider.generate({ client, userId, message });
  expect(result.status).toBe("generated");
  if (result.status !== "generated") throw new Error("unreachable");
  return result.reply;
}

describe("CutisAI deterministic responder", () => {
  it("grounds a sleep summary in the exact fixture rows and cites nothing else", async () => {
    const { client } = fixtureClient([
      { match: "count(*)::text as count from public.sleep_logs", rows: [{ count: "3" }] },
      {
        match: 'from public.sleep_logs',
        rows: [
          { id: "sleep-row-1", logDate: "2026-07-20", quality: 4, sleepTime: null, wakeTime: null },
          { id: "sleep-row-2", logDate: "2026-07-19", quality: null, sleepTime: null, wakeTime: null },
        ],
      },
    ]);

    const reply = await generate(client, "how has my sleep been lately?");

    expect(reply.intentId).toBe("sleep_summary");
    expect(reply.evidenceStatus).toBe("grounded");
    expect(reply.evidenceRefs).toEqual([
      { source: "user_record", table: "sleep_logs", id: "sleep-row-1", summary: "sleep log 2026-07-20" },
      { source: "user_record", table: "sleep_logs", id: "sleep-row-2", summary: "sleep log 2026-07-19" },
    ]);
    expect(reply.content).toContain("3 saved sleep log(s)");
    expect(reply.content).toContain("2026-07-20");
    expect(reply.content).toContain("quality 4");
    expect(reply.content).toContain("no quality rating");
    expect(reply.content).toContain(CUTISAI_CAPABILITY_STATEMENT);
  });

  it("reports an honest insufficient_data state when no rows exist", async () => {
    const { client } = fixtureClient([
      { match: "count(*)::text as count from public.sleep_logs", rows: [{ count: "0" }] },
    ]);
    const reply = await generate(client, "tell me how I slept");
    expect(reply.evidenceStatus).toBe("insufficient_data");
    expect(reply.evidenceRefs).toEqual([]);
    expect(reply.content).toContain("no saved sleep logs");
    expect(reply.content).toContain(CUTISAI_CAPABILITY_STATEMENT);
  });

  it("refuses questions outside the evidence base without touching the database", async () => {
    const { client, query } = fixtureClient([]);
    const reply = await generate(client, "which stocks should I buy tomorrow?");
    expect(reply.intentId).toBe("outside_evidence_base");
    expect(reply.evidenceStatus).toBe("outside_evidence_base");
    expect(reply.evidenceRefs).toEqual([]);
    expect(reply.content).toContain(CUTISAI_REFUSAL_MESSAGE);
    expect(query).not.toHaveBeenCalled();
  });

  it("answers module questions from curated registry content only", async () => {
    const { client, query } = fixtureClient([]);
    const reply = await generate(client, "what is SleepDerm?");
    expect(reply.intentId).toBe("module_explanation");
    expect(reply.evidenceStatus).toBe("curated_content");
    expect(reply.evidenceRefs).toEqual([
      {
        source: "curated_content",
        table: "module_registry",
        id: "sleepderm",
        summary: "curated module reference: SleepDerm",
      },
    ]);
    expect(reply.content).toContain("SleepDerm");
    expect(query).not.toHaveBeenCalled();
  });

  it("reports streak state only from the persisted gamification row and badges", async () => {
    const { client } = fixtureClient([
      {
        match: "from public.gamification",
        rows: [
          {
            id: "gami-row-1",
            currentStreak: 4,
            longestStreak: 9,
            points: 120,
            rank: "bronze",
            petStage: "sprout",
            petXp: 40,
            lastActionAt: "2026-07-25T00:00:00Z",
          },
        ],
      },
      {
        match: "from public.user_badges",
        rows: [{ id: "badge-row-1", code: "first_task", earnedAt: "2026-07-01T00:00:00Z" }],
      },
    ]);

    const reply = await generate(client, "what's my current streak?");

    expect(reply.evidenceStatus).toBe("grounded");
    expect(reply.content).toContain("current streak 4 day(s)");
    expect(reply.content).toContain("longest streak 9 day(s)");
    expect(reply.content).toContain("first_task");
    expect(reply.evidenceRefs.map((ref) => `${ref.table}:${ref.id}`)).toEqual([
      "gamification:gami-row-1",
      "user_badges:badge-row-1",
    ]);
  });

  it("recalls only explicitly stated memory facts and exposes their ids for retrieval logs", async () => {
    const { client } = fixtureClient([
      {
        match: "from public.user_memory_facts",
        rows: [
          {
            id: "11111111-1111-4111-8111-111111111111",
            factKey: "stated_skin_type",
            factValue: "oily",
            updatedAt: "2026-07-20T00:00:00Z",
          },
        ],
      },
    ]);
    const reply = await generate(client, "what do you remember about me?");
    expect(reply.intentId).toBe("memory_recall");
    expect(reply.retrievedMemoryFactIds).toEqual(["11111111-1111-4111-8111-111111111111"]);
    expect(reply.content).toContain('stated_skin_type: "oily"');
    expect(reply.evidenceRefs).toEqual([
      {
        source: "user_record",
        table: "user_memory_facts",
        id: "11111111-1111-4111-8111-111111111111",
        summary: "stated fact stated_skin_type",
      },
    ]);
  });

  it("always attaches the capability statement and never fabricates when a lookup is empty", async () => {
    const { client } = fixtureClient([]);
    for (const message of ["any triggers?", "what does my forecast say", "list my scans"]) {
      const reply = await generate(client, message);
      expect(reply.evidenceStatus).toBe("insufficient_data");
      expect(reply.evidenceRefs).toEqual([]);
      expect(reply.content).toContain(CUTISAI_CAPABILITY_STATEMENT);
    }
  });
});
