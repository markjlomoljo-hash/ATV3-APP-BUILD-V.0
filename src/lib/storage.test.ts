import path from "path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const supabaseMocks = vi.hoisted(() => {
  const upload = vi.fn();
  const download = vi.fn();
  const remove = vi.fn();
  const from = vi.fn(() => ({ upload, download, remove }));
  return { upload, download, remove, from };
});

const fsMocks = vi.hoisted(() => ({
  mkdir: vi.fn(),
  readFile: vi.fn(),
  rm: vi.fn(),
  stat: vi.fn(),
  writeFile: vi.fn(),
}));

vi.mock("@/integrations/supabase/client.server", () => ({
  supabaseAdmin: { storage: { from: supabaseMocks.from } },
}));
vi.mock("fs/promises", () => fsMocks);

import {
  StorageBackendError,
  StorageObjectNotFoundError,
  buildExportStorageRef,
  buildReportStorageRef,
  deleteObject,
  getObject,
  putObject,
  resolvePrivateStoragePath,
  resolveStorageBackend,
  resolveSupabaseStorageLocation,
} from "./storage";

function configureSupabaseBackend() {
  process.env.ACNETREX_STORAGE_BACKEND = "supabase";
  process.env.SUPABASE_URL = "https://project.supabase.co";
  process.env.SUPABASE_SERVICE_ROLE_KEY = "test-placeholder-service-key";
}

beforeEach(() => {
  vi.clearAllMocks();
});

afterEach(() => {
  delete process.env.ACNETREX_STORAGE_BACKEND;
  delete process.env.SUPABASE_URL;
  delete process.env.SUPABASE_SERVICE_ROLE_KEY;
});

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

describe("storage backend selection", () => {
  it("defaults to the local filesystem backend when the env var is unset", async () => {
    fsMocks.stat.mockResolvedValue({ size: 9 });

    expect(resolveStorageBackend()).toBe("local");
    const result = await putObject(buildReportStorageRef("u1", "r1"), Buffer.from("pdf-bytes"));

    expect(result).toEqual({ sizeBytes: 9 });
    expect(fsMocks.writeFile).toHaveBeenCalledTimes(1);
    expect(String(fsMocks.writeFile.mock.calls[0][0])).toContain(".private-storage");
    expect(supabaseMocks.from).not.toHaveBeenCalled();
  });

  it("accepts an explicit local selection", () => {
    process.env.ACNETREX_STORAGE_BACKEND = "local";
    expect(resolveStorageBackend()).toBe("local");
  });

  it("fails closed on an unknown backend instead of writing to ephemeral disk", async () => {
    process.env.ACNETREX_STORAGE_BACKEND = "s3";

    await expect(putObject(buildReportStorageRef("u1", "r1"), Buffer.from("x"))).rejects.toMatchObject({
      name: "StorageBackendError",
      reason: "storage_backend_invalid",
    });
    await expect(getObject(buildReportStorageRef("u1", "r1"))).rejects.toMatchObject({
      reason: "storage_backend_invalid",
    });
    await expect(deleteObject(buildReportStorageRef("u1", "r1"))).rejects.toMatchObject({
      reason: "storage_backend_invalid",
    });
    expect(fsMocks.writeFile).not.toHaveBeenCalled();
    expect(supabaseMocks.from).not.toHaveBeenCalled();
  });

  it("fails closed when the supabase backend is selected without configuration", async () => {
    process.env.ACNETREX_STORAGE_BACKEND = "supabase";

    await expect(putObject(buildReportStorageRef("u1", "r1"), Buffer.from("x"))).rejects.toMatchObject({
      reason: "storage_not_configured",
    });
    expect(supabaseMocks.from).not.toHaveBeenCalled();
  });

  it("requires the service-role key, not just the project URL", async () => {
    process.env.ACNETREX_STORAGE_BACKEND = "supabase";
    process.env.SUPABASE_URL = "https://project.supabase.co";

    await expect(getObject(buildReportStorageRef("u1", "r1"))).rejects.toMatchObject({
      reason: "storage_not_configured",
    });
    expect(supabaseMocks.from).not.toHaveBeenCalled();
  });
});

describe("supabase storage reference mapping", () => {
  it("maps report refs into the private reports bucket under the owner's folder", () => {
    expect(resolveSupabaseStorageLocation(buildReportStorageRef("user-1", "req-1"))).toEqual({
      bucket: "reports",
      objectPath: "user-1/reports/req-1.pdf",
    });
  });

  it("maps export refs into the same bucket keyed by owner first", () => {
    expect(resolveSupabaseStorageLocation(buildExportStorageRef("user-1", "exp-1", "zip"))).toEqual({
      bucket: "reports",
      objectPath: "user-1/exports/exp-1.zip",
    });
  });

  it.each([
    "reports/../../etc/passwd",
    "/reports/u1/r1.pdf",
    "reports//r1.pdf",
    "c:/reports/u1/r1.pdf",
    "unknown-kind/u1/r1.pdf",
    "reports/u1",
    "",
  ])("rejects unsafe or unknown refs: %j", (storageRef) => {
    expect(() => resolveSupabaseStorageLocation(storageRef)).toThrow("invalid_storage_reference");
  });
});

describe("supabase upload", () => {
  beforeEach(configureSupabaseBackend);

  it("uploads report PDFs to the private bucket with the bucket-allowed content type", async () => {
    supabaseMocks.upload.mockResolvedValue({ data: { path: "u1/reports/r1.pdf" }, error: null });
    const buffer = Buffer.from("pdf!");

    const result = await putObject(buildReportStorageRef("u1", "r1"), buffer);

    expect(result).toEqual({ sizeBytes: buffer.byteLength });
    expect(supabaseMocks.from).toHaveBeenCalledWith("reports");
    expect(supabaseMocks.upload).toHaveBeenCalledWith("u1/reports/r1.pdf", buffer, {
      contentType: "application/pdf",
      upsert: true,
    });
    expect(fsMocks.writeFile).not.toHaveBeenCalled();
  });

  it("uploads zip exports with the zip content type", async () => {
    supabaseMocks.upload.mockResolvedValue({ data: { path: "u1/exports/e1.zip" }, error: null });

    await putObject(buildExportStorageRef("u1", "e1", "zip"), Buffer.from("zip"));

    expect(supabaseMocks.upload).toHaveBeenCalledWith("u1/exports/e1.zip", expect.any(Buffer), {
      contentType: "application/zip",
      upsert: true,
    });
  });

  it("fails closed for content types the bucket does not allow", async () => {
    await expect(putObject("reports/u1/r1.exe", Buffer.from("x"))).rejects.toThrow(
      "unsupported_storage_content_type",
    );
    expect(supabaseMocks.upload).not.toHaveBeenCalled();
  });

  it("reports a missing bucket as not configured", async () => {
    supabaseMocks.upload.mockResolvedValue({
      data: null,
      error: { message: "Bucket not found", statusCode: "404" },
    });

    await expect(putObject(buildReportStorageRef("u1", "r1"), Buffer.from("x"))).rejects.toMatchObject({
      reason: "storage_not_configured",
    });
  });

  it("surfaces other upload failures as storage_unavailable", async () => {
    supabaseMocks.upload.mockResolvedValue({
      data: null,
      error: { message: "service unavailable", statusCode: "503" },
    });

    await expect(putObject(buildReportStorageRef("u1", "r1"), Buffer.from("x"))).rejects.toMatchObject({
      reason: "storage_unavailable",
    });
  });
});

describe("supabase download", () => {
  beforeEach(configureSupabaseBackend);

  it("downloads the object bytes from the private bucket", async () => {
    const bytes = Buffer.from("report-pdf-bytes");
    supabaseMocks.download.mockResolvedValue({ data: new Blob([bytes]), error: null });

    const result = await getObject(buildReportStorageRef("u1", "r1"));

    expect(supabaseMocks.from).toHaveBeenCalledWith("reports");
    expect(supabaseMocks.download).toHaveBeenCalledWith("u1/reports/r1.pdf");
    expect(Buffer.isBuffer(result)).toBe(true);
    expect(result.equals(bytes)).toBe(true);
  });

  it("maps a missing object to the ENOENT contract callers already handle", async () => {
    supabaseMocks.download.mockResolvedValue({
      data: null,
      error: { message: "Object not found", status: 400, statusCode: "404" },
    });

    const failure = await getObject(buildReportStorageRef("u1", "missing")).then(
      () => null,
      (error: unknown) => error,
    );

    expect(failure).toBeInstanceOf(StorageObjectNotFoundError);
    expect(failure).toMatchObject({ code: "ENOENT" });
  });

  it("surfaces other download failures as storage_unavailable", async () => {
    supabaseMocks.download.mockResolvedValue({
      data: null,
      error: { message: "internal error", status: 500, statusCode: "500" },
    });

    const failure = await getObject(buildReportStorageRef("u1", "r1")).then(
      () => null,
      (error: unknown) => error,
    );

    expect(failure).toBeInstanceOf(StorageBackendError);
    expect(failure).toMatchObject({ reason: "storage_unavailable" });
  });
});

describe("supabase delete", () => {
  beforeEach(configureSupabaseBackend);

  it("removes the mapped object path", async () => {
    supabaseMocks.remove.mockResolvedValue({ data: [], error: null });

    await deleteObject(buildExportStorageRef("u1", "e1", "json"));

    expect(supabaseMocks.remove).toHaveBeenCalledWith(["u1/exports/e1.json"]);
  });

  it("surfaces delete failures as storage_unavailable", async () => {
    supabaseMocks.remove.mockResolvedValue({
      data: null,
      error: { message: "service unavailable", statusCode: "503" },
    });

    await expect(deleteObject(buildReportStorageRef("u1", "r1"))).rejects.toMatchObject({
      reason: "storage_unavailable",
    });
  });
});
