// Thin fetch client for all Phase 6 endpoints. Every mutating call goes
// through the offline queue helpers in `offline-queue.ts` when it needs to
// survive being offline; simple reads/writes call this directly.

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    ...init,
    headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
    credentials: "include",
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    const message = body?.error ?? `Request failed (${res.status})`;
    throw new Error(message);
  }
  return body as T;
}

export const api = {
  register: (data: { email: string; password: string; displayName?: string; timezone: string; mealFrequencyBaseline: number }) =>
    request("/api/auth/register", { method: "POST", body: JSON.stringify(data) }),
  login: (data: { email: string; password: string }) => request("/api/auth/login", { method: "POST", body: JSON.stringify(data) }),
  logout: () => request("/api/auth/logout", { method: "POST" }),
  me: () => request<{ ok: true; user: null | { id: string; email: string; displayName: string | null; timezone: string; mealFrequencyBaseline: number } }>("/api/auth/me"),

  tasksToday: () => request<{ ok: true; date: string; tasks: any[]; summary: any; streak: any; restoresRemainingThisMonth: number }>("/api/tasks/today"),
  tasksHistory: (days = 30) => request<{ ok: true; history: any[] }>(`/api/tasks/history?days=${days}`),
  completeTask: (id: string, body: { clientCompletionId: string; source?: "online" | "offline_sync"; completedAtLocalDate?: string }) =>
    request(`/api/tasks/${id}/complete`, { method: "POST", body: JSON.stringify(body) }),
  uncompleteTask: (id: string) => request(`/api/tasks/${id}/uncomplete-if-allowed`, { method: "POST" }),

  restoreStreak: (targetDate: string) => request("/api/streaks/restore", { method: "POST", body: JSON.stringify({ targetDate }) }),
  gamificationSummary: () => request<{ ok: true; progress: any; badges: any[]; restoresRemainingThisMonth: number }>("/api/gamification/summary"),
  badges: () => request<{ ok: true; badges: any[] }>("/api/badges"),
  ranks: () => request<{ ok: true; ranks: any[]; currentRankId: string | null }>("/api/ranks"),
  petState: () => request<{ ok: true; pet: any; stageName: string; nextStage: any }>("/api/pet-state"),

  logSleep: (body: { logDate: string; sleepTime?: string; wakeTime?: string; quality?: number; notes?: string }) =>
    request("/api/logs/sleep", { method: "POST", body: JSON.stringify(body) }),
  logFood: (body: { logDate: string; mealType: string; notes?: string }) => request("/api/logs/food", { method: "POST", body: JSON.stringify(body) }),
  logScan: (body: { scanDate: string; anglesCompleted: string[]; annotationComplete: boolean }) =>
    request("/api/scans", { method: "POST", body: JSON.stringify(body) }),
  ackConsent: () => request("/api/consent/ack", { method: "POST", body: JSON.stringify({}) }),

  listPlans: (status?: string) => request<{ ok: true; plans: any[] }>(`/api/treatment-plans${status ? `?status=${status}` : ""}`),
  planHistory: () => request<{ ok: true; plans: any[] }>("/api/treatment-plans/history"),
  createPlan: (body: unknown) => request<{ ok: true; plan: any }>("/api/treatment-plans", { method: "POST", body: JSON.stringify(body) }),
  getPlan: (id: string) => request<{ ok: true; plan: any }>(`/api/treatment-plans/${id}`),
  updatePlan: (id: string, body: unknown) => request<{ ok: true; plan: any }>(`/api/treatment-plans/${id}`, { method: "PATCH", body: JSON.stringify(body) }),
  pausePlan: (id: string, reason?: string) => request(`/api/treatment-plans/${id}/pause`, { method: "POST", body: JSON.stringify({ reason }) }),
  resumePlan: (id: string, reason?: string) => request(`/api/treatment-plans/${id}/resume`, { method: "POST", body: JSON.stringify({ reason }) }),
  archivePlan: (id: string, reason?: string) => request(`/api/treatment-plans/${id}/archive`, { method: "POST", body: JSON.stringify({ reason }) }),
  planSchedule: (id: string) => request<{ ok: true; days: any[] }>(`/api/treatment-plans/${id}/schedule`),
  planCheckins: (id: string) => request<{ ok: true; checkins: any[] }>(`/api/treatment-plans/${id}/checkins`),
  addCheckin: (id: string, body: unknown) => request(`/api/treatment-plans/${id}/checkins`, { method: "POST", body: JSON.stringify(body) }),
  addEvent: (id: string, body: unknown) => request(`/api/treatment-plans/${id}/events`, { method: "POST", body: JSON.stringify(body) }),
  planSafety: (id: string) => request<{ ok: true; flags: any[] }>(`/api/treatment-plans/${id}/safety`),
};
