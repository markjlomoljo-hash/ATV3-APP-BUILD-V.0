import { describe, expect, it } from "vitest";
import { corsHeadersForOrigin, isCorsOriginAllowed } from "./cors";

describe("API CORS policy", () => {
  const allowlist = "https://app.acnetrex.test,https://preview.acnetrex.test";

  it("allows exact configured origins and emits credential-safe headers", () => {
    expect(isCorsOriginAllowed("https://app.acnetrex.test", allowlist)).toBe(true);
    expect(corsHeadersForOrigin("https://app.acnetrex.test", allowlist)).toMatchObject({
      "Access-Control-Allow-Origin": "https://app.acnetrex.test",
      "Access-Control-Allow-Credentials": "true",
      Vary: "Origin",
    });
  });

  it("rejects suffix, wildcard, malformed, and unconfigured origins", () => {
    expect(isCorsOriginAllowed("https://app.acnetrex.test.evil.test", allowlist)).toBe(false);
    expect(isCorsOriginAllowed("https://preview.acnetrex.test", "*")).toBe(false);
    expect(isCorsOriginAllowed("not-a-url", allowlist)).toBe(false);
    expect(corsHeadersForOrigin("https://evil.test", allowlist)).toBeNull();
  });
});
