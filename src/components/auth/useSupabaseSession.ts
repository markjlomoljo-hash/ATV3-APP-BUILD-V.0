"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  isSupabaseWebAuthConfigured,
  sessionSnapshot,
  type SupabaseSessionSnapshot,
} from "@/lib/supabase-web-auth";

export type SupabaseSessionState =
  | { status: "loading" }
  | { status: "not_configured" }
  | { status: "signed_out" }
  | ({ status: "signed_in" } & SupabaseSessionSnapshot);

/**
 * Session-aware UI state for the user-facing Supabase auth flow.
 *
 * Reads the same browser client the acnetrex workflow panels call
 * `supabase.auth.getSession()` on, and subscribes to auth state changes so
 * sign-in/sign-out is reflected without a reload. Fails closed to
 * `not_configured` when the NEXT_PUBLIC_SUPABASE_* env is absent — the client
 * proxy would throw on first access, so it is never touched in that case.
 */
export function useSupabaseSession(): SupabaseSessionState {
  const [state, setState] = useState<SupabaseSessionState>({ status: "loading" });

  useEffect(() => {
    let active = true;
    let subscription: { unsubscribe: () => void } | undefined;

    const apply = (session: Parameters<typeof sessionSnapshot>[0]) => {
      if (!active) return;
      const snapshot = sessionSnapshot(session);
      setState(snapshot ? { status: "signed_in", ...snapshot } : { status: "signed_out" });
    };

    async function initialize() {
      if (!isSupabaseWebAuthConfigured()) {
        if (active) setState({ status: "not_configured" });
        return;
      }
      try {
        const { data } = await supabase.auth.getSession();
        apply(data.session);
        const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
          apply(session);
        });
        // The component may unmount while getSession() is awaited, in which
        // case cleanup already ran with `subscription` undefined. Tear the
        // just-created listener down immediately instead of leaking it.
        if (!active) {
          listener.subscription.unsubscribe();
          return;
        }
        subscription = listener.subscription;
      } catch {
        // The browser client refuses to initialize without valid public env.
        if (active) setState({ status: "not_configured" });
      }
    }

    // Deferred like the acnetrex panels' initial load to keep effects passive.
    const timer = window.setTimeout(() => void initialize(), 0);

    return () => {
      active = false;
      window.clearTimeout(timer);
      subscription?.unsubscribe();
    };
  }, []);

  return state;
}
