import { describe, expect, it, vi } from "vitest";

import { createMobileMlRecoveryLifecycle } from "../../../apps/mobile/src/lib/ml-recovery-lifecycle";

describe("mobile ML recovery lifecycle", () => {
  it("recovers once for initial auth and coalesces overlapping triggers", async () => {
    let resolveRecovery!: () => void;
    const recover = vi.fn(() => new Promise<void>((resolve) => { resolveRecovery = resolve; }));
    const lifecycle = createMobileMlRecoveryLifecycle({ recover });

    const initial = lifecycle.setAuthenticated(true);
    const foreground = lifecycle.onForeground();
    const reconnect = lifecycle.onNetworkAvailable();

    expect(recover).toHaveBeenCalledTimes(1);
    resolveRecovery();
    await Promise.all([initial, foreground, reconnect]);
  });

  it("replays after foreground and network reconnect only while authenticated", async () => {
    const recover = vi.fn().mockResolvedValue(undefined);
    const lifecycle = createMobileMlRecoveryLifecycle({ recover });

    await lifecycle.onForeground();
    await lifecycle.onNetworkAvailable();
    expect(recover).not.toHaveBeenCalled();

    await lifecycle.setAuthenticated(true);
    await lifecycle.onForeground();
    await lifecycle.onNetworkAvailable();
    expect(recover).toHaveBeenCalledTimes(3);

    await lifecycle.setAuthenticated(false);
    await lifecycle.onNetworkAvailable();
    expect(recover).toHaveBeenCalledTimes(3);
  });

  it("keeps recovery failures retriable on the next lifecycle signal", async () => {
    const recover = vi.fn()
      .mockRejectedValueOnce(new Error("offline"))
      .mockResolvedValueOnce(undefined);
    const lifecycle = createMobileMlRecoveryLifecycle({ recover });

    await expect(lifecycle.setAuthenticated(true)).resolves.toBeUndefined();
    await expect(lifecycle.onNetworkAvailable()).resolves.toBeUndefined();
    expect(recover).toHaveBeenCalledTimes(2);
  });
});
