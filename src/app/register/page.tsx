"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { api } from "@/lib/client/api";

export default function RegisterPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [mealFrequencyBaseline, setMealFrequencyBaseline] = useState(3);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const router = useRouter();

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
      await api.register({ email, password, displayName: displayName || undefined, timezone, mealFrequencyBaseline });
      router.push("/tasks");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Registration failed.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="mx-auto mt-10 max-w-md rounded-3xl bg-white p-8 shadow-[0_24px_60px_rgba(16,24,40,0.08)]">
      <h1 className="text-2xl font-semibold text-slate-950">Create your account</h1>
      <p className="mt-2 text-sm text-slate-600">
        AcneTrex is non-diagnostic and never replaces dermatology care. Your data stays private and yours to export or delete.
      </p>
      <form onSubmit={onSubmit} className="mt-6 flex flex-col gap-4">
        <label className="flex flex-col gap-1 text-sm font-medium text-slate-700">
          Display name (optional)
          <input value={displayName} onChange={(e) => setDisplayName(e.target.value)} className="rounded-xl border border-slate-300 px-3 py-2" />
        </label>
        <label className="flex flex-col gap-1 text-sm font-medium text-slate-700">
          Email
          <input required type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="rounded-xl border border-slate-300 px-3 py-2" />
        </label>
        <label className="flex flex-col gap-1 text-sm font-medium text-slate-700">
          Password (min 8 characters)
          <input required minLength={8} type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="rounded-xl border border-slate-300 px-3 py-2" />
        </label>
        <label className="flex flex-col gap-1 text-sm font-medium text-slate-700">
          Usual meals per day
          <select value={mealFrequencyBaseline} onChange={(e) => setMealFrequencyBaseline(Number(e.target.value))} className="rounded-xl border border-slate-300 px-3 py-2">
            <option value={1}>1</option>
            <option value={2}>2</option>
            <option value={3}>3</option>
          </select>
        </label>
        {error && <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p>}
        <button disabled={busy} className="rounded-full bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60">
          {busy ? "Creating…" : "Create account"}
        </button>
      </form>
      <p className="mt-4 text-sm text-slate-600">
        Already have an account?{" "}
        <Link href="/login" className="font-semibold text-emerald-700">
          Log in
        </Link>
      </p>
    </section>
  );
}
