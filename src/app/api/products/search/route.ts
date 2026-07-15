/**
 * GET /api/products/search
 *
 * Searches the products catalog for FormulaLens.
 * Supports ?q=name&barcode=xxx&limit=N query params.
 * Zero-fabrication: returns only real products from the database.
 */
import { NextResponse } from "next/server";
import { authenticateSupabaseRequest } from "@/lib/supabase-request-auth";
import { classifyDatabaseFailure } from "@/lib/acnetrex/services/database-error-classifier";
import { DatabaseConfigurationError, getPool } from "@/db";

export const dynamic = "force-dynamic";

function jsonError(error: string, status: number) {
  return NextResponse.json({ ok: false, error }, { status });
}

export async function GET(request: Request) {
  const auth = await authenticateSupabaseRequest(request);
  if (!auth.ok) return jsonError(auth.error, auth.status);

  const url = new URL(request.url);
  const q = url.searchParams.get("q")?.trim() ?? "";
  const barcode = url.searchParams.get("barcode")?.trim() ?? "";
  const limit = Math.min(parseInt(url.searchParams.get("limit") ?? "20", 10), 50);

  // Sanitize inputs — no SQL injection possible with parameterized queries
  if (q.length > 200) return jsonError("query_too_long", 400);
  if (barcode.length > 64) return jsonError("barcode_too_long", 400);

  try {
    const pool = getPool();
    const client = await pool.connect();
    try {
      let queryText: string;
      let queryParams: unknown[];

      if (barcode) {
        queryText = `SELECT id, name, brand, barcode, category, acne_risk_score, comodogenic_rating, created_at
                       FROM public.products
                      WHERE barcode = $1
                      LIMIT $2`;
        queryParams = [barcode, limit];
      } else if (q) {
        queryText = `SELECT id, name, brand, barcode, category, acne_risk_score, comodogenic_rating, created_at
                       FROM public.products
                      WHERE name ILIKE $1 OR brand ILIKE $1
                      LIMIT $2`;
        queryParams = [`%${q}%`, limit];
      } else {
        queryText = `SELECT id, name, brand, barcode, category, acne_risk_score, comodogenic_rating, created_at
                       FROM public.products
                      ORDER BY created_at DESC
                      LIMIT $1`;
        queryParams = [limit];
      }

      const { rows } = await client.query(queryText, queryParams);

      return NextResponse.json({
        ok: true,
        products: rows,
        query: q || barcode || null,
      });
    } finally {
      client.release();
    }
  } catch (error) {
    if (error instanceof DatabaseConfigurationError) {
      return NextResponse.json({ ok: true, products: [], query: null });
    }
    return jsonError(classifyDatabaseFailure(error), 503);
  }
}
