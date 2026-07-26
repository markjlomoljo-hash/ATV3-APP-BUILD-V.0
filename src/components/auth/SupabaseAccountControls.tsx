"use client";

import Link from "next/link";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { performSignOut } from "@/lib/supabase-web-auth";
import { useSupabaseSession } from "./useSupabaseSession";

/**
 * Session-aware controls for the Supabase app account (the identity the
 * acnetrex data APIs authorize against). Rendered alongside the Clerk
 * controls — Clerk stays in charge of admin/RBAC pages; this is deliberate
 * dual auth, not a replacement.
 */
export function SupabaseAccountControls() {
  const session = useSupabaseSession();
  const [signingOut, setSigningOut] = useState(false);
  const [signOutError, setSignOutError] = useState<string | null>(null);

  if (session.status === "loading") {
    return <span className="text-xs text-slate-500">Checking app session...</span>;
  }

  if (session.status === "not_configured") {
    return <span className="text-xs text-slate-500">App sign-in not configured</span>;
  }

  if (session.status === "signed_out") {
    return (
      <div className="flex items-center gap-2">
        <Link
          href="/auth/sign-in"
          className="rounded-md border border-slate-300 px-3 py-1.5 text-sm font-semibold text-slate-700 hover:border-slate-500"
        >
          App sign in
        </Link>
        <Link
          href="/auth/sign-up"
          className="rounded-md border border-slate-300 px-3 py-1.5 text-sm font-semibold text-slate-700 hover:border-slate-500"
        >
          Create app account
        </Link>
      </div>
    );
  }

  async function handleSignOut() {
    if (signingOut) return;
    setSigningOut(true);
    setSignOutError(null);
    const result = await performSignOut(supabase.auth);
    setSigningOut(false);
    if (result.status !== "signed_out") {
      setSignOutError("Sign out failed. You may still be signed in.");
    }
  }

  return (
    <div className="flex items-center gap-2">
      <span className="max-w-[16rem] truncate text-xs text-slate-600" title={session.email ?? session.userId}>
        {session.email ?? "Signed in"}
      </span>
      <button
        type="button"
        onClick={() => void handleSignOut()}
        disabled={signingOut}
        className="rounded-md border border-slate-300 px-3 py-1.5 text-sm font-semibold text-slate-700 hover:border-slate-500 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {signingOut ? "Signing out..." : "Sign out"}
      </button>
      {signOutError ? <span className="text-xs text-red-700">{signOutError}</span> : null}
    </div>
  );
}
