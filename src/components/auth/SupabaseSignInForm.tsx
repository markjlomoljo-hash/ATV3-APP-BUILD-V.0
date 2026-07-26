"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  performPasswordSignIn,
  safeNextPath,
  type SignInFieldErrors,
} from "@/lib/supabase-web-auth";
import { SupabaseAuthNotConfigured } from "./SupabaseAuthNotConfigured";
import { useSupabaseSession } from "./useSupabaseSession";

export function SupabaseSignInForm({ nextPath }: { nextPath?: string }) {
  const router = useRouter();
  const session = useSupabaseSession();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fieldErrors, setFieldErrors] = useState<SignInFieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const destination = safeNextPath(nextPath ?? null);

  if (session.status === "not_configured") {
    return <SupabaseAuthNotConfigured />;
  }

  if (session.status === "signed_in") {
    return (
      <section className="rounded-lg border border-slate-200 bg-white p-5">
        <h1 className="text-2xl font-semibold text-slate-950">Already signed in</h1>
        <p className="mt-3 text-sm leading-6 text-slate-700">
          You are signed in{session.email ? ` as ${session.email}` : ""}. The acnetrex workflows
          use this session for personal data access.
        </p>
        <Link
          href={destination}
          className="mt-4 inline-block rounded-md border border-slate-900 bg-slate-900 px-4 py-2 text-sm font-semibold text-white"
        >
          Continue
        </Link>
      </section>
    );
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    setFormError(null);
    setFieldErrors({});
    const result = await performPasswordSignIn(supabase.auth, { email, password });
    setSubmitting(false);
    if (result.status === "invalid") {
      setFieldErrors(result.fieldErrors);
      return;
    }
    if (result.status === "auth_failed") {
      setFormError(result.message);
      return;
    }
    if (result.status === "request_failed") {
      setFormError("The sign-in request did not complete. You are not signed in. Try again later.");
      return;
    }
    router.replace(destination);
    router.refresh();
  }

  return (
    <section className="rounded-lg border border-slate-200 bg-white p-5">
      <p className="text-sm font-semibold uppercase tracking-[0.08em] text-slate-500">Welcome back</p>
      <h1 className="mt-2 text-2xl font-semibold text-slate-950">Sign in</h1>
      <p className="mt-3 text-sm leading-6 text-slate-700">
        Access your personal skin intelligence dashboard. This is the app account used by the
        acnetrex data workflows; admin access is managed separately.
      </p>

      <form onSubmit={onSubmit} className="mt-5 grid gap-4">
        <label className="grid gap-1 text-sm font-semibold" htmlFor="supabase-sign-in-email">
          Email address
          <input
            id="supabase-sign-in-email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className="rounded-md border border-slate-300 px-3 py-2 font-normal"
          />
          {fieldErrors.email ? <span className="text-xs font-normal text-red-700">{fieldErrors.email}</span> : null}
        </label>
        <label className="grid gap-1 text-sm font-semibold" htmlFor="supabase-sign-in-password">
          Password
          <input
            id="supabase-sign-in-password"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className="rounded-md border border-slate-300 px-3 py-2 font-normal"
          />
          {fieldErrors.password ? (
            <span className="text-xs font-normal text-red-700">{fieldErrors.password}</span>
          ) : null}
        </label>

        {formError ? (
          <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">{formError}</p>
        ) : null}

        <button
          type="submit"
          disabled={submitting}
          className="w-fit rounded-md border border-slate-900 bg-slate-900 px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:border-slate-300 disabled:bg-slate-100 disabled:text-slate-500"
        >
          {submitting ? "Signing in..." : "Sign in"}
        </button>
      </form>

      <p className="mt-6 border-t border-slate-200 pt-4 text-sm text-slate-700">
        Don&apos;t have an account?{" "}
        <Link href="/auth/sign-up" className="font-semibold text-slate-900 underline">
          Create one
        </Link>
      </p>
    </section>
  );
}
