import { NextRequest, NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { products } from "@/db/schema";
import { requireAuth } from "@/lib/auth";
import { notFound, parseJsonBody, withErrorHandling } from "@/lib/http";
import { updateProductSchema } from "@/lib/validation/products";
import { writeAuditLog } from "@/lib/audit";

export const dynamic = "force-dynamic";

async function loadOwned(userId: string, id: string) {
  const [row] = await db
    .select()
    .from(products)
    .where(and(eq(products.id, id), eq(products.userId, userId)))
    .limit(1);
  return row;
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return withErrorHandling(async () => {
    const auth = await requireAuth(req);
    if ("error" in auth) return auth.error;
    const { id } = await params;
    const product = await loadOwned(auth.ctx.user.id, id);
    if (!product) return notFound("Product");
    return NextResponse.json({ product });
  });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return withErrorHandling(async () => {
    const auth = await requireAuth(req);
    if ("error" in auth) return auth.error;
    const userId = auth.ctx.user.id;
    const { id } = await params;

    const existing = await loadOwned(userId, id);
    if (!existing) return notFound("Product");

    const parsed = await parseJsonBody(req, updateProductSchema);
    if ("error" in parsed) return parsed.error;

    const [product] = await db
      .update(products)
      .set({ ...parsed.data, updatedAt: new Date() })
      .where(eq(products.id, id))
      .returning();

    await writeAuditLog({ userId, action: "product.updated", resourceType: "product", resourceId: id });

    return NextResponse.json({ product });
  });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return withErrorHandling(async () => {
    const auth = await requireAuth(req);
    if ("error" in auth) return auth.error;
    const userId = auth.ctx.user.id;
    const { id } = await params;

    const existing = await loadOwned(userId, id);
    if (!existing) return notFound("Product");

    await db.update(products).set({ isActive: false, updatedAt: new Date() }).where(eq(products.id, id));

    await writeAuditLog({ userId, action: "product.deactivated", resourceType: "product", resourceId: id });

    return NextResponse.json({ ok: true });
  });
}
