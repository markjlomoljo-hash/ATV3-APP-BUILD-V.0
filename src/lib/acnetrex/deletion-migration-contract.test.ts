import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const migrationPath = join(
  process.cwd(),
  "supabase",
  "migrations",
  "20260714150000_deletion_delivery_lifecycle.sql",
);

describe("deletion delivery migration contract", () => {
  it("preserves pseudonymized append-only audit evidence after request or auth deletion", () => {
    const sql = readFileSync(migrationPath, "utf8").toLowerCase();

    expect(sql).toContain("alter table public.deletion_audit_events alter column user_id drop not null");
    expect(sql).toContain("on delete set null");
    expect(sql).toContain("before update or delete on public.deletion_audit_events");
    expect(sql).toContain("deletion audit events are append-only");
    expect(sql).not.toMatch(/deletion_audit_events[\s\S]{0,220}on delete cascade/);
  });

  it("constrains active requests, leases, retries, and owner-only reads", () => {
    const sql = readFileSync(migrationPath, "utf8").toLowerCase();

    expect(sql).toContain("deletion_requests_one_active_user_idx");
    expect(sql).toContain("where user_id is not null and status in ('pending', 'scheduled', 'processing')");
    expect(sql).toContain("deletion_jobs_status_check");
    expect(sql).toContain("deletion_jobs_lease_state_check");
    expect(sql).toContain("attempt_count >= 0 and max_attempts between 1 and 100");
    expect(sql).toContain('create policy "owner deletion request read"');
    expect(sql).toContain('create policy "owner deletion job read"');
    expect(sql).not.toContain("for all to authenticated");
  });
});
