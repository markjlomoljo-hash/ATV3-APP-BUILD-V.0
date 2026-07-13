const KEY_STORAGE_NAME = "acnetrex.sqlite.raw-key.v1";
const RAW_KEY_PATTERN = /^[0-9a-f]{64}$/;
const DATABASE_NAME_PATTERN = /^(?!.*\.\.)[a-zA-Z0-9._-]+$/;

export interface EncryptedDatabase {
  execAsync(source: string): Promise<void>;
  getFirstAsync<T>(source: string): Promise<T | null>;
  closeAsync(): Promise<void>;
}

export interface EncryptedDatabaseDependencies<TDatabase extends EncryptedDatabase> {
  secureStore: {
    isAvailable(): Promise<boolean>;
    get(key: string): Promise<string | null>;
    set(key: string, value: string): Promise<void>;
  };
  randomBytes(byteCount: number): Promise<Uint8Array>;
  openDatabase(name: string): Promise<TDatabase>;
}

function toHex(bytes: Uint8Array): string {
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

async function loadOrCreateRawKey<TDatabase extends EncryptedDatabase>(
  dependencies: EncryptedDatabaseDependencies<TDatabase>,
): Promise<string> {
  const storedKey = await dependencies.secureStore.get(KEY_STORAGE_NAME);
  if (storedKey !== null) {
    if (!RAW_KEY_PATTERN.test(storedKey)) throw new Error("invalid_encryption_key");
    return storedKey;
  }

  const bytes = await dependencies.randomBytes(32);
  if (bytes.byteLength !== 32) throw new Error("invalid_encryption_key");
  const key = toHex(bytes);
  bytes.fill(0);
  await dependencies.secureStore.set(KEY_STORAGE_NAME, key);
  return key;
}

export async function openEncryptedDatabase<TDatabase extends EncryptedDatabase>(
  name: string,
  dependencies: EncryptedDatabaseDependencies<TDatabase>,
): Promise<TDatabase> {
  if (!DATABASE_NAME_PATTERN.test(name)) throw new Error("invalid_database_name");
  if (!(await dependencies.secureStore.isAvailable())) {
    throw new Error("secure_key_storage_unavailable");
  }

  const key = await loadOrCreateRawKey(dependencies);
  let database: TDatabase | null = null;
  try {
    database = await dependencies.openDatabase(name);
    await database.execAsync(`PRAGMA key = "x'${key}'"`);
    await database.execAsync("PRAGMA cipher_memory_security = ON");
    await database.getFirstAsync<{ count: number }>("SELECT count(*) AS count FROM sqlite_master");
    return database;
  } catch {
    if (database) {
      try {
        await database.closeAsync();
      } catch {
        // Preserve the fail-closed error without exposing native details or key material.
      }
    }
    throw new Error("encrypted_database_open_failed");
  }
}
