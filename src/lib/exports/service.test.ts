import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/db", () => ({ getDb: vi.fn() }));
vi.mock("./compile", () => ({ gatherExportBundle: vi.fn() }));
vi.mock("@/lib/audit", () => ({ recordProfileAuditEvent: vi.fn() }));
vi.mock("@/lib/storage", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/storage")>();
  return { ...actual, putObject: vi.fn(), getObject: vi.fn() };
});

import { getDb } from "@/db";
import { recordProfileAuditEvent } from "@/lib/audit";
import { putObject } from "@/lib/storage";
import { gatherExportBundle } from "./compile";
import { createAndProcessExport } from "./service";

const database = vi.mocked(getDb);
const gather = vi.mocked(gatherExportBundle);
const put = vi.mocked(putObject);

const userId = "00000000-0000-0000-0000-000000000001";
const exportId = "33333333-3333-4333-8333-333333333333";

/** Minimal awaitable drizzle query-chain stub resolving to `rows`. */
function chain(rows: unknown[] = []) {
  const c = {
    from: vi.fn(),
    where: vi.fn(),
    orderBy: vi.fn(),
    limit: vi.fn(),
    values: vi.fn(),
    set: vi.fn(),
    returning: vi.fn(),
    then: (resolve?: (value: unknown[]) => unknown, reject?: (reason: unknown) => unknown) =>
      Promise.resolve(rows).then(resolve, reject),
  };
  c.from.mockReturnValue(c);
  c.where.mockReturnValue(c);
  c.orderBy.mockReturnValue(c);
  c.limit.mockReturnValue(c);
  c.values.mockReturnValue(c);
  c.set.mockReturnValue(c);
  c.returning.mockReturnValue(c);
  return c;
}

function databaseWithRequestRow() {
  const setCalls: Array<Record<string, unknown>> = [];
  const valuesCalls: Array<Record<string, unknown>> = [];
  const insert = vi.fn().mockImplementation(() => {
    const c = chain([{ id: exportId, userId, status: "processing" }]);
    c.values.mockImplementation((value: Record<string, unknown>) => {
      valuesCalls.push(value);
      return c;
    });
    return c;
  });
  const update = vi.fn().mockImplementation(() => {
    const c = chain([]);
    c.set.mockImplementation((value: Record<string, unknown>) => {
      setCalls.push(value);
      return c;
    });
    return c;
  });
  database.mockReturnValue({ insert, update } as never);
  return { setCalls, valuesCalls };
}

describe("createAndProcessExport failure persistence", () => {
  beforeEach(() => vi.clearAllMocks());

  it("persists the real failure reason on the export request when compilation fails", async () => {
    const { setCalls } = databaseWithRequestRow();
    gather.mockRejectedValue(new Error("bundle assembly failed: database offline"));

    const result = await createAndProcessExport(userId, "json", "all");

    expect(result).toEqual({ exportRequestId: exportId, status: "failed" });
    expect(setCalls).toContainEqual({
      status: "failed",
      failureReason: "bundle assembly failed: database offline",
    });
    expect(put).not.toHaveBeenCalled();
    expect(vi.mocked(recordProfileAuditEvent)).not.toHaveBeenCalled();
  });

  it("stores an explicit fallback reason for non-Error failures instead of dropping it", async () => {
    const { setCalls } = databaseWithRequestRow();
    gather.mockRejectedValue("string failure");

    const result = await createAndProcessExport(userId, "json", "all");

    expect(result.status).toBe("failed");
    expect(setCalls).toContainEqual({
      status: "failed",
      failureReason: "Unknown export generation error",
    });
  });

  it("persists the storage failure reason when the artifact upload fails", async () => {
    const { setCalls } = databaseWithRequestRow();
    gather.mockResolvedValue({ daily_logs: [] });
    put.mockRejectedValue(new Error("storage_unavailable"));

    const result = await createAndProcessExport(userId, "json", "all");

    expect(result.status).toBe("failed");
    expect(setCalls).toContainEqual({ status: "failed", failureReason: "storage_unavailable" });
  });

  it("completes without writing any failure reason on success", async () => {
    const { setCalls, valuesCalls } = databaseWithRequestRow();
    gather.mockResolvedValue({ daily_logs: [{ id: "log-1" }] });
    put.mockResolvedValue({ sizeBytes: 42 });

    const result = await createAndProcessExport(userId, "json", "all");

    expect(result).toEqual({ exportRequestId: exportId, status: "completed" });
    expect(setCalls).toContainEqual({ status: "completed" });
    expect(setCalls.every((call) => !("failureReason" in call))).toBe(true);
    expect(valuesCalls).toContainEqual(
      expect.objectContaining({ mimeType: "application/json", sizeBytes: 42 }),
    );
    expect(vi.mocked(recordProfileAuditEvent)).toHaveBeenCalledWith(userId, "export_generated", {
      exportRequestId: exportId,
      format: "json",
      scope: "all",
    });
  });
});
