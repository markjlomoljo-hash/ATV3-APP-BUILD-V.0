import { describe, expect, it } from "vitest";
import {
  DatabaseTlsConfigurationError,
  buildDatabasePoolConfig,
  isDatabaseTlsConfigurationError,
} from "./index";

const databaseUrl =
  "postgresql://postgres.example:password@pooler.example.com:6543/postgres?sslmode=verify-full&application_name=acnetrex";
const caCertificate = [
  "-----BEGIN CERTIFICATE-----",
  "test-certificate-data",
  "-----END CERTIFICATE-----",
].join("\n");

describe("buildDatabasePoolConfig", () => {
  it("preserves the supplied URI when no explicit CA is configured", () => {
    const config = buildDatabasePoolConfig(databaseUrl);

    expect(config.connectionString).toBe(databaseUrl);
    expect(config.ssl).toBeUndefined();
    expect(config.connectionTimeoutMillis).toBe(5_000);
    expect(config.max).toBe(5);
  });

  it("uses the explicit CA with strict verification and removes conflicting SSL parameters", () => {
    const config = buildDatabasePoolConfig(databaseUrl, caCertificate.replace(/\n/g, "\\n"));
    const parsed = new URL(String(config.connectionString));

    expect(parsed.searchParams.get("sslmode")).toBeNull();
    expect(parsed.searchParams.get("application_name")).toBe("acnetrex");
    expect(config.ssl).toEqual({ ca: caCertificate, rejectUnauthorized: true });
  });

  it("rejects a malformed CA instead of disabling TLS verification", () => {
    try {
      buildDatabasePoolConfig(databaseUrl, "not-a-certificate");
      throw new Error("expected malformed certificate to fail");
    } catch (error) {
      expect(error).toBeInstanceOf(DatabaseTlsConfigurationError);
      expect(isDatabaseTlsConfigurationError(error)).toBe(true);
    }
  });
});
