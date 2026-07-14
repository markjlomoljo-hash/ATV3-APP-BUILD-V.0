export type CircuitState = "closed" | "open" | "half_open";

export class CircuitOpenError extends Error {
  constructor() {
    super("dependency_circuit_open");
  }
}

export class CircuitBreaker {
  private failures = 0;
  private openedAt = 0;
  private halfOpenProbe = false;

  constructor(private readonly threshold = 5, private readonly resetAfterMs = 30_000) {}

  get state(): CircuitState {
    if (!this.openedAt) return "closed";
    return Date.now() - this.openedAt >= this.resetAfterMs ? "half_open" : "open";
  }

  async execute<T>(operation: () => Promise<T>): Promise<T> {
    const state = this.state;
    if (state === "open" || (state === "half_open" && this.halfOpenProbe)) throw new CircuitOpenError();
    if (state === "half_open") this.halfOpenProbe = true;
    try {
      const result = await operation();
      this.failures = 0;
      this.openedAt = 0;
      return result;
    } catch (error) {
      this.failures += 1;
      if (this.failures >= this.threshold) this.openedAt = Date.now();
      throw error;
    } finally {
      this.halfOpenProbe = false;
    }
  }
}

