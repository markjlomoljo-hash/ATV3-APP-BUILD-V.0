"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  performPasswordSignUp,
  safeNextPath,
  type SignUpFieldErrors,
} from "@/lib/supabase-web-auth";
import { SupabaseAuthNotConfigured } from "./SupabaseAuthNotConfigured";
import { useSupabaseSession } from "./useSupabaseSession";

export function SupabaseSignUpForm({ nextPath }: { nextPath?: string }) {
  const router = useRouter();
  const session = useSupabaseSession();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [fieldErrors, setFieldErrors] = useState<SignUpFieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [confirmationRequired, setConfirmationRequired] = useState(false);

  const destination = safeNextPath(nextPath ?? null);

  if (session.status === "not_configured") {
    return <SupabaseAuthNotConfigured />;
  }

  if (confirmationRequired) {
    return (
      <section className="rounded-lg border border-slate-200 bg-white p-5">
        <h1 className="text-2xl font-semibold text-slate-950">Check your email</h1>
        <p className="mt-3 text-sm leading-6 text-slate-700">
          We sent a confirmation link to your email address. Click it to activate your account,
          then sign in. Your account is not active until the email is confirmed.
        </p>
        <Link
          href="/auth/sign-in"
          className="mt-4 inline-block rounded-md border border-slate-900 bg-slate-900 px-4 py-2 text-sm font-semibold text-white"
        >
          Back to sign in
        </Link>
      </section>
    );
  }

  if (session.status === "signed_in") {
    return (
      <section className="rounded-lg border border-slate-200 bg-white p-5">
        <h1 className="text-2xl font-semibold text-slate-950">Already signed in</h1>
        <p className="mt-3 text-sm leading-6 text-slate-700">
          You are signed in{session.email ? ` as ${session.email}` : ""}. Sign out first to create
          a different account.
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
    const emailRedirectTo =
      typeof window !== "undefined" ? `${window.location.origin}/auth/sign-in` : undefined;
    const result = await performPasswordSignUp(
      supabase.auth,
      { email, password, confirmPassword },
      emailRedirectTo ? { emailRedirectTo } : undefined,
    );
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
      setFormError(
        "The sign-up request did not complete. No account state was confirmed. Try again later.",
      );
      return;
    }
    if (result.status === "confirmation_required") {
      setConfirmationRequired(true);
      return;
    }
    router.replace(destination);
    router.refresh();
  }

  return (
    <section className="rounded-lg border border-slate-200 bg-white p-5">
      <p className="text-sm font-semibold uppercase tracking-[0.08em] text-slate-500">Get started</p>
      <h1 className="mt-2 text-2xl font-semibold text-slate-950">Create account</h1>
      <p className="mt-3 text-sm leading-6 text-slate-700">
        Your skin data is private and owned by you. AcneTrex does not share raw health data
        without your explicit consent.
      </p>

      <form onSubmit={onSubmit} className="mt-5 grid gap-4">
        <label className="grid gap-1 text-sm font-semibold" htmlFor="supabase-sign-up-email">
          Email address
          <input
            id="supabase-sign-up-email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className="rounded-md border border-slate-300 px-3 py-2 font-normal"
          />
          {fieldErrors.email ? <span className="text-xs font-normal text-red-700">{fieldErrors.email}</span> : null}
        </label>
        <label className="grid gap-1 text-sm font-semibold" htmlFor="supabase-sign-up-password">
          Password
          <input
            id="supabase-sign-up-password"
            type="password"
            autoComplete="new-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className="rounded-md border border-slate-300 px-3 py-2 font-normal"
          />
          {fieldErrors.password ? (
            <span className="text-xs font-normal text-red-700">{fieldErrors.password}</span>
          ) : null}
        </label>
        <label className="grid gap-1 text-sm font-semibold" htmlFor="supabase-sign-up-confirm-password">
          Confirm password
          <input
            id="supabase-sign-up-confirm-password"
            type="password"
            autoComplete="new-password"
            value={confirmPassword}
            onChange={(event) => setConfirmPassword(event.target.value)}
            className="rounded-md border border-slate-300 px-3 py-2 font-normal"
          />
          {fieldErrors.confirmPassword ? (
            <span className="text-xs font-normal text-red-700">{fieldErrors.confirmPassword}</span>
          ) : null}
        </label>

        {formError ? (
          <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">{formError}</p>
        ) : null}

        <p className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-xs leading-5 text-slate-700">
          By creating an account you acknowledge that AcneTrex is not a medical device and does
          not provide diagnoses or prescriptions.
        </p>

        <button
          type="submit"
          disabled={submitting}
          className="w-fit rounded-md border border-slate-900 bg-slate-900 px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:border-slate-300 disabled:bg-slate-100 disabled:text-slate-500"
        >
          {submitting ? "Creating account..." : "Create account"}
        </button>
      </form>

      <p className="mt-6 border-t border-slate-200 pt-4 text-sm text-slate-700">
        Already have an account?{" "}
        <Link href="/auth/sign-in" className="font-semibold text-slate-900 underline">
          Sign in
        </Link>
      </p>
    </section>
  );
}
