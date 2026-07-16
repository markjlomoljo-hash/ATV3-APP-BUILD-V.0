import { NextRequest } from "next/server";
import { describe, expect, it } from "vitest";
import { GET, PATCH } from "./route";

describe("daily food log API", () => {
  it("requires an authenticated Supabase bearer token", async () => {
    const getResponse = await GET(
      new NextRequest("http://localhost/api/logs/food?date=2026-07-16"),
      { params: Promise.resolve({}) },
    );
    const patchResponse = await PATCH(
      new NextRequest("http://localhost/api/logs/food", {
        method: "PATCH",
        body: JSON.stringify({ date: "2026-07-16", operation: "mark_complete", complete: true }),
      }),
      { params: Promise.resolve({}) },
    );

    expect(getResponse.status).toBe(401);
    expect(patchResponse.status).toBe(401);
  });
});
