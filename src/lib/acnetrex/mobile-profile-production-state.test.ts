import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

describe("mobile Profile production state", () => {
  it("uses Expo metadata and routes deletion to the authenticated privacy workflow", () => {
    const source = readFileSync(
      join(process.cwd(), "apps", "mobile", "app", "(tabs)", "profile.tsx"),
      "utf8",
    );
    expect(source).toContain("Constants.expoConfig?.version");
    expect(source).toContain('router.push("/modules/privacy")');
    expect(source).not.toMatch(/3\.0\.0-beta|Phase 1|contact support@acnetrex\.com/i);
  });
});
