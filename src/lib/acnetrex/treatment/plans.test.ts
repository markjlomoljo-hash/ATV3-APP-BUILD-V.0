import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/db", () => ({ getDb: vi.fn() }));

import { getDb } from "@/db";
import {
  TreatmentSafetyError,
  createTreatmentCheckin,
  createTreatmentPlan,
  listTreatmentCheckins,
  listTreatmentPlans,
  treatmentCheckinRequestSchema,
  treatmentPlanRequestSchema,
} from "./plans";

const database = vi.mocked(getDb);
const userId = "00000000-0000-0000-0000-000000000001";
const planId = "11111111-1111-4111-8111-111111111111";

const planRow = {
  id: planId,
  userId,
  title: "Clinician plan",
  description: "Use as directed",
  schedule: { activeIngredient: "provider label", providerDirected: true },
  status: "active",
  startedAt: new Date("2026-07-13T00:00:00.000Z"),
  endedAt: null,
  createdAt: new Date("2026-07-13T00:00:00.000Z"),
  updatedAt: new Date("2026-07-13T00:00:00.000Z"),
};

const checkinRow = {
  id: "22222222-2222-4222-8222-222222222222",
  planId,
  userId,
  checkinDate: "2026-07-13",
  status: "used",
  irritation: 2,
  notes: "Tolerated",
  createdAt: new Date("2026-07-13T00:00:00.000Z"),
};

function planInput() {
  return treatmentPlanRequestSchema.parse({
    name: "Clinician plan",
    startDate: "2026-07-13",
    providerDirected: true,
    activeIngredient: "provider label",
    instructions: "Use as directed",
  });
}

function checkinInput() {
  return treatmentCheckinRequestSchema.parse({
    planId,
    checkinDate: "2026-07-13",
    status: "used",
    irritation: 2,
    notes: "Tolerated",
  });
}

describe("treatment persistence service", () => {
  beforeEach(() => vi.clearAllMocks());

  it("blocks a plan that is not marked provider-directed", async () => {
    const input = treatmentPlanRequestSchema.parse({ name: "Unreviewed", startDate: "2026-07-13" });
    await expect(createTreatmentPlan(userId, input)).rejects.toBeInstanceOf(TreatmentSafetyError);
    expect(database).not.toHaveBeenCalled();
  });

  it("creates and maps a canonical treatment plan", async () => {
    const returning = vi.fn().mockResolvedValue([planRow]);
    database.mockReturnValue({ insert: vi.fn().mockReturnValue({ values: vi.fn().mockReturnValue({ returning }) }) } as never);
    const result = await createTreatmentPlan(userId, planInput());
    expect(result).toMatchObject({ id: planId, title: "Clinician plan", status: "active" });
    expect(returning).toHaveBeenCalledOnce();
  });

  it("lists plans for the authenticated owner", async () => {
    const orderBy = vi.fn().mockResolvedValue([planRow]);
    const where = vi.fn().mockReturnValue({ orderBy });
    database.mockReturnValue({ select: vi.fn().mockReturnValue({ from: vi.fn().mockReturnValue({ where }) }) } as never);
    const result = await listTreatmentPlans(userId);
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({ id: planId, title: "Clinician plan" });
  });

  it("refuses a check-in for a plan not owned by the user", async () => {
    const limit = vi.fn().mockResolvedValue([]);
    const where = vi.fn().mockReturnValue({ limit });
    database.mockReturnValue({ select: vi.fn().mockReturnValue({ from: vi.fn().mockReturnValue({ where }) }) } as never);
    await expect(createTreatmentCheckin(userId, checkinInput())).rejects.toThrow("treatment_plan_not_found");
  });

  it("creates a check-in after the ownership check", async () => {
    const limit = vi.fn().mockResolvedValue([{ id: planId }]);
    const ownerWhere = vi.fn().mockReturnValue({ limit });
    const returning = vi.fn().mockResolvedValue([checkinRow]);
    const databaseMock = {
      select: vi.fn().mockReturnValue({ from: vi.fn().mockReturnValue({ where: ownerWhere }) }),
      insert: vi.fn().mockReturnValue({ values: vi.fn().mockReturnValue({ returning }) }),
    };
    database.mockReturnValue(databaseMock as never);
    const result = await createTreatmentCheckin(userId, checkinInput());
    expect(result).toMatchObject({ id: checkinRow.id, planId, status: "used" });
  });

  it("lists owner-scoped check-ins with a plan filter", async () => {
    const orderBy = vi.fn().mockResolvedValue([checkinRow]);
    const where = vi.fn().mockReturnValue({ orderBy });
    database.mockReturnValue({ select: vi.fn().mockReturnValue({ from: vi.fn().mockReturnValue({ where }) }) } as never);
    const result = await listTreatmentCheckins(userId, planId);
    expect(result).toMatchObject([{ id: checkinRow.id, planId, status: "used" }]);
  });
});
