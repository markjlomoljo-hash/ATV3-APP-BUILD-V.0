import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

export const dynamic = "force-dynamic";

const PredictPayloadSchema = z.record(z.string(), z.unknown());

export async function POST(request: NextRequest) {
  const mlBaseUrl =
    process.env.ACNETREX_ML_API_URL ||
    process.env.NEXT_PUBLIC_ACNETREX_ML_API_URL;

  if (!mlBaseUrl) {
    return NextResponse.json(
      { ok: false, error: "ml_api_url_not_configured" },
      { status: 503 },
    );
  }

  const body = await request.json();
  const parsed = PredictPayloadSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: "invalid_prediction_payload", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  try {
    const response = await fetch(`${mlBaseUrl.replace(/\/$/, "")}/predict`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(parsed.data),
      cache: "no-store",
    });

    const contentType = response.headers.get("content-type") || "";
    const payload = contentType.includes("application/json")
      ? await response.json()
      : { ok: false, error: await response.text() };

    return NextResponse.json(payload, { status: response.status });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: "ml_api_unreachable",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 503 },
    );
  }
}
