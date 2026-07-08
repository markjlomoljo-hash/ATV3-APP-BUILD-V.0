import { NextRequest, NextResponse } from "next/server";
import { and, desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { products } from "@/db/schema";
import { requireAuth } from "@/lib/auth";
import { parseJsonBody, withErrorHandling } from "@/lib/http";
import { createProductSchema } from "@/lib/validation/products";
import { writeAuditLog } from "@/lib/audit";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  return withErrorHandling(async () => {
    const auth = await requireAuth(req);
    if ("error" in auth) return auth.error;

    const rows = await db
      .select()
      .from(products)
      .where(and(eq(products.userId, auth.ctx.user.id), eq(products.isActive, true)))
      .orderBy(desc(products.createdAt));

    return NextResponse.json({ products: rows });
  });
}

export async function POST(req: NextRequest) {
  return withErrorHandling(async () => {
    const auth = await requireAuth(req);
    if ("error" in auth) return auth.error;
    const userId = auth.ctx.user.id;

    const parsed = await parseJsonBody(req, createProductSchema);
    if ("error" in parsed) return parsed.error;

    const [product] = await db
      .insert(products)
      .values({ userId, ...parsed.data })
      .returning();

    await writeAuditLog({ userId, action: "product.created", resourceType: "product", resourceId: product.id });

    return NextResponse.json({ product }, { status: 201 });
  });
}
