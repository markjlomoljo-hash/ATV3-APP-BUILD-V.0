import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

afterEach(() => vi.unstubAllEnvs());

describe("health endpoint exposure boundary", () => {
  it("keeps the public route free of secret-presence and internal environment fields", () => {
    const source = readFileSync(resolve("src/app/api/health/route.ts"), "utf8");
    expect(source).not.toContain("mlWorkerSecret");
    expect(source).not.toContain("clerkSecretKey");
    expect(source).not.toMatch(/\benvironment\s*[,}]/);
    expect(source).not.toContain("errorDiagnostics");
  });

  it("provides a separately authenticated internal diagnostic route", () => {
    const source = readFileSync(resolve("src/app/api/internal/health/route.ts"), "utf8");
    expect(source).toContain("ACNETREX_INTERNAL_HEALTH_SECRET");
    expect(source).toContain("timingSafeEqual");
    expect(source).toContain("health_auth_required");
  });

  it("fails closed before running diagnostics when internal authentication is absent or invalid", async () => {
    const { GET } = await import("../internal/health/route");

    vi.stubEnv("ACNETREX_INTERNAL_HEALTH_SECRET", "");
    const unconfigured = await GET(new Request("https://example.test/api/internal/health"));
    expect(unconfigured.status).toBe(503);
    await expect(unconfigured.json()).resolves.toMatchObject({ error: "health_not_configured" });

    vi.stubEnv("ACNETREX_INTERNAL_HEALTH_SECRET", "expected-secret");
    const unauthorized = await GET(new Request("https://example.test/api/internal/health", {
      headers: { authorization: "Bearer wrong-secret" },
    }));
    expect(unauthorized.status).toBe(401);
    await expect(unauthorized.json()).resolves.toMatchObject({ error: "health_auth_required" });
  });
});
