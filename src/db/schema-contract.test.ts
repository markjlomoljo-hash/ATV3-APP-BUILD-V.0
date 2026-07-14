import { getTableColumns } from "drizzle-orm";
import { describe, expect, it } from "vitest";
import {
  deletionAuditEvents,
  deletionRequests,
  exportFiles,
  exportRequests,
  profileAuditEvents,
  reportConsentSnapshots,
  reportFiles,
  reportJobs,
} from "./schema";

describe("Drizzle mappings for the live Phase 7 schema", () => {
  it("maps audit and deletion fields to the canonical physical columns", () => {
    expect(getTableColumns(profileAuditEvents).metadataJson.name).toBe("metadata");
    expect(getTableColumns(deletionAuditEvents).metadataJson.name).toBe("metadata");
    expect(getTableColumns(deletionRequests).type.name).toBe("request_type");
  });

  it("maps report ownership, storage, and consent fields", () => {
    expect(getTableColumns(reportJobs).userId.name).toBe("user_id");
    expect(getTableColumns(reportFiles).userId.name).toBe("user_id");
    expect(getTableColumns(reportFiles).storageRef.name).toBe("storage_path");
    expect(getTableColumns(reportConsentSnapshots).userId.name).toBe("user_id");
    expect(getTableColumns(reportConsentSnapshots).consentJson.name).toBe("consent_snapshot");
  });

  it("uses JSONB scope and canonical ownership/storage for exports", () => {
    expect(getTableColumns(exportRequests).scope.dataType).toBe("json");
    expect(getTableColumns(exportFiles).userId.name).toBe("user_id");
    expect(getTableColumns(exportFiles).storageRef.name).toBe("storage_path");
  });
});
