import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

describe("mobile privacy production state", () => {
  it("never substitutes local defaults for consent values", () => {
    const screen = readFileSync(
      join(process.cwd(), "apps", "mobile", "app", "modules", "privacy", "index.tsx"),
      "utf8",
    );

    expect(screen).toContain("PrivacyConsentSettings | null");
    expect(screen).toContain("No consent values are being assumed");
    expect(screen).toContain("no defaults are being shown");
    expect(screen).not.toContain("EXPO_PUBLIC_API_BASE_URL");
    expect(screen).not.toMatch(/setConsent\(prev\s*=>/);
  });

  it("uses the shared authenticated API client for every privacy mutation", () => {
    const service = readFileSync(
      join(process.cwd(), "apps", "mobile", "src", "lib", "privacy-service.ts"),
      "utf8",
    );

    expect(service).toContain("apiFetch");
    expect(service).toContain("apiMutation");
    expect(service).toContain('"/api/privacy/consent"');
    expect(service).toContain('"/api/privacy/export"');
    expect(service).toContain('"/api/privacy/delete-account"');
  });

  it("writes consent and audit records in one database transaction", () => {
    const route = readFileSync(
      join(process.cwd(), "src", "app", "api", "privacy", "consent", "route.ts"),
      "utf8",
    );

    expect(route).toContain('client.query("BEGIN")');
    expect(route).toContain("await client.query(\n        `INSERT INTO public.consent_audit_events");
    expect(route).toContain('client.query("COMMIT")');
    expect(route).toContain('client.query("ROLLBACK")');
    expect(route).not.toContain("void client.query(");
  });
});
