"use client";

import { FormEvent, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

type Conversation = {
  id: string;
  title: string | null;
  status: string;
  lastMessageAt: string | null;
};

type Message = {
  id: string;
  conversationId: string;
  role: "user" | "assistant" | "system" | "tool";
  content: string;
  createdAt: string;
};

type PanelState = "loading" | "ready" | "auth_required" | "consent_required" | "database_unavailable" | "not_configured";

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
      return "Messages are saved only after authenticated persistence succeeds. No assistant answer is generated here.";
  }
}

export function CutisAiConversationPanel() {
  const [state, setState] = useState<PanelState>("loading");
  const [conversationId, setConversationId] = useState<string | undefined>();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [draft, setDraft] = useState("");
  const [submitting, setSubmitting] = useState(false);

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
    };
  }, []);

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
    setConversationId(id);
    setMessages(payload?.messages ?? []);
    setState("ready");
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
  }

  return (
    <section className="rounded-lg border border-slate-200 bg-white p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.08em] text-slate-500">Durable conversation boundary</p>
          <h2 className="mt-2 text-xl font-semibold text-slate-950">Record a CutisAI question</h2>
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
          placeholder="Write a question for a future evidence-backed session"
          className="min-h-28 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-950 shadow-sm"
        />
        <button
          type="submit"
          disabled={submitting || !draft.trim() || state !== "ready"}
          className="rounded-md border border-slate-900 bg-slate-900 px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:border-slate-300 disabled:bg-slate-100 disabled:text-slate-500"
        >
          {submitting ? "Saving..." : "Save question"}
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
            {messages.length === 0 ? <p className="text-sm text-slate-600">Select a saved conversation or record a question.</p> : null}
            {messages.map((message) => (
              <div key={message.id} className="rounded-md border border-slate-200 bg-slate-50 p-3">
                <p className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">{message.role}</p>
                <p className="mt-1 whitespace-pre-wrap text-sm leading-6 text-slate-800">{message.content}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
