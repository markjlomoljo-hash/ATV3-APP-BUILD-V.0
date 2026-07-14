import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/**
 * Direct prediction bypassed the durable, owner-scoped job and outbox path.
 * Keep a stable compatibility response while clients migrate to /api/ml/jobs.
 */
export async function POST() {
  return NextResponse.json(
    {
      ok: false,
      error: "direct_ml_prediction_deprecated",
      replacement: "/api/ml/jobs",
    },
    { status: 410 },
  );
}
