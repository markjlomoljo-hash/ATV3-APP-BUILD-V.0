import { describe, expect, it, vi } from "vitest";

import { openEncryptedDatabase } from "../../../packages/ml-local-runtime/src/encrypted-sqlite";

function dependencies(storedKey: string | null = null) {
  const database = {
    execAsync: vi.fn(async (_source: string) => undefined),
    getFirstAsync: vi.fn(async (_source: string): Promise<unknown> => ({ count: 0 })),
    closeAsync: vi.fn(async () => undefined),
  };
  return {
    database,
    secureStore: {
      isAvailable: vi.fn(async () => true),
      get: vi.fn(async () => storedKey),
      set: vi.fn(async () => undefined),
    },
    randomBytes: vi.fn(async () => Uint8Array.from({ length: 32 }, (_, index) => index)),
    openDatabase: vi.fn(async () => database),
  };
}

describe("encrypted SQLite opener", () => {
  it("fails closed before opening when device-kept secret storage is unavailable", async () => {
    const deps = dependencies();
    deps.secureStore.isAvailable.mockResolvedValueOnce(false);

    await expect(openEncryptedDatabase("acnetrex-private.db", deps)).rejects.toThrow(
      "secure_key_storage_unavailable",
    );
    expect(deps.openDatabase).not.toHaveBeenCalled();
  });

  it("creates and stores a device-only 256-bit key before opening the database", async () => {
    const deps = dependencies();

    await openEncryptedDatabase("acnetrex-private.db", deps);

    expect(deps.randomBytes).toHaveBeenCalledWith(32);
    expect(deps.secureStore.set).toHaveBeenCalledWith(
      "acnetrex.sqlite.raw-key.v1",
      "000102030405060708090a0b0c0d0e0f101112131415161718191a1b1c1d1e1f",
    );
    expect(deps.database.execAsync.mock.calls[0]?.[0]).toBe(
      `PRAGMA key = "x'000102030405060708090a0b0c0d0e0f101112131415161718191a1b1c1d1e1f'"`,
    );
    expect(deps.database.getFirstAsync).toHaveBeenCalledWith(
      "SELECT count(*) AS count FROM sqlite_master",
    );
  });

  it("rejects malformed stored keys without placing them in SQL", async () => {
    const deps = dependencies("not-a-key\"; DROP TABLE ml_offline_operations; --");

    await expect(openEncryptedDatabase("acnetrex-private.db", deps)).rejects.toThrow(
      "invalid_encryption_key",
    );
    expect(deps.openDatabase).not.toHaveBeenCalled();
    expect(deps.database.execAsync).not.toHaveBeenCalled();
  });

  it("closes the handle when key verification fails", async () => {
    const deps = dependencies("a".repeat(64));
    deps.database.getFirstAsync.mockImplementationOnce(async () => {
      throw new Error("file is not a database");
    });

    await expect(openEncryptedDatabase("acnetrex-private.db", deps)).rejects.toThrow(
      "encrypted_database_open_failed",
    );
    expect(deps.database.closeAsync).toHaveBeenCalledOnce();
  });
});
