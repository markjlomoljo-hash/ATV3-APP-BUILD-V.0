import { describe, expect, it } from "vitest";

import {
  normalizeSmokeBaseUrl,
  visibleTextFromHtml,
} from "../../../scripts/route-smoke.mjs";

describe("route smoke input and HTML handling", () => {
  it("accepts a plain HTTP origin and rejects command-bearing or credentialed URLs", () => {
    expect(normalizeSmokeBaseUrl("http://127.0.0.1:3100").href).toBe("http://127.0.0.1:3100/");
    expect(() => normalizeSmokeBaseUrl("http://127.0.0.1:3100;whoami")).toThrow("invalid_route_smoke_base_url");
    expect(() => normalizeSmokeBaseUrl("http://user:secret@127.0.0.1:3100")).toThrow("invalid_route_smoke_base_url");
    expect(() => normalizeSmokeBaseUrl("file:///tmp/app")).toThrow("invalid_route_smoke_base_url");
  });

  it("extracts visible text without regex-based script or style tag filtering", () => {
    const html = [
      "<html><head><style>.x{content:'undefined'}</style></head>",
      "<body><h1>Ready</h1><ScRiPt>window.value = null;</sCrIpT>",
      "<p>Visible result</p><!-- null --></body></html>",
    ].join("");

    expect(visibleTextFromHtml(html)).toContain("Ready");
    expect(visibleTextFromHtml(html)).toContain("Visible result");
    expect(visibleTextFromHtml(html)).not.toMatch(/undefined|null/i);
  });
});
