import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/db", () => ({ getDb: vi.fn() }));
vi.mock("@/lib/profile/aggregate", () => ({
  getSectionRecords: vi.fn(),
  getProfessionalProfile: vi.fn(),
}));
vi.mock("@/lib/audit", () => ({ recordProfileAuditEvent: vi.fn() }));
vi.mock("@/lib/storage", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/storage")>();
  return { ...actual, putObject: vi.fn(), getObject: vi.fn() };
});

import { getDb } from "@/db";
import { recordProfileAuditEvent } from "@/lib/audit";
import { getProfessionalProfile, getSectionRecords } from "@/lib/profile/aggregate";
import { getObject, putObject, StorageBackendError, StorageObjectNotFoundError } from "@/lib/storage";
import { createAndProcessReport, getReportFileBuffer } from "./service";

const database = vi.mocked(getDb);
const sectionRecords = vi.mocked(getSectionRecords);
const professionalProfile = vi.mocked(getProfessionalProfile);
const put = vi.mocked(putObject);
const get = vi.mocked(getObject);

const userId = "00000000-0000-0000-0000-000000000001";
const requestId = "11111111-1111-4111-8111-111111111111";
const jobId = "22222222-2222-4222-8222-222222222222";

const inclusion = {
  includeFaceAtlasPhotos: false,
  includeTreatmentDetails: true,
  includeSections: "all" as const,
};

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

describe("createAndProcessReport failure path", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sectionRecords.mockResolvedValue([]);
    professionalProfile.mockResolvedValue({
      consent: {
        includeFaceAtlasPhotosInReports: false,
        includeTreatmentDetailsInReports: true,
      },
    } as never);
  });

  it("persists the honest failure reason on the report job when storage fails", async () => {
    const tx = {
      insert: vi
        .fn()
        .mockReturnValueOnce(chain([{ id: requestId, userId, status: "processing" }]))
        .mockReturnValueOnce(chain([{ id: jobId, userId, reportRequestId: requestId }]))
        .mockReturnValueOnce(chain([])),
    };
    const setCalls: Array<Record<string, unknown>> = [];
    const update = vi.fn().mockImplementation(() => {
      const c = chain([]);
      c.set.mockImplementation((value: Record<string, unknown>) => {
        setCalls.push(value);
        return c;
      });
      return c;
    });
    const db = {
      transaction: vi.fn(async (fn: (t: typeof tx) => Promise<unknown>) => fn(tx)),
      // buildRawBundle: users, scans, plans, checkins, triggers, forecasts, logs
      select: vi
        .fn()
        .mockReturnValueOnce(
          chain([{ name: "Fixture Person", email: "f@example.test", createdAt: new Date("2025-01-05T00:00:00.000Z") }]),
        )
        .mockReturnValue(chain([])),
      insert: vi.fn().mockReturnValue(chain([])),
      update,
    };
    database.mockReturnValue(db as never);
    put.mockRejectedValue(new StorageBackendError("storage_not_configured"));

    const result = await createAndProcessReport(userId, inclusion);

    expect(result).toEqual({ reportRequestId: requestId, status: "failed" });
    // Request flips to failed, and the job records the real reason.
    expect(setCalls).toContainEqual({ status: "failed" });
    const jobUpdate = setCalls.find((call) => "failureReason" in call);
    expect(jobUpdate).toMatchObject({ status: "failed", failureReason: "storage_not_configured" });
    // No file row and no success audit event may exist for a failed report.
    expect(db.insert).not.toHaveBeenCalled();
    expect(vi.mocked(recordProfileAuditEvent)).not.toHaveBeenCalled();
  });
});

describe("getReportFileBuffer ownership and honesty", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns null without touching storage when the report is not owned by the caller", async () => {
    const db = { select: vi.fn().mockReturnValue(chain([])) };
    database.mockReturnValue(db as never);

    await expect(getReportFileBuffer(userId, requestId)).resolves.toBeNull();
    expect(get).not.toHaveBeenCalled();
  });

  it("returns null for a report that is not completed", async () => {
    const db = {
      select: vi.fn().mockReturnValueOnce(chain([{ id: requestId, status: "failed" }])),
    };
    database.mockReturnValue(db as never);

    await expect(getReportFileBuffer(userId, requestId)).resolves.toBeNull();
    expect(get).not.toHaveBeenCalled();
  });

  it("returns null instead of throwing when the stored object is missing", async () => {
    const db = {
      select: vi
        .fn()
        .mockReturnValueOnce(chain([{ id: requestId, status: "completed" }]))
        .mockReturnValueOnce(chain([{ storageRef: `reports/${userId}/${requestId}.pdf` }])),
    };
    database.mockReturnValue(db as never);
    get.mockRejectedValue(new StorageObjectNotFoundError(`reports/${userId}/${requestId}.pdf`));

    await expect(getReportFileBuffer(userId, requestId)).resolves.toBeNull();
  });

  it("streams the stored bytes for the owner of a completed report", async () => {
    const pdf = Buffer.from("%PDF-real");
    const db = {
      select: vi
        .fn()
        .mockReturnValueOnce(chain([{ id: requestId, status: "completed" }]))
        .mockReturnValueOnce(chain([{ storageRef: `reports/${userId}/${requestId}.pdf` }])),
    };
    database.mockReturnValue(db as never);
    get.mockResolvedValue(pdf);

    await expect(getReportFileBuffer(userId, requestId)).resolves.toBe(pdf);
    expect(get).toHaveBeenCalledWith(`reports/${userId}/${requestId}.pdf`);
  });
});
