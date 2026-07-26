import * as Crypto from "expo-crypto";

import { apiMutation } from "./api";
import {
  createMobileMlCoordinator,
  type MobileMlJobRequest,
} from "@acnetrex/ml-local-runtime/mobile-job-coordinator";
import { scheduleRetry } from "../../../../packages/ml-local-runtime/src/offline-queue-contract";
import { openExpoOfflineOperationStore } from "./ml-offline-store";
import { isNetworkAvailable, isNetworkError } from "./network";

export const mobileMlCoordinator = createMobileMlCoordinator({
  createId: Crypto.randomUUID,
  queue: async (operation) => {
    const store = await openExpoOfflineOperationStore();
    await store.put(operation);
  },
  submit: (request, identity) => apiMutation(
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
  ),
});

const REPLAY_MAX_ATTEMPTS = 5;

/**
 * Replay ML jobs that were queued while offline. Runs on app foreground.
 * Each replay reuses the operation's original idempotency key and request id
 * (prepared at queue time), so the server never sees a duplicate job.
 * Operations are only removed after the server accepted them.
 */
export async function replayQueuedMlJobs(): Promise<{ replayed: number; remaining: number }> {
  if (!(await isNetworkAvailable())) return { replayed: 0, remaining: 0 };

  const store = await openExpoOfflineOperationStore();
  const ready = await store.listReady(new Date(), 10);
  let replayed = 0;

  for (const operation of ready) {
    try {
      await apiMutation(operation.method, operation.route, {
        localOperationId: operation.local_operation_id,
        idempotencyKey: operation.idempotency_key,
        requestId: operation.request_id,
        payload: operation.validated_payload,
        payloadSchemaVersion: operation.payload_schema_version,
        createdAt: operation.created_at,
      });
      await store.remove(operation.local_operation_id);
      replayed += 1;
    } catch (error) {
      const errorCode = error instanceof Error ? error.message : "replay_failed";
      // Honest holds: no API configured, no session, or still offline —
      // keep the operation untouched and try again on a later foreground.
      if (
        errorCode === "api_not_configured" ||
        errorCode === "auth_required" ||
        isNetworkError(error)
      ) {
        break;
      }
      await store.put(
        scheduleRetry(operation, {
          errorCode: errorCode.slice(0, 80),
          now: new Date().toISOString(),
          jitterRatio: Math.random(),
          maxAttempts: REPLAY_MAX_ATTEMPTS,
        }),
      );
    }
  }

  return { replayed, remaining: ready.length - replayed };
}

export type { MobileMlJobRequest };
