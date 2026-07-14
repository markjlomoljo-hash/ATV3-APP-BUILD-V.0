import * as Crypto from "expo-crypto";

import { apiMutation } from "./api";
import { createMobileMlCoordinator, type MobileMlJobRequest } from "./ml-coordinator";
import { openExpoOfflineOperationStore } from "./ml-offline-store";

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

export type { MobileMlJobRequest };
