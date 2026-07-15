import type { PoolClient } from "pg";
import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import {
  DeletionActionError,
  boundedDeletionRetrySeconds,
  claimNextDeletionJob,
  deletionStepsForRequestType,
  processClaimedDeletionJob,
  type ClaimedDeletionJob,
} from "@/lib/acnetrex/deletion-worker";

const job: ClaimedDeletionJob = {
  jobId: "11111111-1111-4111-8111-111111111111",
  requestId: "22222222-2222-4222-8222-222222222222",
  outboxId: "33333333-3333-4333-8333-333333333333",
  userId: "44444444-4444-4444-8444-444444444444",
  tombstoneId: "55555555-5555-4555-8555-555555555555",
  requestType: "account",
  targetTable: null,
  targetId: null,
  currentStep: "revoke_identity",
  completedSteps: [],
  attemptCount: 1,
  maxAttempts: 10,
  leaseOwner: "deletion-worker-a",
};

function normalized(text: string) {
  return text.replace(/\s+/g, " ").trim().toLowerCase();
}

function clientWith(handler: (text: string, values?: unknown[]) => unknown) {
  const query = vi.fn(async (text: string, values?: unknown[]) => handler(text, values));
  return { query } as unknown as PoolClient & { query: typeof query };
}

describe("deletion delivery worker", () => {
  it("uses a bounded request-type-specific checkpoint plan", () => {
    expect(deletionStepsForRequestType("record")).toEqual(["erase_data"]);
    expect(deletionStepsForRequestType("face_images")).toEqual(["delete_media", "erase_data"]);
    expect(deletionStepsForRequestType("all_health_data")).toEqual(["delete_media", "erase_data"]);
    expect(deletionStepsForRequestType("account")).toEqual([
      "revoke_identity",
      "delete_media",
      "erase_data",
      "delete_auth_identity",
    ]);
    expect(boundedDeletionRetrySeconds(1)).toBeGreaterThanOrEqual(1);
    expect(boundedDeletionRetrySeconds(100)).toBeLessThanOrEqual(3_600);
  });

  it("claims due work with SKIP LOCKED and lease fencing", async () => {
    const client = clientWith((text) => {
      const sql = normalized(text);
      if (sql.includes("with candidate as") && sql.includes("for update of j, o skip locked")) {
        return { rows: [job], rowCount: 1 };
      }
      return { rows: [], rowCount: 1 };
    });

    const claimed = await claimNextDeletionJob(client, "deletion-worker-a");

    expect(claimed).toEqual(job);
    expect(client.query.mock.calls.some(([text]) => normalized(text).includes("for update of j, o skip locked"))).toBe(true);
    expect(client.query.mock.calls.some(([text]) => normalized(text).includes("lease_expires_at=now()+interval '2 minutes'"))).toBe(true);
  });

  it("fails closed as blocked when an owner-controlled action is not configured", async () => {
    const client = clientWith(() => ({ rows: [], rowCount: 1 }));

    const outcome = await processClaimedDeletionJob(client, job, {});

    expect(outcome).toMatchObject({
      status: "blocked",
      reason: "deletion_revoke_identity_not_configured",
    });
    const statements = client.query.mock.calls.map(([text]) => normalized(text));
    expect(client.query.mock.calls.some(([text, values]) =>
      normalized(text).startsWith("update public.deletion_jobs") && values?.includes("blocked"))).toBe(true);
    expect(client.query.mock.calls.some(([, values]) => values?.includes("completed"))).toBe(false);
    expect(statements.some((text) => text.startsWith("insert into public.deletion_audit_events"))).toBe(true);
  });

  it("checkpoints one successful external action and requeues the next step", async () => {
    const revokeIdentity = vi.fn().mockResolvedValue(undefined);
    const client = clientWith(() => ({ rows: [], rowCount: 1 }));

    const outcome = await processClaimedDeletionJob(client, job, { revokeIdentity });

    expect(revokeIdentity).toHaveBeenCalledWith(expect.objectContaining({
      actorId: job.userId,
      tombstoneId: job.tombstoneId,
      requestType: "account",
    }));
    expect(outcome).toMatchObject({ status: "step_completed", step: "revoke_identity", nextStep: "delete_media" });
    const updates = client.query.mock.calls.map(([text]) => normalized(text));
    expect(updates.some((text) => text.includes("completed_steps=completed_steps || $4::jsonb"))).toBe(true);
    expect(updates.some((text) => text.includes("where id=$1::uuid and lease_owner=$2 and status='leased'"))).toBe(true);
  });

  it("retries transient failures only up to the persisted attempt bound", async () => {
    const client = clientWith(() => ({ rows: [], rowCount: 1 }));

    const outcome = await processClaimedDeletionJob(client, { ...job, attemptCount: 3 }, {
      revokeIdentity: async () => {
        throw new DeletionActionError("identity_provider_timeout", true);
      },
    });

    expect(outcome).toMatchObject({ status: "retry_scheduled", reason: "identity_provider_timeout" });
    expect(client.query.mock.calls.some(([text, values]) =>
      normalized(text).startsWith("update public.outbox_events")
      && values?.includes("failed_retryable"))).toBe(true);
    expect(client.query.mock.calls.some(([text]) =>
      normalized(text).includes("next_attempt_at=case")
      && normalized(text).includes("interval '1 second'"))).toBe(true);
  });

  it("does not claim completion after losing its lease", async () => {
    const client = clientWith((text) => {
      const sql = normalized(text);
      if (sql.startsWith("update public.deletion_jobs")) return { rows: [], rowCount: 0 };
      return { rows: [], rowCount: 1 };
    });

    const outcome = await processClaimedDeletionJob(client, job, {
      revokeIdentity: vi.fn().mockResolvedValue(undefined),
    });

    expect(outcome).toEqual({ status: "lease_lost", jobId: job.jobId, requestId: job.requestId });
  });
});
