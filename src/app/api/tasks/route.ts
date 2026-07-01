import { NextRequest, NextResponse } from "next/server";
import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { tasks } from "@/db/schema";
import { requireAuth } from "@/lib/auth";
import { parseJsonBody, withErrorHandling } from "@/lib/http";
import { createTaskSchema } from "@/lib/validation/gamification";
import { writeAuditLog } from "@/lib/audit";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  return withErrorHandling(async () => {
    const auth = await requireAuth(req);
    if ("error" in auth) return auth.error;

    const rows = await db
      .select()
      .from(tasks)
      .where(eq(tasks.userId, auth.ctx.user.id))
      .orderBy(desc(tasks.createdAt));

    return NextResponse.json({ tasks: rows });
  });
}

export async function POST(req: NextRequest) {
  return withErrorHandling(async () => {
    const auth = await requireAuth(req);
    if ("error" in auth) return auth.error;
    const userId = auth.ctx.user.id;

    const parsed = await parseJsonBody(req, createTaskSchema);
    if ("error" in parsed) return parsed.error;
    const { dueDate, ...rest } = parsed.data;

    const [task] = await db
      .insert(tasks)
      .values({ userId, ...rest, dueDate: dueDate ? new Date(dueDate) : undefined })
      .returning();

    await writeAuditLog({ userId, action: "task.created", resourceType: "task", resourceId: task.id });

    return NextResponse.json({ task }, { status: 201 });
  });
}
