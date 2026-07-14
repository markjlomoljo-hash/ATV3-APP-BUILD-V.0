import type { OfflineOperation, OfflineOperationStore } from "./offline-queue-contract.js";

type BindValue = string | number | null;

export interface QueueDatabase {
  execAsync(source: string): Promise<void>;
  runAsync(source: string, params: BindValue[]): Promise<unknown>;
  getFirstAsync<T>(source: string, params: BindValue[]): Promise<T | null>;
  getAllAsync<T>(source: string, params: BindValue[]): Promise<T[]>;
}

type StoredOperation = Omit<OfflineOperation, "validated_payload" | "dependencies"> & {
  validated_payload_json: string;
  dependencies_json: string;
};

function deserialize(row: StoredOperation): OfflineOperation {
  const { validated_payload_json, dependencies_json, ...metadata } = row;
  return {
    ...metadata,
    validated_payload: JSON.parse(validated_payload_json) as unknown,
    dependencies: JSON.parse(dependencies_json) as string[],
  };
}

export function createSqliteOfflineOperationStore(database: QueueDatabase): OfflineOperationStore & {
  initialize(): Promise<void>;
} {
  return {
    async initialize() {
      await database.execAsync(`
        PRAGMA journal_mode = WAL;
        CREATE TABLE IF NOT EXISTS ml_offline_operations (
          local_operation_id TEXT PRIMARY KEY NOT NULL,
          idempotency_key TEXT NOT NULL,
          request_id TEXT NOT NULL,
          method TEXT NOT NULL,
          route TEXT NOT NULL,
          validated_payload_json TEXT NOT NULL,
          payload_schema_version TEXT NOT NULL,
          created_at TEXT NOT NULL,
          attempt_count INTEGER NOT NULL,
          next_attempt_at TEXT NOT NULL,
          status TEXT NOT NULL,
          last_error_code TEXT,
          dependencies_json TEXT NOT NULL
        );
        CREATE UNIQUE INDEX IF NOT EXISTS ml_offline_operations_idempotency_idx
          ON ml_offline_operations (idempotency_key);
        CREATE INDEX IF NOT EXISTS ml_offline_operations_ready_idx
          ON ml_offline_operations (status, next_attempt_at);
      `);
    },

    async put(operation) {
      await database.runAsync(
        `INSERT INTO ml_offline_operations (
          local_operation_id, idempotency_key, request_id, method, route,
          validated_payload_json, payload_schema_version, created_at,
          attempt_count, next_attempt_at, status, last_error_code, dependencies_json
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(local_operation_id) DO UPDATE SET
          attempt_count = excluded.attempt_count,
          next_attempt_at = excluded.next_attempt_at,
          status = excluded.status,
          last_error_code = excluded.last_error_code`,
        [
          operation.local_operation_id,
          operation.idempotency_key,
          operation.request_id,
          operation.method,
          operation.route,
          JSON.stringify(operation.validated_payload),
          operation.payload_schema_version,
          operation.created_at,
          operation.attempt_count,
          operation.next_attempt_at,
          operation.status,
          operation.last_error_code,
          JSON.stringify(operation.dependencies),
        ],
      );
    },

    async get(id) {
      const row = await database.getFirstAsync<StoredOperation>(
        "SELECT * FROM ml_offline_operations WHERE local_operation_id = ? LIMIT 1",
        [id],
      );
      return row ? deserialize(row) : null;
    },

    async listReady(now, limit) {
      const boundedLimit = Math.min(Math.max(Math.floor(limit), 1), 50);
      const rows = await database.getAllAsync<StoredOperation>(
        `SELECT * FROM ml_offline_operations
         WHERE status IN ('pending', 'retry_wait') AND next_attempt_at <= ?
         ORDER BY created_at ASC LIMIT ?`,
        [now.toISOString(), boundedLimit],
      );
      return rows.map(deserialize);
    },

    async remove(id) {
      await database.runAsync(
        "DELETE FROM ml_offline_operations WHERE local_operation_id = ?",
        [id],
      );
    },
  };
}
