import { NextRequest, NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { products, formulaLensAnalyses } from "@/db/schema";
import { requireAuth } from "@/lib/auth";
import { notFound, withErrorHandling } from "@/lib/http";
import { enqueueJob } from "@/lib/jobs";
import { writeAuditLog } from "@/lib/audit";

export const dynamic = "force-dynamic";

/**
 * Kicks off a FormulaLens ingredient analysis job. This endpoint never
 * fabricates ingredient risk findings — it only records that analysis was
 * requested. The job stays "queued"/"insufficient_data" until a real
 * analysis pipeline is configured and completes it.
 */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return withErrorHandling(async () => {
    const auth = await requireAuth(req);
    if ("error" in auth) return auth.error;
    const userId = auth.ctx.user.id;
    const { id } = await params;

    const [product] = await db
      .select()
      .from(products)
      .where(and(eq(products.id, id), eq(products.userId, userId)))
      .limit(1);
    if (!product) return notFound("Product");

    const hasIngredients = Boolean(
      product.ingredientListRaw || (Array.isArray(product.ingredientList) && product.ingredientList.length > 0),
    );

    const [analysis] = await db
      .insert(formulaLensAnalyses)
      .values({
        userId,
        productId: id,
        status: hasIngredients ? "queued" : "insufficient_data",
        findings: null,
      })
      .returning();

    if (hasIngredients) {
      await enqueueJob("ocr_product_analysis", { productId: id, analysisId: analysis.id }, { userId });
    }

    await writeAuditLog({ userId, action: "formula_lens.analysis_requested", resourceType: "formula_lens_analysis", resourceId: analysis.id });

    return NextResponse.json({ analysis }, { status: 202 });
  });
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return withErrorHandling(async () => {
    const auth = await requireAuth(req);
    if ("error" in auth) return auth.error;
    const userId = auth.ctx.user.id;
    const { id } = await params;

    const rows = await db
      .select()
      .from(formulaLensAnalyses)
      .where(and(eq(formulaLensAnalyses.productId, id), eq(formulaLensAnalyses.userId, userId)));

    return NextResponse.json({ analyses: rows });
  });
}
