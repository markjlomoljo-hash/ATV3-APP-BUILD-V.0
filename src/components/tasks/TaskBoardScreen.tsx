"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { api } from "@/lib/client/api";
import { enqueue, getQueue, syncQueue } from "@/lib/client/offline-queue";
import { addDaysToLocalDate } from "@/lib/dates";
import { DailyTaskCard, type TaskRow } from "./DailyTaskCard";
import { StreakStatusCard } from "./StreakStatusCard";
import { PointsLedgerSummary } from "./PointsLedgerSummary";
import { RankProgressCard } from "./RankProgressCard";
import { StreakPetAvatar } from "./StreakPetAvatar";
import { BadgeShelf } from "./BadgeShelf";
import { AIReadinessRing } from "./AIReadinessRing";
import { StreakRestoreModal } from "./StreakRestoreModal";

type TodayResponse = Awaited<ReturnType<typeof api.tasksToday>>;
type SummaryResponse = Awaited<ReturnType<typeof api.gamificationSummary>>;
type PetResponse = Awaited<ReturnType<typeof api.petState>>;
type RanksResponse = Awaited<ReturnType<typeof api.ranks>>;

export function TaskBoardScreen() {
  const [today, setToday] = useState<TodayResponse | null>(null);
  const [summary, setSummary] = useState<SummaryResponse | null>(null);
  const [pet, setPet] = useState<PetResponse | null>(null);
  const [ranksData, setRanksData] = useState<RanksResponse | null>(null);
  const [badgesData, setBadgesData] = useState<Awaited<ReturnType<typeof api.badges>> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [online, setOnline] = useState(true);
  const [queueVersion, setQueueVersion] = useState(0);
  const [showRestore, setShowRestore] = useState(false);
  const [taskErrors, setTaskErrors] = useState<Record<string, string>>({});

  const load = useCallback(async () => {
    setError(null);
    try {
      const [t, s, p, r, b] = await Promise.all([api.tasksToday(), api.gamificationSummary(), api.petState(), api.ranks(), api.badges()]);
      setToday(t);
      setSummary(s);
      setPet(p);
      setRanksData(r);
      setBadgesData(b);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load your Task Board.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    setOnline(navigator.onLine);
    const goOnline = () => {
      setOnline(true);
      syncQueue(() => setQueueVersion((v) => v + 1)).then(load);
    };
    const goOffline = () => setOnline(false);
    window.addEventListener("online", goOnline);
    window.addEventListener("offline", goOffline);
    syncQueue(() => setQueueVersion((v) => v + 1)).then(load);
    return () => {
      window.removeEventListener("online", goOnline);
      window.removeEventListener("offline", goOffline);
    };
  }, [load]);

  const queue = useMemo(() => getQueue(), [queueVersion]);
  const queuedTaskIds = new Set(queue.filter((q) => q.type === "task_completion").map((q) => (q.payload.taskId as string) ?? ""));

  const completeTask = async (taskId: string) => {
    const clientCompletionId = crypto.randomUUID();
    setTaskErrors((prev) => ({ ...prev, [taskId]: "" }));
    if (!navigator.onLine) {
      enqueue({
        type: "task_completion",
        idempotencyKey: clientCompletionId,
        intendedLocalDate: today?.date ?? "",
        payload: { taskId, clientCompletionId, source: "offline_sync" },
        endpoint: `/api/tasks/${taskId}/complete`,
      });
      setQueueVersion((v) => v + 1);
      setToday((prev) => (prev ? { ...prev, tasks: prev.tasks.map((t) => (t.id === taskId ? { ...t, status: "pending" } : t)) } : prev));
      return;
    }
    try {
      await api.completeTask(taskId, { clientCompletionId, source: "online" });
      await load();
    } catch (err) {
      setTaskErrors((prev) => ({ ...prev, [taskId]: err instanceof Error ? err.message : "Failed — try again." }));
    }
  };

  if (loading) {
    return <div className="rounded-2xl border border-slate-200 bg-white p-6 text-slate-500">Loading your Task Board…</div>;
  }

  if (error) {
    return (
      <div className="rounded-2xl border border-rose-200 bg-rose-50 p-6 text-rose-700">
        <p className="font-semibold">Couldn't load tasks</p>
        <p className="text-sm">{error}</p>
        <button onClick={load} className="mt-3 rounded-full bg-rose-600 px-4 py-2 text-sm font-semibold text-white">
          Retry
        </button>
      </div>
    );
  }

  if (!today) return null;

  const requiredTasks = today.tasks.filter((t: TaskRow) => t.requiredForStreak);
  const optionalTasks = today.tasks.filter((t: TaskRow) => !t.requiredForStreak);
  const totalPoints = summary?.progress?.totalPoints ?? 0;
  const currentRank = ranksData?.ranks.find((r: any) => r.id === ranksData?.currentRankId);
  const currentRankIndex = ranksData?.ranks.findIndex((r: any) => r.id === ranksData?.currentRankId) ?? -1;
  const nextRank = ranksData && currentRankIndex >= 0 ? ranksData.ranks[currentRankIndex + 1] : null;

  const restoreCandidates: string[] = [];
  for (let i = 1; i <= 14; i++) {
    restoreCandidates.push(addDaysToLocalDate(today.date, -i));
  }

  return (
    <div className="flex flex-col gap-6">
      {!online && (
        <div className="rounded-xl bg-indigo-50 px-4 py-2 text-sm text-indigo-700">
          You're offline. Task completions will be queued and synced automatically when you're back online.
        </div>
      )}
      {queue.length > 0 && (
        <div className="rounded-xl bg-amber-50 px-4 py-2 text-sm text-amber-700">
          {queue.length} action{queue.length === 1 ? "" : "s"} waiting to sync.
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <PointsLedgerSummary totalPoints={totalPoints} todayEarned={today.tasks.filter((t: TaskRow) => t.status === "completed").reduce((sum: number, t: TaskRow) => sum + t.points, 0)} />
        <StreakStatusCard
          currentStreak={today.streak?.currentStreak ?? 0}
          longestStreak={today.streak?.longestStreak ?? 0}
          isFullStreakDay={today.summary?.isFullStreakDay ?? false}
          requiredCompleted={today.summary?.requiredCompleted ?? 0}
          requiredTotal={today.summary?.requiredTotal ?? 0}
          onOpenRestore={() => setShowRestore(true)}
          restoresRemaining={today.restoresRemainingThisMonth ?? 0}
        />
        <RankProgressCard
          currentRankName={currentRank?.name ?? "Signal Seeker"}
          nextRankName={nextRank?.name ?? null}
          totalPoints={totalPoints}
          nextRankMinPoints={nextRank?.minPoints ?? null}
        />
        <AIReadinessRing
          requiredCompleted={today.summary?.requiredCompleted ?? 0}
          requiredTotal={today.summary?.requiredTotal ?? 0}
          optionalCompleted={today.summary?.optionalCompleted ?? 0}
          optionalTotal={today.summary?.optionalTotal ?? 0}
        />
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <StreakPetAvatar
          stageCode={pet?.pet?.stageCode ?? "seed_signal"}
          stageName={pet?.stageName ?? "Seed Signal"}
          growthScore={pet?.pet?.growthScore ?? 0}
          nextStageName={pet?.nextStage?.name}
          growthNeeded={pet?.nextStage?.growthNeeded}
        />
        <BadgeShelf badges={badgesData?.badges ?? []} />
      </div>

      <section>
        <h2 className="text-lg font-bold text-slate-900">Today's required tasks</h2>
        {requiredTasks.length === 0 ? (
          <p className="mt-2 rounded-xl bg-slate-50 p-4 text-sm text-slate-500">No required tasks right now — check back after logging or scanning.</p>
        ) : (
          <div className="mt-3 flex flex-col gap-3">
            {requiredTasks.map((t: TaskRow) => (
              <DailyTaskCard key={t.id} task={t} onComplete={completeTask} queuedOffline={queuedTaskIds.has(t.id)} errorMessage={taskErrors[t.id]} />
            ))}
          </div>
        )}
      </section>

      <section>
        <h2 className="text-lg font-bold text-slate-900">Optional & improvement tasks</h2>
        {optionalTasks.length === 0 ? (
          <p className="mt-2 rounded-xl bg-slate-50 p-4 text-sm text-slate-500">Nothing optional to do right now.</p>
        ) : (
          <div className="mt-3 flex flex-col gap-3">
            {optionalTasks.map((t: TaskRow) => (
              <DailyTaskCard key={t.id} task={t} onComplete={completeTask} queuedOffline={queuedTaskIds.has(t.id)} errorMessage={taskErrors[t.id]} />
            ))}
          </div>
        )}
      </section>

      {showRestore && (
        <StreakRestoreModal
          onClose={() => setShowRestore(false)}
          restoresRemaining={today.restoresRemainingThisMonth ?? 0}
          candidateDates={restoreCandidates}
          onConfirm={async (date) => {
            await api.restoreStreak(date);
            await load();
          }}
        />
      )}
    </div>
  );
}


