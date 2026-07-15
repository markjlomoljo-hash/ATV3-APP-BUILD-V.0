export type MobileMlRecoveryLifecycle = Readonly<{
  setAuthenticated(authenticated: boolean): Promise<void>;
  onForeground(): Promise<void>;
  onNetworkAvailable(): Promise<void>;
}>;

export function createMobileMlRecoveryLifecycle(input: {
  recover: () => Promise<unknown>;
}): MobileMlRecoveryLifecycle {
  let authenticated = false;
  let inFlight: Promise<void> | null = null;

  const recover = () => {
    if (!authenticated) return Promise.resolve();
    if (inFlight) return inFlight;
    inFlight = Promise.resolve()
      .then(() => input.recover())
      .then(() => undefined)
      // Durable operations and job references remain available for the next
      // foreground/network signal. Recovery must never crash app navigation.
      .catch(() => undefined)
      .finally(() => {
        inFlight = null;
      });
    return inFlight;
  };

  return {
    setAuthenticated(next) {
      const becameAuthenticated = next && !authenticated;
      authenticated = next;
      return becameAuthenticated ? recover() : Promise.resolve();
    },
    onForeground: recover,
    onNetworkAvailable: recover,
  };
}
