import { describe, expect, it } from "vitest";

import { POST } from "./route";

describe("POST /api/ml/predict compatibility boundary", () => {
  it("deprecates the competing direct proxy in favor of durable ML jobs", async () => {
    const response = await POST();

    expect(response.status).toBe(410);
    expect(await response.json()).toEqual({
      ok: false,
      error: "direct_ml_prediction_deprecated",
      replacement: "/api/ml/jobs",
    });
  });
});
