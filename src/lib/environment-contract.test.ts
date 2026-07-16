import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("production environment example", () => {
  it("does not pin a real Supabase project URL and documents strict API CORS", () => {
    const source = readFileSync(resolve(".env.example"), "utf8");
    expect(source).not.toMatch(/https:\/\/[a-z0-9]+\.supabase\.co/i);
    expect(source).toContain("API_CORS_ALLOWED_ORIGINS=");
    expect(source).toContain("ACNETREX_INTERNAL_HEALTH_SECRET=");
  });
});
