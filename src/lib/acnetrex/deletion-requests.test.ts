import type { PoolClient } from "pg";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/db", () => ({
  getPool: vi.fn(),
}));
vi.mock("@/lib/reliability/idempotency", () => ({
  executeIdempotent: vi.fn(),
}));

import { getPool } from "@/db";
import {
  cancelDeletionRequest,
  createDeletionRequest,
  deletionRequestInputSchema,
  getDeletionRequest,
} from "@/lib/acnetrex/deletion-requests";
import { executeIdempotent } from "@/lib/reliability/idempotency";

const ACTOR_ID = "11111111-1111-4111-8111-111111111111";
const REQUEST_ID = "22222222-2222-4222-8222-222222222222";
const JOB_ID = "33333333-3333-4333-8333-333333333333";
const TOMBSTONE_ID = "44444444-4444-4444-8444-444444444444";
const OUTBOX_ID = "55555555-5555-4555-8555-555555555555";

type QueryCall = { text: string; values?: unknown[] };

function normalized(text: string) {
  return text.replace(/\s+/g, " ").trim().toLowerCase();
}

function createClient(handler: (call: QueryCall) => unknown) {
  const query = vi.fn(async (text: string, values?: unknown[]) => handler({ text, values }));
  return { query } as unknown as PoolClient & { query: typeof query };
}

describe("canonical deletion request service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("accepts only explicit, allowlisted deletion targets and confirmation", () => {
    expect(deletionRequestInputSchema.safeParse({
      requestType: "record",
      target: { table: "sleep_logs", id: REQUEST_ID },
      exportRequestedFirst: false,
      confirmed: true,
    }).success).toBe(true);

    expect(deletionRequestInputSchema.safeParse({
      requestType: "record",
      target: { table: "auth.users", id: REQUEST_ID },
      exportRequestedFirst: false,
      confirmed: true,
    }).success).toBe(false);

    expect(deletionRequestInputSchema.safeParse({
      requestType: "account",
      userId: "99999999-9999-4999-8999-999999999999",
      exportRequestedFirst: false,
      confirmed: true,
    }).success).toBe(false);

    expect(deletionRequestInputSchema.safeParse({
      requestType: "account",
      exportRequestedFirst: false,
      confirmed: false,
    }).success).toBe(false);
  });

  it("uses one idempotent transaction to create request, job, outbox, and append-only audit evidence", async () => {
    const calls: QueryCall[] = [];
    const requestedAt = new Date("2026-07-14T00:00:00.000Z");
    const graceEndsAt = new Date("2026-07-28T00:00:00.000Z");
    const client = createClient((call) => {
      calls.push(call);
      const sql = normalized(call.text);
      if (sql.includes("from auth.users")) return { rows: [{ recent: true }], rowCount: 1 };
      if (sql.includes("from public.deletion_requests") && sql.includes("for update")) {
        return { rows: [], rowCount: 0 };
      }
      if (sql.startsWith("insert into public.deletion_requests")) {
        return {
          rows: [{
            id: REQUEST_ID,
            requestType: "account",
            status: "scheduled",
            exportRequestedFirst: true,
            currentStep: "awaiting_grace_period",
            attemptCount: 0,
            lastErrorCode: null,
            requestedAt,
            gracePeriodEndsAt: graceEndsAt,
            scheduledPurgeAt: graceEndsAt,
            cancelledAt: null,
            completedAt: null,
          }],
          rowCount: 1,
        };
      }
      if (sql.startsWith("insert into public.deletion_jobs")) {
        return { rows: [{ id: JOB_ID }], rowCount: 1 };
      }
      if (sql.startsWith("insert into public.outbox_events")) {
        return { rows: [{ id: OUTBOX_ID }], rowCount: 1 };
      }
      if (sql.startsWith("insert into public.deletion_audit_events")) {
        return { rows: [], rowCount: 1 };
      }
      return { rows: [], rowCount: 1 };
    });
    vi.mocked(executeIdempotent).mockImplementation(async (options) => {
      const result = await options.execute(client);
      return { ...result, replayed: false };
    });

    const result = await createDeletionRequest({
      actorId: ACTOR_ID,
      idempotencyKey: "deletion-create-0001",
      input: {
        requestType: "account",
        exportRequestedFirst: true,
        confirmed: true,
      },
    });

    expect(result.request).toMatchObject({ id: REQUEST_ID, status: "scheduled" });
    expect(executeIdempotent).toHaveBeenCalledWith(expect.objectContaining({
      actorId: ACTOR_ID,
      scope: "deletion-request-create",
      key: "deletion-create-0001",
      route: "/api/deletions",
    }));
    expect(calls.some((call) => normalized(call.text).includes("select pg_advisory_xact_lock"))).toBe(true);
    expect(calls.some((call) => normalized(call.text).startsWith("insert into public.deletion_requests"))).toBe(true);
    expect(calls.some((call) => normalized(call.text).startsWith("insert into public.deletion_jobs"))).toBe(true);
    expect(calls.some((call) => normalized(call.text).startsWith("insert into public.outbox_events"))).toBe(true);
    expect(calls.some((call) => normalized(call.text).startsWith("insert into public.deletion_audit_events"))).toBe(true);
    expect(calls.flatMap((call) => call.values ?? []).filter((value) => value === ACTOR_ID).length).toBeGreaterThan(3);
    const requestInsert = calls.find((call) => normalized(call.text).startsWith("insert into public.deletion_requests"));
    expect(requestInsert?.values).toEqual(expect.arrayContaining([
      ACTOR_ID,
      expect.stringMatching(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i),
    ]));
  });

  it("reads status only through the token-derived owner predicate", async () => {
    const query = vi.fn().mockResolvedValue({
      rows: [{
        id: REQUEST_ID,
        requestType: "all_health_data",
        status: "processing",
        exportRequestedFirst: false,
        currentStep: "erase_data",
        attemptCount: 2,
        maxAttempts: 10,
        lastErrorCode: null,
        requestedAt: new Date("2026-07-14T00:00:00.000Z"),
        gracePeriodEndsAt: new Date("2026-07-28T00:00:00.000Z"),
        scheduledPurgeAt: new Date("2026-07-28T00:00:00.000Z"),
        cancelledAt: null,
        completedAt: null,
      }],
      rowCount: 1,
    });
    vi.mocked(getPool).mockReturnValue({ query } as never);

    const result = await getDeletionRequest({ actorId: ACTOR_ID, requestId: REQUEST_ID });

    expect(result).toMatchObject({ id: REQUEST_ID, currentStep: "erase_data" });
    expect(normalized(query.mock.calls[0]![0])).toContain("where r.id=$2::uuid and r.user_id=$1::uuid");
    expect(query.mock.calls[0]![1]).toEqual([ACTOR_ID, REQUEST_ID]);
  });

  it("cancels only an owner-scoped request that is still inside the grace window", async () => {
    const calls: QueryCall[] = [];
    const client = createClient((call) => {
      calls.push(call);
      const sql = normalized(call.text);
      if (sql.includes("from auth.users")) return { rows: [{ recent: true }], rowCount: 1 };
      if (sql.includes("from public.deletion_requests r") && sql.includes("for update")) {
        return { rows: [{
          id: REQUEST_ID,
          status: "scheduled",
          userId: ACTOR_ID,
          jobId: JOB_ID,
          jobStatus: "queued",
          outboxId: OUTBOX_ID,
          outboxStatus: "pending",
          gracePeriodEndsAt: new Date("2099-01-01T00:00:00.000Z"),
        }], rowCount: 1 };
      }
      if (sql.startsWith("update public.deletion_requests")) return { rows: [], rowCount: 1 };
      if (sql.startsWith("update public.deletion_jobs")) return { rows: [], rowCount: 1 };
      if (sql.startsWith("update public.outbox_events")) return { rows: [], rowCount: 1 };
      if (sql.startsWith("insert into public.deletion_audit_events")) return { rows: [], rowCount: 1 };
      return { rows: [], rowCount: 1 };
    });
    vi.mocked(executeIdempotent).mockImplementation(async (options) => ({
      ...(await options.execute(client)),
      replayed: false,
    }));

    const result = await cancelDeletionRequest({
      actorId: ACTOR_ID,
      requestId: REQUEST_ID,
      idempotencyKey: "deletion-cancel-0001",
    });

    expect(result).toEqual({ requestId: REQUEST_ID, status: "cancelled", replayed: false });
    const select = calls.find((call) => normalized(call.text).includes("from public.deletion_requests r"));
    expect(normalized(select!.text)).toContain("r.user_id=$1::uuid");
    expect(calls.filter((call) => normalized(call.text).startsWith("update public."))).toHaveLength(3);
  });
});
