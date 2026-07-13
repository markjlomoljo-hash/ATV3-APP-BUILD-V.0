import { describe, expect, it } from "vitest";
import { classifyDatabaseFailure } from "./database-error-classifier";

describe("classifyDatabaseFailure", () => {
  it("classifies postgres authentication failures without exposing the message", () => {
    expect(
      classifyDatabaseFailure({
        code: "28P01",
        message: "password authentication failed for user app_user",
      }),
    ).toBe("database_auth_failed");
  });

  it("classifies DNS failures from node error codes", () => {
    expect(classifyDatabaseFailure({ code: "ENOTFOUND", message: "getaddrinfo ENOTFOUND db.example.com" })).toBe(
      "database_dns_failed",
    );
  });

  it("classifies timeout and connection refusal failures", () => {
    expect(classifyDatabaseFailure({ code: "ETIMEDOUT", message: "connect timed out" })).toBe(
      "database_timeout",
    );
    expect(classifyDatabaseFailure({ code: "ECONNREFUSED", message: "connect refused" })).toBe(
      "database_connection_refused",
    );
  });

  it("classifies SSL failures and unknown failures safely", () => {
    expect(classifyDatabaseFailure(new Error("SSL connection has been closed unexpectedly"))).toBe(
      "database_ssl_failed",
    );
    expect(classifyDatabaseFailure(new Error("query failed for postgres://user:password@example.com/db"))).toBe(
      "database_query_failed",
    );
  });
});
