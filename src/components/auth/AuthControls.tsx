"use client";

import { SignInButton, SignUpButton, UserButton, useAuth, useUser } from "@clerk/nextjs";
import Link from "next/link";
import { normalizeRole } from "@/lib/auth/roles";

function AdminLink() {
  const { user } = useUser();
  const role = normalizeRole(user?.publicMetadata.role);
  if (role === "user") return null;
  return <Link href="/admin" className="rounded-md border border-slate-300 px-3 py-1.5 text-sm font-semibold text-slate-700 hover:border-slate-500">Admin</Link>;
}

export function AuthControls() {
  const { isLoaded, isSignedIn } = useAuth();

  return (
    <div className="border-b border-slate-200 bg-white px-4 py-3 md:px-8">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-3">
        <Link href="/" className="font-semibold text-slate-950">AcneTrex V3</Link>
        <div className="flex items-center gap-2">
          {isLoaded && !isSignedIn ? (
            <>
            <SignInButton mode="redirect"><button type="button" className="rounded-md border border-slate-300 px-3 py-1.5 text-sm font-semibold text-slate-700">Sign in</button></SignInButton>
            <SignUpButton mode="redirect"><button type="button" className="rounded-md bg-slate-900 px-3 py-1.5 text-sm font-semibold text-white">Create account</button></SignUpButton>
            </>
          ) : null}
          {isLoaded && isSignedIn ? (
            <>
            <AdminLink />
            <UserButton />
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
}
