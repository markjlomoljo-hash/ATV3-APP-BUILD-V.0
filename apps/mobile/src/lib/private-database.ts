import * as Crypto from "expo-crypto";
import * as SecureStore from "expo-secure-store";
import * as SQLite from "expo-sqlite";

import { openEncryptedDatabase } from "../../../../packages/ml-local-runtime/src/encrypted-sqlite";

const secureStoreOptions: SecureStore.SecureStoreOptions = {
  keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
  keychainService: "com.acnetrex.mobile.sqlite",
};

export function openPrivateDatabase() {
  return openEncryptedDatabase("acnetrex-private.db", {
    secureStore: {
      isAvailable: SecureStore.isAvailableAsync,
      get: (key) => SecureStore.getItemAsync(key, secureStoreOptions),
      set: (key, value) => SecureStore.setItemAsync(key, value, secureStoreOptions),
    },
    randomBytes: Crypto.getRandomBytesAsync,
    openDatabase: (name) => SQLite.openDatabaseAsync(name),
  });
}
