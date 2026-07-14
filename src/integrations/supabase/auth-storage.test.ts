import { describe, expect, it, vi } from "vitest";
import {
  createNativeSecureAuthStorage,
  createWebSupabaseAuthStorage,
} from "./auth-storage";

describe("Supabase auth storage adapters", () => {
  it("does not create browser storage when localStorage is unavailable", () => {
    expect(createWebSupabaseAuthStorage(undefined)).toBeUndefined();
  });

  it("wraps browser storage behind an explicit web adapter", () => {
    const backing = new Map<string, string>();
    const storage = createWebSupabaseAuthStorage({
      getItem: (key) => backing.get(key) ?? null,
      setItem: (key, value) => backing.set(key, value),
      removeItem: (key) => backing.delete(key),
    });

    storage?.setItem("session", "value");

    expect(storage?.getItem("session")).toBe("value");
    storage?.removeItem("session");
    expect(storage?.getItem("session")).toBeNull();
  });

  it("adapts native SecureStore-style async storage for mobile auth", async () => {
    const secureStore = {
      getItemAsync: vi.fn(async () => "native-session"),
      setItemAsync: vi.fn(async () => undefined),
      deleteItemAsync: vi.fn(async () => undefined),
    };
    const storage = createNativeSecureAuthStorage(secureStore);

    await expect(storage.getItem("session")).resolves.toBe("native-session");
    await storage.setItem("session", "next-session");
    await storage.removeItem("session");

    expect(secureStore.setItemAsync).toHaveBeenCalledWith("session", "next-session");
    expect(secureStore.deleteItemAsync).toHaveBeenCalledWith("session");
  });
});
