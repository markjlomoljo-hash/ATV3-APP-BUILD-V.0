import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
const { fakeClient, getPoolMock } = vi.hoisted(() => {
  const fakeClient = { query: vi.fn(), release: vi.fn() };
  const fakePool = { connect: vi.fn(async () => fakeClient) };
  return { fakeClient, getPoolMock: vi.fn(() => fakePool) };
});
vi.mock("@/db", () => ({ getPool: getPoolMock }));

import { processNextCutisAiReplyJob } from "./worker";

const job = {
  outboxId: "11111111-1111-4111-8111-111111111111",
  messageId: "11111111-1111-4111-8111-111111111112",
  conversationId: "11111111-1111-4111-8111-111111111113",
  userId: "11111111-1111-4111-8111-111111111114",
  content: "what's my current streak?",
  attemptCount: 1,
  maxAttempts: 5,
};

const replyMessageId = "22222222-2222-4222-8222-222222222222";

type Handler = { match: string; rows?: unknown[]; rowCount?: number };

function stubQueries(handlers: Handler[]) {
  fakeClient.query.mockImplementation(async (sql: string) => {
    if (sql === "begin" || sql === "commit" || sql === "rollback") return { rows: [], rowCount: 0 };
    const handler = handlers.find((candidate) => sql.includes(candidate.match));
    return { rows: handler?.rows ?? [], rowCount: handler?.rowCount ?? handler?.rows?.length ?? 0 };
  });
}

function sqlCalls(): string[] {
  return fakeClient.query.mock.calls.map(([sql]) => String(sql));
}

describe("CutisAI reply generation worker", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("is idle when no reply job is queued", async () => {
    stubQueries([{ match: "with candidate", rows: [] }]);
    await expect(processNextCutisAiReplyJob({ workerId: "w-test" })).resolves.toEqual({ status: "idle" });
  });

  it("generates and persists a grounded assistant reply, retrieval log, and audit entry", async () => {
    stubQueries([
      { match: "with candidate", rows: [job] },
      { match: "select id from public.cutisai_messages", rows: [] },
      { match: "select id from public.cutisai_conversations", rows: [{ id: job.conversationId }] },
      { match: "personal_learning", rows: [{ personalLearning: true }] },
      {
        match: "from public.gamification",
        rows: [
          {
            id: "gami-row-1",
            currentStreak: 2,
            longestStreak: 5,
            points: 60,
            rank: null,
            petStage: "seed",
            petXp: 10,
            lastActionAt: null,
          },
        ],
      },
      { match: "from public.user_badges", rows: [] },
      { match: "insert into public.cutisai_messages", rows: [{ id: replyMessageId }] },
    ]);

    const outcome = await processNextCutisAiReplyJob({ workerId: "w-test" });

    expect(outcome).toEqual({
      status: "completed",
      messageId: job.messageId,
      replyMessageId,
      replayed: false,
    });

    const insertCall = fakeClient.query.mock.calls.find(([sql]) =>
      String(sql).includes("insert into public.cutisai_messages"),
    );
    expect(insertCall).toBeDefined();
    const params = insertCall?.[1] as unknown[];
    expect(params[0]).toBe(job.userId);
    expect(params[1]).toBe(job.conversationId);
    expect(String(params[2])).toContain("current streak 2 day(s)");
    expect(String(params[4])).toContain(job.messageId); // tool_payload.replyToMessageId
    expect(JSON.parse(String(params[5]))).toEqual([
      { source: "user_record", table: "gamification", id: "gami-row-1", summary: "persisted streak and progress state" },
    ]);
    expect(params[6]).toBe("deterministic_local");

    expect(sqlCalls().some((sql) => sql.includes("insert into public.memory_retrieval_logs"))).toBe(true);
    expect(sqlCalls().some((sql) => sql.includes("insert into public.audit_logs"))).toBe(true);
    expect(sqlCalls().some((sql) => sql.includes("set status='processed'"))).toBe(true);
    // No explicit fact was stated, so no memory rows are written.
    expect(sqlCalls().some((sql) => sql.includes("user_memory_events"))).toBe(false);
  });

  it("extracts explicitly stated facts into the memory tables alongside the reply", async () => {
    stubQueries([
      { match: "with candidate", rows: [{ ...job, content: "My skin type is oily. What is my streak?" }] },
      { match: "select id from public.cutisai_messages", rows: [] },
      { match: "select id from public.cutisai_conversations", rows: [{ id: job.conversationId }] },
      { match: "personal_learning", rows: [{ personalLearning: true }] },
      { match: "from public.gamification", rows: [] },
      { match: "from public.user_badges", rows: [] },
      { match: "insert into public.cutisai_messages", rows: [{ id: replyMessageId }] },
      { match: "insert into public.user_memory_events", rows: [{ id: "33333333-3333-4333-8333-333333333333" }] },
      { match: "insert into public.user_memory_facts", rows: [{ id: "44444444-4444-4444-8444-444444444444" }] },
    ]);

    const outcome = await processNextCutisAiReplyJob({ workerId: "w-test" });
    expect(outcome.status).toBe("completed");

    const eventCall = fakeClient.query.mock.calls.find(([sql]) =>
      String(sql).includes("insert into public.user_memory_events"),
    );
    expect(eventCall?.[1]).toEqual([
      job.userId,
      job.messageId,
      "My skin type is oily",
      JSON.stringify({ factKey: "stated_skin_type", value: "oily" }),
    ]);
    expect(sqlCalls().some((sql) => sql.includes("insert into public.user_memory_facts"))).toBe(true);
  });

  it("replays idempotently when an assistant reply already exists", async () => {
    stubQueries([
      { match: "with candidate", rows: [job] },
      { match: "select id from public.cutisai_messages", rows: [{ id: replyMessageId }] },
    ]);

    const outcome = await processNextCutisAiReplyJob({ workerId: "w-test" });
    expect(outcome).toEqual({
      status: "completed",
      messageId: job.messageId,
      replyMessageId,
      replayed: true,
    });
    expect(sqlCalls().some((sql) => sql.includes("insert into public.cutisai_messages"))).toBe(false);
    expect(sqlCalls().some((sql) => sql.includes("set status='processed'"))).toBe(true);
  });

  it("fails closed when personal-learning consent has been revoked", async () => {
    stubQueries([
      { match: "with candidate", rows: [job] },
      { match: "select id from public.cutisai_messages", rows: [] },
      { match: "select id from public.cutisai_conversations", rows: [{ id: job.conversationId }] },
      { match: "personal_learning", rows: [{ personalLearning: false }] },
    ]);

    const outcome = await processNextCutisAiReplyJob({ workerId: "w-test" });
    expect(outcome).toEqual({
      status: "failed",
      messageId: job.messageId,
      reason: "consent_required",
      attemptCount: job.attemptCount,
    });
    expect(sqlCalls().some((sql) => sql.includes("insert into public.cutisai_messages"))).toBe(false);
    expect(sqlCalls().some((sql) => sql.includes("set status='failed'"))).toBe(true);
  });

  it("fails terminally when the conversation is no longer available", async () => {
    stubQueries([
      { match: "with candidate", rows: [job] },
      { match: "select id from public.cutisai_messages", rows: [] },
      { match: "select id from public.cutisai_conversations", rows: [] },
    ]);

    const outcome = await processNextCutisAiReplyJob({ workerId: "w-test" });
    expect(outcome).toEqual({
      status: "failed",
      messageId: job.messageId,
      reason: "conversation_unavailable",
      attemptCount: job.attemptCount,
    });
  });

  it("reports an honest not_configured state when an unavailable LLM provider is requested", async () => {
    vi.stubEnv("CUTISAI_LLM_PROVIDER", "external-llm");
    stubQueries([{ match: "with candidate", rows: [job] }]);

    const outcome = await processNextCutisAiReplyJob({ workerId: "w-test" });
    expect(outcome).toEqual({ status: "not_configured", reason: "llm_provider_not_configured" });
    expect(sqlCalls().some((sql) => sql.includes("insert into public.cutisai_messages"))).toBe(false);
    expect(sqlCalls().some((sql) => sql.includes("set status='failed'"))).toBe(true);
  });

  it("schedules a retry with backoff when persistence fails mid-generation", async () => {
    fakeClient.query.mockImplementation(async (sql: string) => {
      if (sql === "begin" || sql === "commit" || sql === "rollback") return { rows: [], rowCount: 0 };
      if (sql.includes("with candidate")) return { rows: [job], rowCount: 1 };
      if (sql.includes("select id from public.cutisai_messages")) return { rows: [], rowCount: 0 };
      if (sql.includes("select id from public.cutisai_conversations")) {
        return { rows: [{ id: job.conversationId }], rowCount: 1 };
      }
      if (sql.includes("personal_learning")) return { rows: [{ personalLearning: true }], rowCount: 1 };
      if (sql.includes("from public.gamification")) return { rows: [], rowCount: 0 };
      if (sql.includes("from public.user_badges")) return { rows: [], rowCount: 0 };
      if (sql.includes("insert into public.cutisai_messages")) throw new Error("connection terminated unexpectedly");
      return { rows: [], rowCount: 0 };
    });

    const outcome = await processNextCutisAiReplyJob({ workerId: "w-test" });
    expect(outcome).toEqual({
      status: "retry_scheduled",
      messageId: job.messageId,
      reason: "cutisai_reply_generation_failed",
      attemptCount: job.attemptCount,
    });
    expect(sqlCalls().some((sql) => sql.includes("set status='pending', next_attempt_at"))).toBe(true);
  });
});
