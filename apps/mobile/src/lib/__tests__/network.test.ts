import { describe, expect, it, vi } from "vitest";

const networkState = vi.hoisted(() => ({
  value: {} as Record<string, unknown>,
  fail: false,
}));

vi.mock("expo-network", () => ({
  getNetworkStateAsync: async () => {
    if (networkState.fail) throw new Error("platform_error");
    return networkState.value;
  },
}));

import { isNetworkAvailable, isNetworkError } from "../network";

describe("isNetworkError", () => {
  it("classifies fetch-level connectivity failures as network errors", () => {
    expect(isNetworkError(new Error("TypeError: Network request failed"))).toBe(true);
    expect(isNetworkError(new Error("TypeError: Failed to fetch"))).toBe(true);
    expect(isNetworkError(new Error("sleep_log_insert_failed: TypeError: fetch failed"))).toBe(true);
    expect(isNetworkError(new Error("request_timeout"))).toBe(true);
    expect(isNetworkError("getaddrinfo ENOTFOUND example.com")).toBe(true);
  });

  it("does not classify server-side or permission errors as network errors", () => {
    expect(isNetworkError(new Error("permission denied for table sleep_logs"))).toBe(false);
    expect(isNetworkError(new Error("duplicate key value violates unique constraint"))).toBe(false);
    expect(isNetworkError(new Error("invalid input syntax for type uuid"))).toBe(false);
    expect(isNetworkError(null)).toBe(false);
    expect(isNetworkError(undefined)).toBe(false);
  });
});

describe("isNetworkAvailable", () => {
  it("returns false when the OS reports disconnected", async () => {
    networkState.value = { isConnected: false, isInternetReachable: false };
    expect(await isNetworkAvailable()).toBe(false);
  });

  it("returns false when internet is explicitly unreachable", async () => {
    networkState.value = { isConnected: true, isInternetReachable: false };
    expect(await isNetworkAvailable()).toBe(false);
  });

  it("returns true when connected", async () => {
    networkState.value = { isConnected: true, isInternetReachable: true };
    expect(await isNetworkAvailable()).toBe(true);
  });

  it("treats an unknown probe state (null) as online so real writes decide", async () => {
    networkState.value = { isConnected: true, isInternetReachable: null };
    expect(await isNetworkAvailable()).toBe(true);
  });

  it("assumes online when the platform cannot report state", async () => {
    networkState.fail = true;
    expect(await isNetworkAvailable()).toBe(true);
    networkState.fail = false;
  });
});
