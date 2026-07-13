import { describe, expect, it, vi } from "vitest";

import {
  createSqliteOfflineOperationStore,
  type QueueDatabase,
} from "../../../packages/ml-local-runtime/src/sqlite-operation-store";

const operation = {
  local_operation_id: "11111111-1111-4111-8111-111111111111",
  idempotency_key: "22222222-2222-4222-8222-222222222222",
  request_id: "33333333-3333-4333-8333-333333333333",
  method: "POST" as const,
  route: "/api/ml/jobs",
  validated_payload: { module: "sleepderm" },
  payload_schema_version: "1.0.0",
  created_at: "2026-07-13T12:30:00.000Z",
  attempt_count: 0,
  next_attempt_at: "2026-07-13T12:30:00.000Z",
  status: "pending" as const,
  last_error_code: null,
  dependencies: [],
};

function fakeDatabase() {
  const database = {
    execAsync: vi.fn(async () => undefined),
    runAsync: vi.fn(async () => ({ changes: 1, lastInsertRowId: 0 })),
    getFirstAsync: vi.fn(async () => null),
    getAllAsync: vi.fn(async () => []),
  };
  return database as typeof database & QueueDatabase;
}

describe("Expo SQLite ML offline operation store", () => {
  it("initializes a WAL-backed queue table without interpolating payloads", async () => {
    const database = fakeDatabase();
    const store = createSqliteOfflineOperationStore(database);

    await store.initialize();
    await store.put(operation);

    expect(database.execAsync).toHaveBeenCalledWith(expect.stringContaining("PRAGMA journal_mode = WAL"));
    expect(database.runAsync).toHaveBeenCalledWith(
      expect.stringContaining("INSERT INTO ml_offline_operations"),
      expect.arrayContaining([
        operation.local_operation_id,
        operation.idempotency_key,
        JSON.stringify(operation.validated_payload),
      ]),
    );
    expect(database.runAsync.mock.calls[0]?.[0]).not.toContain("sleepderm");
  });

  it("deserializes a stored operation and preserves replay identities", async () => {
    const database = fakeDatabase();
    database.getFirstAsync.mockResolvedValueOnce({
      ...operation,
      validated_payload_json: JSON.stringify(operation.validated_payload),
      dependencies_json: "[]",
    });
    const store = createSqliteOfflineOperationStore(database);

    await expect(store.get(operation.local_operation_id)).resolves.toEqual(operation);
    expect(database.getFirstAsync).toHaveBeenCalledWith(
      expect.stringContaining("WHERE local_operation_id = ?"),
      [operation.local_operation_id],
    );
  });

  it("lists only ready replay states with a bounded batch size", async () => {
    const database = fakeDatabase();
    const store = createSqliteOfflineOperationStore(database);

    await store.listReady(new Date("2026-07-13T12:31:00.000Z"), 500);

    expect(database.getAllAsync).toHaveBeenCalledWith(
      expect.stringContaining("status IN ('pending', 'retry_wait')"),
      ["2026-07-13T12:31:00.000Z", 50],
    );
  });
});
