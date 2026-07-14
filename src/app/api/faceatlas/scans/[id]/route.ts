import { NextResponse } from "next/server";
import { z } from "zod";
import { DatabaseConfigurationError } from "@/db";
import { authenticateSupabaseRequest } from "@/lib/supabase-request-auth";
import { classifyDatabaseFailure } from "@/lib/acnetrex/services/database-error-classifier";
import { FaceAtlasScanNotFoundError, getFaceAtlasScan } from "@/lib/acnetrex/faceatlas/scans";

export const dynamic = "force-dynamic";
const idSchema = z.string().uuid();

function jsonError(error: string, status: number) {
  return NextResponse.json({ ok: false, error }, { status });
}

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await authenticateSupabaseRequest(_request);
  if (!auth.ok) return jsonError(auth.error, auth.status);
  const { id } = await context.params;
  if (!idSchema.safeParse(id).success) return jsonError("invalid_scan_id", 400);
  try {
    const result = await getFaceAtlasScan(auth.userId, id);
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    if (error instanceof FaceAtlasScanNotFoundError) return jsonError("faceatlas_scan_not_found", 404);
    if (error instanceof DatabaseConfigurationError) return jsonError("database_unavailable", 503);
    return jsonError(classifyDatabaseFailure(error), 503);
  }
}
