import path from "path";
import { describe, expect, it } from "vitest";
import { resolvePrivateStoragePath } from "./storage";

describe("private storage path resolution", () => {
  it("keeps valid object references under the private root", () => {
    const resolved = resolvePrivateStoragePath("reports/user-id/report-id.pdf");
    expect(resolved).toContain(`${path.sep}.private-storage${path.sep}reports${path.sep}`);
  });

  it.each([
    "../secret",
    "reports/../../secret",
    "/etc/passwd",
    "reports//file.pdf",
    "reports/./file.pdf",
    "C:\\Windows\\system.ini",
    "",
  ])("rejects unsafe reference %s", (storageRef) => {
    expect(() => resolvePrivateStoragePath(storageRef)).toThrow("invalid_storage_reference");
  });
});
