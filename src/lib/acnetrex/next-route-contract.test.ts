import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

describe("Next route module contracts", () => {
  it("uses a promise-based default route context for static authenticated routes", () => {
    const source = readFileSync(resolve("src/lib/session.ts"), "utf8");

    expect(source).not.toContain("{ params?: unknown }");
    expect(source).toContain("params: Promise<Record<string, never>>");
  });

  it("does not expose unsupported helper exports from route modules", () => {
    const source = readFileSync(resolve("src/app/api/faceatlas/scans/route.ts"), "utf8");

    expect(source).not.toMatch(/export function requestCorrelationId/);
  });
});
