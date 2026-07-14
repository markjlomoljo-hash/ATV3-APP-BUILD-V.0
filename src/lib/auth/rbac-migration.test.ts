import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const migration = readFileSync(resolve(process.cwd(), "supabase/migrations/20260713120000_clerk_rbac_admin_control_center.sql"), "utf8");

describe("Clerk RBAC database contract", () => {
  it("keeps Clerk text IDs separate from Supabase auth UUIDs", () => {
    expect(migration).toContain("clerk_user_id text primary key");
    expect(migration).toContain("supabase_user_id uuid unique references auth.users(id)");
    expect(migration).not.toMatch(/clerk_user_id\s+uuid/i);
  });

  it("makes privileged audit history append-only", () => {
    expect(migration).toContain("create trigger audit_logs_append_only");
    expect(migration).toContain("before update or delete on public.audit_logs");
    expect(migration).toContain("revoke insert, update, delete on public.audit_logs from anon, authenticated");
    expect(migration).toContain("revoke all on function private.prevent_admin_audit_mutation() from public, anon, authenticated");
  });

  it("requires scoped expiring break-glass sessions", () => {
    expect(migration).toContain("scope text not null check");
    expect(migration).toContain("reason text not null");
    expect(migration).toContain("case_id text not null");
    expect(migration).toContain("expires_at timestamptz not null");
    expect(migration).toContain("where revoked_at is null");
  });

  it("enables RLS and excludes browser roles from RBAC tables", () => {
    expect(migration).toContain("alter table public.clerk_identity_map enable row level security");
    expect(migration).toContain("alter table public.clerk_role_history enable row level security");
    expect(migration).toContain("alter table public.admin_break_glass_sessions enable row level security");
    expect(migration).toContain("revoke all on public.clerk_identity_map, public.clerk_role_history, public.admin_break_glass_sessions from anon, authenticated");
  });
});
