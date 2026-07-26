import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/session", () => ({
  withSession:
    (handler: (request: Request, context: { userId: string }, routeCtx: unknown) => unknown) =>
      handler,
}));
vi.mock("@/lib/reports/service", () => ({ getReportFileBuffer: vi.fn() }));

import { DatabaseConfigurationError } from "@/db";
import { getReportFileBuffer } from "@/lib/reports/service";
import { StorageBackendError } from "@/lib/storage";
import { GET } from "./route";

const getBuffer = vi.mocked(getReportFileBuffer);
const userId = "00000000-0000-0000-0000-000000000001";
const reportId = "11111111-1111-4111-8111-111111111111";

// The mocked withSession passes the handler through, so the exported GET is
// the raw 3-argument handler (request, session, routeCtx) in this test.
const handler = GET as unknown as (
  request: Request,
  session: { userId: string },
  routeCtx: { params: Promise<{ id: string }> },
) => Promise<Response>;

function invoke() {
  const request = new Request(`https://example.test/api/reports/${reportId}/download`);
  return handler(request, { userId }, { params: Promise.resolve({ id: reportId }) });
}

describe("report download route", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns 404 when no completed report file exists", async () => {
    getBuffer.mockResolvedValue(null);
    const response = await invoke();
    expect(response.status).toBe(404);
    expect(await response.json()).toMatchObject({ ok: false });
    expect(getBuffer).toHaveBeenCalledWith(userId, reportId);
  });

  it("streams the private PDF with download headers", async () => {
    const pdf = Buffer.from("%PDF-fake");
    getBuffer.mockResolvedValue(pdf);

    const response = await invoke();

    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Type")).toBe("application/pdf");
    expect(response.headers.get("Content-Disposition")).toContain(reportId);
    expect(response.headers.get("Cache-Control")).toBe("private, no-store");
    expect(Buffer.from(await response.arrayBuffer()).equals(pdf)).toBe(true);
  });

  it("surfaces storage backend failures with their honest reason", async () => {
    getBuffer.mockRejectedValue(new StorageBackendError("storage_not_configured"));
    const response = await invoke();
    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({ ok: false, error: "storage_not_configured" });
  });

  it("keeps database misconfiguration distinct from storage failures", async () => {
    getBuffer.mockRejectedValue(new DatabaseConfigurationError());
    const response = await invoke();
    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({ ok: false, error: "database_unavailable" });
  });

  it("classifies unknown database errors instead of claiming success", async () => {
    getBuffer.mockRejectedValue(new Error("some query failed"));
    const response = await invoke();
    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({ ok: false, error: "database_query_failed" });
  });
});
