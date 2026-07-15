import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const { client, pool, getPoolMock } = vi.hoisted(() => {
  const client = { query: vi.fn(), release: vi.fn() };
  const pool = { connect: vi.fn(async () => client), query: vi.fn() };
  return { client, pool, getPoolMock: vi.fn(() => pool) };
});

vi.mock("@/db", () => ({ getPool: getPoolMock }));

import { getCanonicalConsent, updateCanonicalConsent } from "./consents";
import { requestHash } from "@/lib/reliability/idempotency";

const actorId = "11111111-1111-4111-8111-111111111111";
const consentRow = {
  id: "22222222-2222-4222-8222-222222222222",
  personalProcessing: true,
  rawImageProcessing: false,
  personalLearning: false,
  rawImageRetention: true,
  anonymousLearning: false,
  researchShare: false,
  marketing: false,
  consentedAt: new Date("2026-07-14T00:00:00.000Z"),
  updatedAt: new Date("2026-07-14T00:00:01.000Z"),
};

describe("canonical consent persistence", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns an explicit default-deny record when the owner has no consent row", async () => {
    pool.query.mockResolvedValue({ rows: [], rowCount: 0 });

    const consent = await getCanonicalConsent(actorId);

    expect(consent).toMatchObject({
      personalProcessing: false,
      rawImageProcessing: false,
      personalLearning: false,
      rawImageRetention: false,
    });
    expect(String(pool.query.mock.calls[0]?.[0])).toContain("personal_processing");
    expect(String(pool.query.mock.calls[0]?.[0])).toContain("raw_image_processing");
    expect(pool.query.mock.calls[0]?.[1]).toEqual([actorId]);
  });

  it("writes processing, learning, and retention as separate audited purposes", async () => {
    const patch = { personalProcessing: true, rawImageRetention: true };
    client.query.mockImplementation(async (sql: string) => {
      if (sql === "begin" || sql === "commit" || sql === "rollback") return { rows: [], rowCount: 0 };
      if (sql.includes("insert into public.api_idempotency_keys")) return { rows: [{ id: "reservation" }], rowCount: 1 };
      if (sql.includes("select request_hash as")) {
        return {
          rows: [{
            requestHash: requestHash(patch),
            status: "processing",
            responseStatus: null,
            responseReference: {},
          }],
          rowCount: 1,
        };
      }
      if (sql.includes("from public.consents") && sql.includes("for update")) {
        return { rows: [{ ...consentRow, personalProcessing: false, rawImageRetention: false }], rowCount: 1 };
      }
      if (sql.includes("insert into public.consents")) return { rows: [consentRow], rowCount: 1 };
      return { rows: [], rowCount: 1 };
    });

    const result = await updateCanonicalConsent({
      actorId,
      idempotencyKey: "consent-update-000001",
      patch,
    });

    expect(result).toMatchObject({
      replayed: false,
      consent: {
        personalProcessing: true,
        rawImageProcessing: false,
        personalLearning: false,
        rawImageRetention: true,
      },
    });
    const consentInsert = client.query.mock.calls.find(([sql]) => String(sql).includes("insert into public.consents"));
    expect(String(consentInsert?.[0])).toContain("personal_processing");
    expect(String(consentInsert?.[0])).toContain("raw_image_processing");
    expect(consentInsert?.[1]).toEqual([
      actorId,
      true,
      false,
      false,
      true,
      false,
      false,
      false,
      true,
      new Date("2026-07-14T00:00:00.000Z").toISOString(),
    ]);
    const auditInsert = client.query.mock.calls.find(([sql]) => String(sql).includes("insert into public.audit_logs"));
    expect(JSON.parse(String((auditInsert?.[1] as unknown[] | undefined)?.[2]))).toMatchObject({
      changedFields: ["personalProcessing", "rawImageRetention"],
      before: { personalProcessing: false, rawImageRetention: false },
      after: { personalProcessing: true, rawImageRetention: true },
    });
  });

  it("rejects a malformed consent reference replay instead of trusting stored JSON", async () => {
    const patch = { personalProcessing: true };
    client.query.mockImplementation(async (sql: string) => {
      if (sql === "begin" || sql === "commit" || sql === "rollback") return { rows: [], rowCount: 0 };
      if (sql.includes("insert into public.api_idempotency_keys")) return { rows: [], rowCount: 0 };
      if (sql.includes("select request_hash as")) {
        return {
          rows: [{
            requestHash: requestHash(patch),
            status: "completed",
            responseStatus: 200,
            responseReference: { consent: { personalProcessing: true } },
          }],
          rowCount: 1,
        };
      }
      return { rows: [], rowCount: 1 };
    });

    await expect(updateCanonicalConsent({
      actorId,
      idempotencyKey: "consent-replay-000001",
      patch,
    })).rejects.toThrow();
  });

  it("validates consent patches again at the persistence boundary", async () => {
    await expect(updateCanonicalConsent({
      actorId,
      idempotencyKey: "consent-update-000002",
      patch: { personalProcessing: "yes" } as never,
    })).rejects.toThrow();

    expect(pool.connect).not.toHaveBeenCalled();
  });
});
