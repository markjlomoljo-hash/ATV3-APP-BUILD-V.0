"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

type Conversation = {
  id: string;
  title: string | null;
  status: string;
  lastMessageAt: string | null;
};

type EvidenceRef = {
  source: "user_record" | "curated_content";
  table: string;
  id: string;
  summary: string;
};

type Message = {
  id: string;
  conversationId: string;
  role: "user" | "assistant" | "system" | "tool";
  content: string;
  runtimeMode?: string | null;
  modelName?: string | null;
  evidenceRefs?: unknown[];
  createdAt: string;
};

type PanelState = "loading" | "ready" | "auth_required" | "consent_required" | "database_unavailable" | "not_configured";

type AssistantState = "idle" | "queued" | "not_configured";

const CAPABILITY_DISCLAIMER =
  "Deterministic evidence tier: replies are assembled only from your saved records and the curated module reference. " +
  "No generative model is configured in this deployment, and CutisAI never provides medical diagnosis.";

async function accessToken(): Promise<string | null> {
  try {
    const { data } = await supabase.auth.getSession();
    return data.session?.access_token ?? null;
  } catch {
    return null;
  }
}

function statusCopy(state: PanelState): string {
  switch (state) {
    case "auth_required":
      return "Sign in to save a conversation.";
    case "consent_required":
      return "Personal learning consent is required before CutisAI can retain conversation history.";
    case "database_unavailable":
      return "Conversation persistence is temporarily unavailable. Nothing was saved.";
    case "not_configured":
      return "Supabase browser configuration is not available in this environment.";
    default:
      return CAPABILITY_DISCLAIMER;
  }
}

function parseEvidenceRefs(raw: unknown): EvidenceRef[] {
  if (!Array.isArray(raw)) return [];
  return raw.flatMap((item) => {
    if (typeof item !== "object" || item === null) return [];
    const record = item as Record<string, unknown>;
    if (
      (record.source === "user_record" || record.source === "curated_content") &&
      typeof record.table === "string" &&
      typeof record.id === "string" &&
      typeof record.summary === "string"
    ) {
      return [{ source: record.source, table: record.table, id: record.id, summary: record.summary }];
    }
    return [];
  });
}

function hasAssistantReplyAfter(messages: Message[], userMessageId: string): boolean {
  const userIndex = messages.findIndex((message) => message.id === userMessageId);
  if (userIndex === -1) return false;
  return messages.slice(userIndex + 1).some((message) => message.role === "assistant");
}

export function CutisAiConversationPanel() {
  const [state, setState] = useState<PanelState>("loading");
  const [conversationId, setConversationId] = useState<string | undefined>();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [draft, setDraft] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [assistantState, setAssistantState] = useState<AssistantState>("idle");
  const pollToken = useRef(0);

  useEffect(() => {
    let active = true;
    void (async () => {
      const token = await accessToken();
      if (!active) return;
      if (!token) {
        setState("auth_required");
        return;
      }
      const response = await fetch("/api/cutisai/conversations", {
        headers: { authorization: `Bearer ${token}` },
        cache: "no-store",
      }).catch(() => null);
      if (!active) return;
      if (!response) {
        setState("database_unavailable");
        return;
      }
      const payload = (await response.json().catch(() => null)) as { conversations?: Conversation[]; error?: string } | null;
      if (!response.ok) {
        setState(payload?.error === "consent_required" ? "consent_required" : response.status === 503 ? "database_unavailable" : "not_configured");
        return;
      }
      setConversations(payload?.conversations ?? []);
      setState("ready");
    })();
    return () => {
      active = false;
      pollToken.current += 1;
    };
  }, []);

  async function fetchConversationMessages(id: string): Promise<Message[] | null> {
    const token = await accessToken();
    if (!token) return null;
    const response = await fetch(`/api/cutisai/conversations/${id}`, {
      headers: { authorization: `Bearer ${token}` },
      cache: "no-store",
    }).catch(() => null);
    if (!response?.ok) return null;
    const payload = (await response.json().catch(() => null)) as { messages?: Message[] } | null;
    return payload?.messages ?? null;
  }

  async function loadConversation(id: string) {
    const token = await accessToken();
    if (!token) {
      setState("auth_required");
      return;
    }
    const response = await fetch(`/api/cutisai/conversations/${id}`, {
      headers: { authorization: `Bearer ${token}` },
      cache: "no-store",
    }).catch(() => null);
    if (!response) {
      setState("database_unavailable");
      return;
    }
    const payload = (await response.json().catch(() => null)) as { messages?: Message[]; error?: string } | null;
    if (!response.ok) {
      setState(payload?.error === "consent_required" ? "consent_required" : "database_unavailable");
      return;
    }
    pollToken.current += 1;
    setAssistantState("idle");
    setConversationId(id);
    setMessages(payload?.messages ?? []);
    setState("ready");
  }

  /**
   * Bounded reply polling: the worker generates the assistant message shortly
   * after the POST commits. If it has not appeared after the attempts budget,
   * the honest queued state remains — nothing is invented client-side.
   */
  async function pollForAssistantReply(id: string, userMessageId: string) {
    const token = (pollToken.current += 1);
    for (let attempt = 0; attempt < 6; attempt += 1) {
      await new Promise((resolve) => setTimeout(resolve, 1_500));
      if (pollToken.current !== token) return;
      const latest = await fetchConversationMessages(id);
      if (pollToken.current !== token) return;
      if (!latest) continue;
      setMessages(latest);
      if (hasAssistantReplyAfter(latest, userMessageId)) {
        setAssistantState("idle");
        return;
      }
    }
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const message = draft.trim();
    if (!message || submitting) return;
    setSubmitting(true);
    const token = await accessToken();
    if (!token) {
      setState("auth_required");
      setSubmitting(false);
      return;
    }
    const response = await fetch("/api/cutisai/conversations", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${token}`,
        "idempotency-key": `cutisai-${crypto.randomUUID()}`,
      },
      body: JSON.stringify({ conversationId, message, requestedTools: [] }),
    }).catch(() => null);
    const payload = (await response?.json().catch(() => null)) as {
      conversation?: Conversation;
      message?: Message;
      assistant?: { status?: string };
      error?: string;
    } | null;
    setSubmitting(false);
    if (!response?.ok || !payload?.conversation || !payload.message) {
      setState(payload?.error === "consent_required" ? "consent_required" : response?.status === 503 ? "database_unavailable" : "not_configured");
      return;
    }
    setConversationId(payload.conversation.id);
    setMessages((current) => [...current, payload.message!]);
    setConversations((current) => [payload.conversation!, ...current.filter((item) => item.id !== payload.conversation!.id)]);
    setDraft("");
    setState("ready");
    if (payload.assistant?.status === "queued") {
      setAssistantState("queued");
      void pollForAssistantReply(payload.conversation.id, payload.message.id);
    } else {
      setAssistantState("not_configured");
    }
  }

  return (
    <section className="rounded-lg border border-slate-200 bg-white p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.08em] text-slate-500">Evidence-grounded assistant</p>
          <h2 className="mt-2 text-xl font-semibold text-slate-950">Ask CutisAI about your saved records</h2>
        </div>
        <span className="rounded-md border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-700">{state}</span>
      </div>
      <p className="mt-3 text-sm leading-6 text-slate-700">{statusCopy(state)}</p>

      <form onSubmit={submit} className="mt-5 grid gap-3">
        <label htmlFor="cutisai-message" className="text-sm font-semibold text-slate-900">Question</label>
        <textarea
          id="cutisai-message"
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          maxLength={4000}
          placeholder="Ask about your streak, sleep or food logs, treatment check-ins, triggers, scans, or what a module does"
          className="min-h-28 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-950 shadow-sm"
        />
        <button
          type="submit"
          disabled={submitting || !draft.trim() || state !== "ready"}
          className="rounded-md border border-slate-900 bg-slate-900 px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:border-slate-300 disabled:bg-slate-100 disabled:text-slate-500"
        >
          {submitting ? "Saving..." : "Ask CutisAI"}
        </button>
      </form>

      <div className="mt-6 grid gap-4 md:grid-cols-[220px_1fr]">
        <div>
          <h3 className="text-sm font-semibold text-slate-900">Saved conversations</h3>
          <div className="mt-2 grid gap-2">
            {conversations.length === 0 ? <p className="text-sm text-slate-600">No saved conversations.</p> : null}
            {conversations.map((conversation) => (
              <button
                key={conversation.id}
                type="button"
                onClick={() => void loadConversation(conversation.id)}
                className="rounded-md border border-slate-200 px-3 py-2 text-left text-sm text-slate-700 hover:border-slate-400"
              >
                {conversation.title || "Untitled conversation"}
              </button>
            ))}
          </div>
        </div>
        <div>
          <h3 className="text-sm font-semibold text-slate-900">Conversation history</h3>
          <div className="mt-2 grid gap-2">
            {messages.length === 0 ? <p className="text-sm text-slate-600">Select a saved conversation or ask a question.</p> : null}
            {messages.map((message) => {
              const evidence = message.role === "assistant" ? parseEvidenceRefs(message.evidenceRefs) : [];
              return (
                <div key={message.id} className="rounded-md border border-slate-200 bg-slate-50 p-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">{message.role}</p>
                    {message.role === "assistant" && message.runtimeMode ? (
                      <span className="rounded border border-slate-300 bg-white px-2 py-0.5 text-[11px] font-semibold text-slate-600">
                        {message.runtimeMode}
                      </span>
                    ) : null}
                  </div>
                  <p className="mt-1 whitespace-pre-wrap text-sm leading-6 text-slate-800">{message.content}</p>
                  {message.role === "assistant" ? (
                    <div className="mt-2">
                      {evidence.length > 0 ? (
                        <div className="flex flex-wrap gap-1.5" data-testid="evidence-chips">
                          {evidence.map((ref) => (
                            <span
                              key={`${ref.table}:${ref.id}`}
                              title={ref.summary}
                              className={`rounded-full border px-2 py-0.5 text-[11px] font-medium ${
                                ref.source === "curated_content"
                                  ? "border-slate-300 bg-white text-slate-600"
                                  : "border-slate-400 bg-slate-100 text-slate-700"
                              }`}
                            >
                              {ref.source === "curated_content" ? "reference" : "record"} · {ref.table}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <p className="text-[11px] text-slate-500">No records cited — see the reply for the honest reason.</p>
                      )}
                    </div>
                  ) : null}
                </div>
              );
            })}
            {assistantState === "queued" ? (
              <div className="rounded-md border border-dashed border-slate-300 bg-white p-3">
                <p className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">assistant</p>
                <p className="mt-1 text-sm leading-6 text-slate-600">
                  Evidence reply queued. The deterministic tier is assembling an answer from your saved records; it will
                  appear here shortly (or on your next visit if generation is still pending).
                </p>
              </div>
            ) : null}
            {assistantState === "not_configured" ? (
              <div className="rounded-md border border-dashed border-slate-300 bg-white p-3">
                <p className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">assistant</p>
                <p className="mt-1 text-sm leading-6 text-slate-600">
                  The configured assistant provider is not available in this deployment, so no reply was queued. Your
                  question was saved.
                </p>
              </div>
            ) : null}
          </div>
          <p className="mt-4 text-xs leading-5 text-slate-500">{CAPABILITY_DISCLAIMER}</p>
        </div>
      </div>
    </section>
  );
}
