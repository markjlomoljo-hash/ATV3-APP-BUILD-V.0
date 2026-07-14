export type DatabaseFailureReason =
  | "database_auth_failed"
  | "database_dns_failed"
  | "database_timeout"
  | "database_connection_refused"
  | "database_ssl_failed"
  | "database_query_failed";

type DatabaseErrorLike = {
  code?: unknown;
  message?: unknown;
};

function errorLike(error: unknown): DatabaseErrorLike {
  if (typeof error === "object" && error !== null) {
    return error as DatabaseErrorLike;
  }

  return { message: typeof error === "string" ? error : undefined };
}

export function classifyDatabaseFailure(error: unknown): DatabaseFailureReason {
  const candidate = errorLike(error);
  const code = typeof candidate.code === "string" ? candidate.code.toUpperCase() : "";
  const message = typeof candidate.message === "string" ? candidate.message.toLowerCase() : "";

  if (["28P01", "28000"].includes(code) || message.includes("password authentication failed")) {
    return "database_auth_failed";
  }

  if (["ENOTFOUND", "EAI_AGAIN"].includes(code) || message.includes("getaddrinfo")) {
    return "database_dns_failed";
  }

  if (code === "ETIMEDOUT" || message.includes("timeout") || message.includes("timed out")) {
    return "database_timeout";
  }

  if (code === "ECONNREFUSED" || message.includes("connection refused")) {
    return "database_connection_refused";
  }

  if (message.includes("ssl") || message.includes("tls")) {
    return "database_ssl_failed";
  }

  return "database_query_failed";
}
