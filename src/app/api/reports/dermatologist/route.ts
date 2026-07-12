import { NextResponse } from "next/server";
import { withSession } from "@/lib/session";
import { reportRequestSchema } from "@/lib/validation";
import { createAndProcessReport } from "@/lib/reports/service";

export const dynamic = "force-dynamic";

export const POST = withSession(async (req, { userId }) => {
  let body: unknown = {};
  try {
    const text = await req.text();
    body = text ? JSON.parse(text) : {};
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = reportRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: "Invalid payload", issues: parsed.error.issues }, { status: 400 });
  }

  const result = await createAndProcessReport(
    userId,
    parsed.data.inclusionOptions,
    parsed.data.idempotencyKey,
  );

  if (result.status === "failed") {
    return NextResponse.json(
      { ok: false, error: "report_generation_failed", ...result },
      { status: 500 },
    );
  }
  return NextResponse.json({ ok: true, ...result }, { status: 201 });
});
