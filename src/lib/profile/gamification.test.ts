import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/db", () => ({ getDb: vi.fn() }));

import { getDb } from "@/db";
import { computeGamificationSummary } from "./gamification";

const database = vi.mocked(getDb);
const userId = "00000000-0000-0000-0000-000000000001";

function databaseFor({
  state = [],
  badgeRows = [],
  taskRows = [],
}: {
  state?: unknown[];
  badgeRows?: unknown[];
  taskRows?: unknown[];
}) {
  const stateWhere = vi.fn().mockReturnValue({ limit: vi.fn().mockResolvedValue(state) });
  const badgeWhere = vi.fn().mockResolvedValue(badgeRows);
  const taskWhere = vi.fn().mockResolvedValue(taskRows);
  const select = vi
    .fn()
    .mockReturnValueOnce({
      from: vi.fn().mockReturnValue({ where: stateWhere }),
    })
    .mockReturnValueOnce({
      from: vi.fn().mockReturnValue({
        innerJoin: vi.fn().mockReturnValue({ where: badgeWhere }),
      }),
    })
    .mockReturnValueOnce({
      from: vi.fn().mockReturnValue({ where: taskWhere }),
    });

  database.mockReturnValue({ select } as never);
  return { select };
}

describe("professional profile gamification summary", () => {
  beforeEach(() => vi.clearAllMocks());

  it("reads canonical gamification, awarded badges, and treatment task state", async () => {
    const { select } = databaseFor({
      state: [{ currentStreak: 4, longestStreak: 9, points: 120 }],
      badgeRows: [{ code: "sleep_consistency" }],
      taskRows: [{ completedAt: new Date("2026-07-13T08:00:00.000Z") }],
    });

    await expect(computeGamificationSummary(userId)).resolves.toEqual({
      currentStreak: 4,
      longestStreak: 9,
      totalPoints: 120,
      badgeCount: 1,
      badges: ["sleep_consistency"],
      insufficientData: false,
    });
    expect(select).toHaveBeenCalledTimes(3);
  });

  it("reports insufficient data when no canonical records exist", async () => {
    databaseFor({});

    await expect(computeGamificationSummary(userId)).resolves.toEqual({
      currentStreak: 0,
      longestStreak: 0,
      totalPoints: 0,
      badgeCount: 0,
      badges: [],
      insufficientData: true,
    });
  });

  it("does not mark a user insufficient when the canonical gamification row exists", async () => {
    databaseFor({ state: [{ currentStreak: 0, longestStreak: 0, points: 0 }] });

    await expect(computeGamificationSummary(userId)).resolves.toMatchObject({
      totalPoints: 0,
      insufficientData: false,
    });
  });
});
