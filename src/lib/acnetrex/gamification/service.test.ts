import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/db", () => ({ getDb: vi.fn() }));

import { getDb } from "@/db";
import { getGamificationState, recomputeGamificationState } from "./service";

const database = vi.mocked(getDb);
const userId = "00000000-0000-0000-0000-000000000001";
const badgeId = "33333333-3333-4333-8333-333333333333";

function selectWhere(rows: unknown[]) {
  return { from: vi.fn().mockReturnValue({ where: vi.fn().mockResolvedValue(rows) }) };
}

function selectWhereLimit(rows: unknown[]) {
  return {
    from: vi.fn().mockReturnValue({
      where: vi.fn().mockReturnValue({ limit: vi.fn().mockResolvedValue(rows) }),
    }),
  };
}

function selectJoinWhere(rows: unknown[]) {
  return {
    from: vi.fn().mockReturnValue({
      innerJoin: vi.fn().mockReturnValue({ where: vi.fn().mockResolvedValue(rows) }),
    }),
  };
}

const completedTaskRows = [
  { completedAt: new Date("2026-07-25T08:00:00.000Z"), skipped: false },
  { completedAt: new Date("2026-07-26T09:00:00.000Z"), skipped: false },
  { completedAt: new Date("2026-07-20T09:00:00.000Z"), skipped: true }, // skipped: excluded
  { completedAt: null, skipped: false }, // incomplete: excluded
];
const checkinRows = [
  { checkinDate: "2026-07-24", status: "used", createdAt: new Date("2026-07-24T10:00:00.000Z") },
  { checkinDate: "2026-07-23", status: "skipped", createdAt: new Date("2026-07-23T10:00:00.000Z") }, // non-adherent
];
const now = new Date("2026-07-26T12:00:00.000Z");

describe("recomputeGamificationState", () => {
  beforeEach(() => vi.clearAllMocks());

  it("persists streak, points, rank, pet, and badge transitions from real history", async () => {
    const select = vi
      .fn()
      .mockReturnValueOnce(selectWhere(completedTaskRows))
      .mockReturnValueOnce(selectWhere(checkinRows))
      .mockReturnValueOnce(selectWhere([{ id: badgeId, code: "first_task_complete" }]))
      .mockReturnValueOnce(selectWhere([]));
    const onConflictDoUpdate = vi.fn().mockResolvedValue(undefined);
    const gamificationValues = vi.fn().mockReturnValue({ onConflictDoUpdate });
    const onConflictDoNothing = vi.fn().mockResolvedValue(undefined);
    const badgeValues = vi.fn().mockReturnValue({ onConflictDoNothing });
    const insert = vi
      .fn()
      .mockReturnValueOnce({ values: gamificationValues })
      .mockReturnValueOnce({ values: badgeValues });
    database.mockReturnValue({ select, insert } as never);

    const result = await recomputeGamificationState(userId, now);

    // 2 completed tasks (10 pts each) + 1 adherent check-in (5 pts) = 25.
    // Activity days 07-24, 07-25, 07-26 form a 3-day streak ending today.
    expect(result).toMatchObject({
      status: "computed",
      persisted: true,
      currentStreak: 3,
      longestStreak: 3,
      points: 25,
      rank: null,
      petXp: 20,
      petStage: "seed",
      completedTaskCount: 2,
      adherentCheckinCount: 1,
      lastActionAt: "2026-07-26T09:00:00.000Z",
      earnedBadgeCodes: ["first_task_complete"],
      newlyAwardedBadgeCodes: ["first_task_complete"],
      uncatalogedBadgeCodes: [],
    });
    expect(gamificationValues).toHaveBeenCalledWith(
      expect.objectContaining({
        userId,
        currentStreak: 3,
        longestStreak: 3,
        points: 25,
        rank: null,
        petStage: "seed",
        petXp: 20,
        lastActionAt: new Date("2026-07-26T09:00:00.000Z"),
      }),
    );
    expect(onConflictDoUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ set: expect.objectContaining({ points: 25, currentStreak: 3 }) }),
    );
    expect(badgeValues).toHaveBeenCalledWith([{ userId, badgeId }]);
  });

  it("returns insufficient_data and writes nothing when no qualifying events exist", async () => {
    const select = vi
      .fn()
      .mockReturnValueOnce(selectWhere([{ completedAt: null, skipped: false }, { completedAt: new Date(), skipped: true }]))
      .mockReturnValueOnce(selectWhere([{ checkinDate: "2026-07-23", status: "skipped", createdAt: new Date() }]));
    const insert = vi.fn();
    database.mockReturnValue({ select, insert } as never);

    const result = await recomputeGamificationState(userId, now);

    expect(result).toMatchObject({
      status: "insufficient_data",
      persisted: false,
      currentStreak: 0,
      longestStreak: 0,
      points: 0,
      rank: null,
      petStage: "seed",
      petXp: 0,
      lastActionAt: null,
      newlyAwardedBadgeCodes: [],
    });
    expect(insert).not.toHaveBeenCalled();
  });

  it("re-runs idempotently without re-awarding already-earned badges", async () => {
    const select = vi
      .fn()
      .mockReturnValueOnce(selectWhere(completedTaskRows))
      .mockReturnValueOnce(selectWhere(checkinRows))
      .mockReturnValueOnce(selectWhere([{ id: badgeId, code: "first_task_complete" }]))
      .mockReturnValueOnce(selectWhere([{ badgeId }]));
    const onConflictDoUpdate = vi.fn().mockResolvedValue(undefined);
    const insert = vi
      .fn()
      .mockReturnValueOnce({ values: vi.fn().mockReturnValue({ onConflictDoUpdate }) });
    database.mockReturnValue({ select, insert } as never);

    const result = await recomputeGamificationState(userId, now);

    expect(result).toMatchObject({
      status: "computed",
      points: 25,
      earnedBadgeCodes: ["first_task_complete"],
      newlyAwardedBadgeCodes: [],
    });
    // Only the gamification upsert ran; no user_badges insert was attempted.
    expect(insert).toHaveBeenCalledTimes(1);
  });

  it("reports eligible-but-uncataloged badge codes instead of inventing rows", async () => {
    const select = vi
      .fn()
      .mockReturnValueOnce(selectWhere(completedTaskRows))
      .mockReturnValueOnce(selectWhere(checkinRows))
      .mockReturnValueOnce(selectWhere([])) // empty catalog
      .mockReturnValueOnce(selectWhere([]));
    const onConflictDoUpdate = vi.fn().mockResolvedValue(undefined);
    const insert = vi
      .fn()
      .mockReturnValueOnce({ values: vi.fn().mockReturnValue({ onConflictDoUpdate }) });
    database.mockReturnValue({ select, insert } as never);

    const result = await recomputeGamificationState(userId, now);

    expect(result).toMatchObject({
      earnedBadgeCodes: [],
      newlyAwardedBadgeCodes: [],
      uncatalogedBadgeCodes: ["first_task_complete"],
    });
    expect(insert).toHaveBeenCalledTimes(1);
  });
});

describe("getGamificationState", () => {
  beforeEach(() => vi.clearAllMocks());

  it("reports insufficient_data with honest zeros when nothing is persisted", async () => {
    const select = vi
      .fn()
      .mockReturnValueOnce(selectWhereLimit([]))
      .mockReturnValueOnce(selectJoinWhere([]));
    database.mockReturnValue({ select } as never);

    await expect(getGamificationState(userId, now)).resolves.toEqual({
      status: "insufficient_data",
      currentStreak: 0,
      longestStreak: 0,
      points: 0,
      rank: null,
      petStage: "seed",
      petXp: 0,
      lastActionAt: null,
      badges: [],
    });
  });

  it("serves the persisted computed state while its streak is still alive", async () => {
    const select = vi
      .fn()
      .mockReturnValueOnce(
        selectWhereLimit([
          {
            currentStreak: 3,
            longestStreak: 5,
            points: 120,
            rank: "bronze",
            petStage: "sprout",
            petXp: 60,
            lastActionAt: new Date("2026-07-26T09:00:00.000Z"),
          },
        ]),
      )
      .mockReturnValueOnce(
        selectJoinWhere([{ code: "first_task_complete", earnedAt: new Date("2026-07-25T00:00:00.000Z") }]),
      );
    database.mockReturnValue({ select } as never);

    await expect(getGamificationState(userId, now)).resolves.toEqual({
      status: "ok",
      currentStreak: 3,
      longestStreak: 5,
      points: 120,
      rank: "bronze",
      petStage: "sprout",
      petXp: 60,
      lastActionAt: "2026-07-26T09:00:00.000Z",
      badges: [{ code: "first_task_complete", earnedAt: "2026-07-25T00:00:00.000Z" }],
    });
  });

  it("serves a stale persisted streak as 0 once a full UTC day has been missed", async () => {
    // Recompute last ran at streak 5 on 2026-06-20; the user then lapsed.
    // The break rule says the streak is already broken, so the reader must
    // not serve the stale row value — and must not write anything either.
    const staleRow = {
      currentStreak: 5,
      longestStreak: 5,
      points: 120,
      rank: "bronze",
      petStage: "sprout",
      petXp: 60,
      lastActionAt: new Date("2026-06-20T09:00:00.000Z"),
    };
    const select = vi
      .fn()
      .mockReturnValueOnce(selectWhereLimit([staleRow]))
      .mockReturnValueOnce(selectJoinWhere([]));
    const insert = vi.fn();
    const update = vi.fn();
    database.mockReturnValue({ select, insert, update } as never);

    await expect(getGamificationState(userId, now)).resolves.toMatchObject({
      status: "ok",
      currentStreak: 0,
      // Monotone lifetime fields are served untouched — only the streak can
      // over-report when stale.
      longestStreak: 5,
      points: 120,
      rank: "bronze",
      petStage: "sprout",
      petXp: 60,
      lastActionAt: "2026-06-20T09:00:00.000Z",
    });
    expect(insert).not.toHaveBeenCalled();
    expect(update).not.toHaveBeenCalled();
  });

  it("clamps exactly at the streak boundary: yesterday alive, two days ago broken", async () => {
    const rowWithLastAction = (lastActionAt: Date) => [
      {
        currentStreak: 2,
        longestStreak: 2,
        points: 25,
        rank: null,
        petStage: "seed",
        petXp: 20,
        lastActionAt,
      },
    ];
    const aliveSelect = vi
      .fn()
      .mockReturnValueOnce(selectWhereLimit(rowWithLastAction(new Date("2026-07-25T22:00:00.000Z"))))
      .mockReturnValueOnce(selectJoinWhere([]));
    database.mockReturnValue({ select: aliveSelect } as never);
    await expect(getGamificationState(userId, now)).resolves.toMatchObject({ currentStreak: 2 });

    const brokenSelect = vi
      .fn()
      .mockReturnValueOnce(selectWhereLimit(rowWithLastAction(new Date("2026-07-24T22:00:00.000Z"))))
      .mockReturnValueOnce(selectJoinWhere([]));
    database.mockReturnValue({ select: brokenSelect } as never);
    await expect(getGamificationState(userId, now)).resolves.toMatchObject({ currentStreak: 0 });
  });
});
