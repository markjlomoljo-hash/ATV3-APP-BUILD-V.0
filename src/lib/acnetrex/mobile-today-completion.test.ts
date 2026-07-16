import { describe, expect, it } from "vitest";
import { isFoodDayComplete } from "../../../apps/mobile/src/lib/daily-log-completion";

describe("mobile Today food completion", () => {
  it("does not show a partial or snack-only parent as a completed food day", () => {
    expect(isFoodDayComplete("not_started")).toBe(false);
    expect(isFoodDayComplete("partially_logged")).toBe(false);
    expect(isFoodDayComplete("incomplete_but_saved")).toBe(false);
    expect(isFoodDayComplete("meals_complete_no_snacks_logged")).toBe(true);
    expect(isFoodDayComplete("meals_complete_with_snacks_logged")).toBe(true);
    expect(isFoodDayComplete("user_marked_complete")).toBe(true);
  });
});
