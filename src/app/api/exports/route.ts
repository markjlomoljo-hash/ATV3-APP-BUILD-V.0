import { NextResponse } from "next/server";
import { withSession } from "@/lib/session";
import { exportRequestSchema } from "@/lib/validation";
import { createAndProcessExport } from "@/lib/exports/service";

export const dynamic = "force-dynamic";

export const POST = withSession(async (req, { userId }) => {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = exportRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: "Invalid payload", issues: parsed.error.issues }, { status: 400 });
  }

  const result = await createAndProcessExport(userId, parsed.data.format, parsed.data.scope);
  if (result.status === "failed") {
    return NextResponse.json(
      { ok: false, error: "export_generation_failed", ...result },
      { status: 500 },
    );
  }
  return NextResponse.json({ ok: true, ...result }, { status: 201 });
});
