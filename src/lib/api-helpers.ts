import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { AuthError } from "@/lib/auth";

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

export function jsonError(status: number, message: string, details?: unknown) {
  return NextResponse.json({ ok: false, error: message, details }, { status });
}

export function jsonOk<T extends object>(data: T, init?: number) {
  return NextResponse.json({ ok: true, ...data }, { status: init ?? 200 });
}

export async function withApiHandler(fn: () => Promise<Response>): Promise<Response> {
  try {
    return await fn();
  } catch (err) {
    if (err instanceof AuthError) {
      return jsonError(401, "Authentication required.");
    }
    if (err instanceof ApiError) {
      return jsonError(err.status, err.message);
    }
    if (err instanceof ZodError) {
      return jsonError(422, "Validation failed.", err.flatten());
    }
    console.error("[api] unhandled error", err);
    return jsonError(500, "Unexpected server error.");
  }
}
