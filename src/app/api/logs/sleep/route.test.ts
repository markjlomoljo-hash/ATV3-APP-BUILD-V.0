import { NextRequest } from "next/server";
import { describe, expect, it } from "vitest";
import { GET, PATCH } from "./route";

describe("SleepDerm log API", () => {
  it("fails closed without a verified Supabase bearer token", async () => {
    const getResponse = await GET(new NextRequest("http://localhost/api/logs/sleep?limit=7"), {
      params: Promise.resolve({}),
    });
    const patchResponse = await PATCH(
      new NextRequest("http://localhost/api/logs/sleep", {
        method: "PATCH",
        body: JSON.stringify({ log_date: "2026-07-16" }),
      }),
      { params: Promise.resolve({}) },
    );
    expect(getResponse.status).toBe(401);
    expect(patchResponse.status).toBe(401);
  });
});
