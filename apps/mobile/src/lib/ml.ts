import * as Crypto from "expo-crypto";

import { apiFetch, apiMutation } from "./api";
import {
  createMobileMlCoordinator,
  replayMobileMlOperations,
  type MobileMlJobRequest,
  type MobileMlJobStatusResponse,
} from "@acnetrex/ml-local-runtime/mobile-job-coordinator";
import { openExpoOfflineOperationStore } from "./ml-offline-store";
import {
  cacheMlJobResult,
  forgetPendingMlJob,
  getLatestCachedMlJobResult,
  listPendingMlJobs,
  rememberPendingMlJob,
} from "./ml-job-cache";
import { supabase } from "./supabase";

type OperationIdentity = Readonly<{
  localOperationId: string;
  idempotencyKey: string;
  requestId: string;
}>;

function submitMlJob(request: MobileMlJobRequest, identity: OperationIdentity) {
  return apiMutation<{ jobId: string } & Record<string, unknown>, MobileMlJobRequest>(
    "POST",
    "/api/ml/jobs",
    {
      localOperationId: identity.localOperationId,
      idempotencyKey: identity.idempotencyKey,
      requestId: identity.requestId,
      payload: request,
      payloadSchemaVersion: "1",
      createdAt: new Date().toISOString(),
    },
  );
}

async function authenticatedUserId() {
  const { data } = await supabase.auth.getSession();
  const userId = data.session?.user.id;
  if (!userId) throw new Error("auth_required");
  return userId;
}

export const mobileMlCoordinator = createMobileMlCoordinator({
  createId: Crypto.randomUUID,
  queue: async (operation) => {
    const store = await openExpoOfflineOperationStore();
    await store.put(operation);
  },
  complete: async (localOperationId) => {
    const store = await openExpoOfflineOperationStore();
    await store.remove(localOperationId);
  },
  submit: submitMlJob,
  getJob: (jobId) => apiFetch<MobileMlJobStatusResponse>(`/api/ml/jobs/${encodeURIComponent(jobId)}`),
  rememberJob: async (jobId, requestId) => {
    await rememberPendingMlJob(await authenticatedUserId(), jobId, requestId);
  },
  cacheResult: async (response) => {
    await cacheMlJobResult(await authenticatedUserId(), response);
  },
  forgetJob: async (jobId) => {
    await forgetPendingMlJob(await authenticatedUserId(), jobId);
  },
});

export async function replayPendingMlOperations() {
  const store = await openExpoOfflineOperationStore();
  return replayMobileMlOperations({
    store,
    submit: submitMlJob,
    rememberJob: async (jobId, requestId) => {
      await rememberPendingMlJob(await authenticatedUserId(), jobId, requestId);
    },
  });
}

export async function resumePendingMlJobs() {
  const userId = await authenticatedUserId();
  const pending = await listPendingMlJobs(userId);
  const completed: MobileMlJobStatusResponse[] = [];
  for (const job of pending) {
    try {
      completed.push(await mobileMlCoordinator.waitForResult(job.job_id, {
        maxAttempts: 3,
        pollIntervalMs: 1_000,
      }));
    } catch {
      // The durable job reference remains cached for the next foreground/network pass.
    }
  }
  return completed;
}

export async function recoverPendingMlWork() {
  await replayPendingMlOperations();
  return resumePendingMlJobs();
}

export async function loadLatestCachedMlResult() {
  return getLatestCachedMlJobResult(await authenticatedUserId());
}

export async function loadSleepDermInputs() {
  const { data, error } = await supabase
    .from("sleep_logs")
    .select("id,log_date,sleep_time,wake_time")
    .order("log_date", { ascending: false })
    .limit(60);
  if (error) throw new Error("sleep_logs_unavailable");

  const rows = (data ?? []).filter((row) =>
    typeof row.id === "string"
    && typeof row.log_date === "string"
    && typeof row.sleep_time === "string"
    && typeof row.wake_time === "string");
  return {
    inputRecordRefs: rows.map((row) => ({ table: "sleep_logs", id: row.id as string })),
    features: {
      records: rows.map((row) => ({
        date: row.log_date,
        bedtime: row.sleep_time,
        wake_time: row.wake_time,
        target_minutes: 480,
      })),
    },
  };
}

export type { MobileMlJobRequest };
