import { afterEach, describe, expect, it } from "vitest";
import { authenticateSupabaseRequest } from "./supabase-request-auth";

afterEach(() => {
  delete process.env.NEXT_PUBLIC_SUPABASE_URL;
  delete process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
});
describe("Supabase bearer authentication", () => {
  it("requires a bearer token", async () => {
    const result = await authenticateSupabaseRequest(new Request("https://example.test"));
    expect(result).toEqual({ ok: false, status: 401, error: "auth_required" });
  });

  it("fails closed when auth is not configured", async () => {
    const request = new Request("https://example.test", { headers: { authorization: "Bearer token" } });
    const result = await authenticateSupabaseRequest(request);
    expect(result).toEqual({ ok: false, status: 503, error: "auth_not_configured" });
  });

  it("returns only the user verified by Supabase", async () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://project.supabase.co";
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = "public-key";
    const request = new Request("https://example.test", { headers: { authorization: "Bearer token" } });
    const fetcher = async () => new Response(JSON.stringify({ id: "verified-user" }), {
      status: 200,
      headers: { "content-type": "application/json" },
    });

    const result = await authenticateSupabaseRequest(request, fetcher as typeof fetch);
    expect(result).toEqual({ ok: true, userId: "verified-user" });
  });
});
