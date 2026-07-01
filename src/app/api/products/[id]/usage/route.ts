import { NextRequest, NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { products, productUsageLogs } from "@/db/schema";
import { requireAuth } from "@/lib/auth";
import { notFound, parseJsonBody, withErrorHandling } from "@/lib/http";
import { productUsageSchema } from "@/lib/validation/products";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return withErrorHandling(async () => {
    const auth = await requireAuth(req);
    if ("error" in auth) return auth.error;
    const userId = auth.ctx.user.id;
    const { id } = await params;

    const [product] = await db
      .select({ id: products.id })
      .from(products)
      .where(and(eq(products.id, id), eq(products.userId, userId)))
      .limit(1);
    if (!product) return notFound("Product");

    const parsed = await parseJsonBody(req, productUsageSchema);
    if ("error" in parsed) return parsed.error;
    const { usedAt, ...rest } = parsed.data;

    const [usage] = await db
      .insert(productUsageLogs)
      .values({ productId: id, userId, usedAt: usedAt ? new Date(usedAt) : new Date(), ...rest })
      .returning();

    return NextResponse.json({ usage }, { status: 201 });
  });
}
