import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/session", () => ({
  withSession: (handler: (request: Request, context: { userId: string }) => unknown) => handler,
}));
vi.mock("@/lib/reports/service", () => ({ createAndProcessReport: vi.fn() }));

import { createAndProcessReport } from "@/lib/reports/service";
import { POST } from "./route";

const create = vi.mocked(createAndProcessReport);
const userId = "00000000-0000-0000-0000-000000000001";

function request(body: string) {
  return new Request("https://example.test/api/reports/dermatologist", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body,
  });
}

describe("dermatologist report request route", () => {
  beforeEach(() => vi.clearAllMocks());

  it("rejects malformed JSON before calling the report service", async () => {
    const response = await POST(request("{") as never, { userId } as never);
    expect(response.status).toBe(400);
    expect(create).not.toHaveBeenCalled();
  });

  it("rejects an invalid report selection", async () => {
    const response = await POST(request(JSON.stringify({ inclusionOptions: { includeSections: ["not-a-report-section"] } })) as never, { userId } as never);
    expect(response.status).toBe(400);
    expect(create).not.toHaveBeenCalled();
  });

  it("returns the persisted report result", async () => {
    create.mockResolvedValue({ reportRequestId: "11111111-1111-4111-8111-111111111111", status: "completed" });
    const response = await POST(
      request(JSON.stringify({ idempotencyKey: "report-route-test-key", inclusionOptions: { includeSections: "all" } })) as never,
      { userId } as never,
    );
    expect(response.status).toBe(201);
    expect(await response.json()).toMatchObject({ ok: true, status: "completed" });
    expect(create).toHaveBeenCalledWith(
      userId,
      { includeFaceAtlasPhotos: false, includeTreatmentDetails: true, includeSections: "all" },
      "report-route-test-key",
    );
  });

  it("does not report a failed worker as a successful request", async () => {
    create.mockResolvedValue({ reportRequestId: "11111111-1111-4111-8111-111111111111", status: "failed" });
    const response = await POST(request(JSON.stringify({})) as never, { userId } as never);
    expect(response.status).toBe(500);
    expect(await response.json()).toMatchObject({ ok: false, error: "report_generation_failed", status: "failed" });
  });
});
