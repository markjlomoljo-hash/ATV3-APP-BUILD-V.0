import { NextResponse } from "next/server";
import { z } from "zod";
import { DatabaseConfigurationError } from "@/db";
import {
  CutisAiConsentRequiredError,
  CutisAiConversationNotFoundError,
  getCutisAiConversation,
} from "@/lib/acnetrex/memory/conversations";
import { classifyDatabaseFailure } from "@/lib/acnetrex/services/database-error-classifier";
import { authenticateSupabaseRequest } from "@/lib/supabase-request-auth";

export const dynamic = "force-dynamic";

const conversationIdSchema = z.string().uuid();

export async function GET(request: Request, routeContext: { params: Promise<{ id: string }> }) {
  const auth = await authenticateSupabaseRequest(request);
  if (!auth.ok) return NextResponse.json({ ok: false, error: auth.error }, { status: auth.status });

  const { id } = await routeContext.params;
  const parsedId = conversationIdSchema.safeParse(id);
  if (!parsedId.success) return NextResponse.json({ ok: false, error: "invalid_conversation_id" }, { status: 400 });

  try {
    const conversation = await getCutisAiConversation(auth.userId, parsedId.data);
    return NextResponse.json({ ok: true, ...conversation });
  } catch (error) {
    if (error instanceof CutisAiConsentRequiredError) {
      return NextResponse.json({ ok: false, error: "consent_required" }, { status: 403 });
    }
    if (error instanceof CutisAiConversationNotFoundError) {
      return NextResponse.json({ ok: false, error: "conversation_not_found" }, { status: 404 });
    }
    if (error instanceof DatabaseConfigurationError) {
      return NextResponse.json({ ok: false, error: "database_unavailable" }, { status: 503 });
    }
    return NextResponse.json({ ok: false, error: classifyDatabaseFailure(error) }, { status: 503 });
  }
}
