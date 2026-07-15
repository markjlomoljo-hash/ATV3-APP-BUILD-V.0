import {
  createSqliteOfflineOperationStore,
  type QueueDatabase,
} from "../../packages/ml-local-runtime/src/sqlite-operation-store";

import { openPrivateDatabase } from "./private-database";

export const createExpoOfflineOperationStore = createSqliteOfflineOperationStore;
export type { QueueDatabase };

export async function openExpoOfflineOperationStore() {
  const database = await openPrivateDatabase();
  const store = createSqliteOfflineOperationStore(database);
  await store.initialize();
  return store;
}
