import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@clerk/nextjs/server", () => ({ auth: vi.fn(), clerkClient: vi.fn() }));
import { AuthorizationError } from "./errors";
import { authorizationErrorResponse } from "./request";

describe("admin HTTP authorization boundary", () => {
  it("returns 401 for an unauthenticated request", async () => {
    const response = authorizationErrorResponse(new AuthorizationError("auth_required"));
    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({ ok: false, error: "auth_required" });
  });

  it("returns 403 for an authenticated but unauthorized request", async () => {
    const response = authorizationErrorResponse(new AuthorizationError("forbidden"));
    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toEqual({ ok: false, error: "forbidden" });
  });

  it("does not return raw provider errors", async () => {
    const response = authorizationErrorResponse(new Error("Clerk secret detail"));
    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toEqual({ ok: false, error: "forbidden" });
  });
});
