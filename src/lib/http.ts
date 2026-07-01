import { NextResponse } from "next/server";
import type { ZodSchema } from "zod";
import { ZodError } from "zod";

/** Standard error envelope. Never leak stack traces or internal details. */
export function errorResponse(
  status: number,
  code: string,
  message: string,
  details?: unknown,
) {
  return NextResponse.json(
    { error: { code, message, details: details ?? null } },
    { status },
  );
}

export const unauthorized = () =>
  errorResponse(401, "unauthorized", "Authentication is required for this resource.");

export const forbidden = () =>
  errorResponse(403, "forbidden", "You do not have access to this resource.");

export const notFound = (resource = "Resource") =>
  errorResponse(404, "not_found", `${resource} was not found.`);

export const rateLimited = () =>
  errorResponse(429, "rate_limited", "Too many requests. Please try again later.");

export const serverError = () =>
  errorResponse(500, "server_error", "Something went wrong. Please try again.");

export async function parseJsonBody<T>(
  req: Request,
  schema: ZodSchema<T>,
): Promise<{ data: T } | { error: NextResponse }> {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return { error: errorResponse(400, "invalid_json", "Request body must be valid JSON.") };
  }

  const result = schema.safeParse(body);
  if (!result.success) {
    return {
      error: errorResponse(422, "validation_error", "Request body failed validation.", flatten(result.error)),
    };
  }
  return { data: result.data };
}

export function parseQuery<T>(
  searchParams: URLSearchParams,
  schema: ZodSchema<T>,
): { data: T } | { error: NextResponse } {
  const obj = Object.fromEntries(searchParams.entries());
  const result = schema.safeParse(obj);
  if (!result.success) {
    return {
      error: errorResponse(422, "validation_error", "Query parameters failed validation.", flatten(result.error)),
    };
  }
  return { data: result.data };
}

function flatten(error: ZodError) {
  return error.issues.map((issue) => ({
    path: issue.path.join("."),
    message: issue.message,
  }));
}

export function withErrorHandling(
  handler: () => Promise<NextResponse>,
): Promise<NextResponse> {
  return handler().catch((err) => {
    console.error("[api_error]", err);
    return serverError();
  });
}
