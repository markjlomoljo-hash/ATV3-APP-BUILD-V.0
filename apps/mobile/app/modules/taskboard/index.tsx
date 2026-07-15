/**
 * Task Board & Gamification — streaks, XP, badges, daily tasks
 */
import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, Alert, ActivityIndicator, RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import {
  getOrCreateGamification, fetchUserBadges, fetchAllBadges, fetchPointsHistory,
  awardPoints, incrementStreak, POINT_VALUES, RANKS, PET_STAGES,
  GamificationRecord, UserBadge, Badge, PointsLedgerEntry,
} from '../../../src/lib/gamification-service';
import { Colors, Spacing } from '../../../src/components/ui/theme';

type Tab = 'overview' | 'badges' | 'history';

// Daily tasks definition (deterministic — not AI-generated)
const DAILY_TASKS = [
  { id: 'log_skin', label: 'Log your skin state', module: 'skin-state', points: POINT_VALUES.skin_log, icon: '🔬' },
  { id: 'log_sleep', label: 'Log last night\'s sleep', module: 'sleep', points: POINT_VALUES.sleep_log, icon: '😴' },
  { id: 'log_food', label: 'Log a meal', module: 'food', points: POINT_VALUES.food_log, icon: '🥗' },
  { id: 'treatment_checkin', label: 'Complete treatment check-in', module: 'treatment', points: POINT_VALUES.treatment_checkin, icon: '💊' },
  { id: 'log_context', label: 'Log context (stress/activity)', module: 'context', points: POINT_VALUES.context_log, icon: '📊' },
] as const;

export default function TaskBoardScreen() {
  const [activeTab, setActiveTab] = useState<Tab>('overview');
  const [gamif, setGamif] = useState<GamificationRecord | null>(null);
  const [userBadges, setUserBadges] = useState<UserBadge[]>([]);
  const [allBadges, setAllBadges] = useState<Badge[]>([]);
  const [history, setHistory] = useState<PointsLedgerEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadAll = useCallback(async () => {
    try {
      const [g, ub, ab, h] = await Promise.all([
        getOrCreateGamification(),
        fetchUserBadges(),
        fetchAllBadges(),
        fetchPointsHistory(20),
      ]);
      setGamif(g);
      setUserBadges(ub);
      setAllBadges(ab);
      setHistory(h);
    } catch (e) {
      console.error('Failed to load gamification:', e);
    }
  }, []);

  useEffect(() => {
    (async () => {
      setLoading(true);
      await loadAll();
      setLoading(false);
    })();
  }, [loadAll]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadAll();
    setRefreshing(false);
  };

  const handleQuickLog = async (taskId: string, module: string, points: number) => {
    // Navigate to the module for actual logging
    const today = new Date().toISOString().split('T')[0];
    const idempotencyKey = `task-${taskId}-${today}-${gamif?.user_id}`;

    try {
      await incrementStreak();
      await awardPoints(points, `Daily task: ${taskId}`, 'daily_task', taskId, idempotencyKey);
      await loadAll();
      Alert.alert('Points Earned!', `+${points} XP for completing this task. Navigate to the module to log details.`, [
        { text: 'Go to Module', onPress: () => router.push(`/modules/${module}` as any) },
        { text: 'OK' },
      ]);
    } catch (e: any) {
      if (e?.message?.includes('duplicate') || e?.message?.includes('idempotency')) {
        Alert.alert('Already Done', 'You already earned points for this task today.');
      } else {
        console.error('Award points failed:', e);
      }
    }
  };

  // Determine current rank progress
  const rankProgress = () => {
    if (!gamif) return { current: 'Newcomer', next: 'Observer', pct: 0, pointsToNext: 100 };
    const currentRankIdx = RANKS.findIndex(r => gamif.points >= r.min && gamif.points <= r.max);
    const current = RANKS[currentRankIdx];
    const next = RANKS[currentRankIdx + 1];
    if (!next) return { current: current?.name ?? 'Legend', next: null, pct: 100, pointsToNext: 0 };
    const range = next.min - current.min;
    const progress = gamif.points - current.min;
    return {
      current: current.name,
      next: next.name,
      pct: Math.min(100, Math.round((progress / range) * 100)),
      pointsToNext: next.min - gamif.points,
    };
  };

  const petStageLabel = (stage: string) => PET_STAGES.find(p => p.stage === stage)?.label ?? stage;

  // Check which tasks were done today (based on points history)
  const today = new Date().toISOString().split('T')[0];
  const todayTaskIds = new Set(
    history
      .filter(h => h.created_at.startsWith(today) && h.source_type === 'daily_task')
      .map(h => h.source_id)
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <ActivityIndicator size="large" color={Colors.primary} style={{ marginTop: 80 }} />
      </SafeAreaView>
    );
  }

  const rp = rankProgress();

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.backButton}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Task Board</Text>
        <View style={{ width: 60 }} />
      </View>

      {/* Tab bar */}
      <View style={styles.tabBar}>
        {(['overview', 'badges', 'history'] as Tab[]).map(tab => (
          <TouchableOpacity
            key={tab}
            style={[styles.tab, activeTab === tab && styles.tabActive]}
            onPress={() => setActiveTab(tab)}
          >
            <Text style={[styles.tabLabel, activeTab === tab && styles.tabLabelActive]}>
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView style={styles.scroll} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}>
        {/* Overview Tab */}
        {activeTab === 'overview' && gamif && (
          <View>
            {/* Stats row */}
            <View style={styles.statsCard}>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{gamif.current_streak}</Text>
                <Text style={styles.statLabel}>Day Streak 🔥</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{gamif.points}</Text>
                <Text style={styles.statLabel}>Total XP</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{gamif.longest_streak}</Text>
                <Text style={styles.statLabel}>Best Streak</Text>
              </View>
            </View>

            {/* Rank progress */}
            <View style={styles.rankCard}>
              <View style={styles.rankHeader}>
                <Text style={styles.rankTitle}>{rp.current}</Text>
                {rp.next && <Text style={styles.rankNext}>→ {rp.next}</Text>}
              </View>
              <View style={styles.progressBar}>
                <View style={[styles.progressFill, { width: `${rp.pct}%` }]} />
              </View>
              {rp.next && (
                <Text style={styles.rankSubtitle}>{rp.pointsToNext} XP to {rp.next}</Text>
              )}
            </View>

            {/* Pet */}
            <View style={styles.petCard}>
              <Text style={styles.petEmoji}>
                {gamif.pet_stage === 'egg' ? '🥚' : gamif.pet_stage === 'hatchling' ? '🐣' : gamif.pet_stage === 'juvenile' ? '🐥' : gamif.pet_stage === 'adolescent' ? '🐦' : gamif.pet_stage === 'adult' ? '🦅' : '🦁'}
              </Text>
              <View style={{ flex: 1 }}>
                <Text style={styles.petName}>Your Skin Companion</Text>
                <Text style={styles.petStage}>{petStageLabel(gamif.pet_stage)} · {gamif.pet_xp} XP</Text>
                <View style={styles.petProgressBar}>
                  <View style={[styles.petProgressFill, {
                    width: `${Math.min(100, (gamif.pet_xp % 500) / 5)}%`
                  }]} />
                </View>
              </View>
            </View>

            {/* Daily tasks */}
            <Text style={styles.sectionTitle}>Today's Tasks</Text>
            {DAILY_TASKS.map(task => {
              const done = todayTaskIds.has(task.id);
              return (
                <View key={task.id} style={[styles.taskCard, done && styles.taskCardDone]}>
                  <Text style={styles.taskIcon}>{task.icon}</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.taskLabel, done && styles.taskLabelDone]}>{task.label}</Text>
                    <Text style={styles.taskPoints}>+{task.points} XP</Text>
                  </View>
                  {done ? (
                    <Text style={styles.taskDoneCheck}>✓</Text>
                  ) : (
                    <TouchableOpacity
                      style={styles.taskButton}
                      onPress={() => handleQuickLog(task.id, task.module, task.points)}
                    >
                      <Text style={styles.taskButtonText}>Go</Text>
                    </TouchableOpacity>
                  )}
                </View>
              );
            })}

            {/* Streak info */}
            <View style={styles.streakInfoCard}>
              <Text style={styles.streakInfoTitle}>Streak Milestones</Text>
              <Text style={styles.streakInfoItem}>7 days → +{POINT_VALUES.streak_bonus_7d} XP bonus</Text>
              <Text style={styles.streakInfoItem}>30 days → +{POINT_VALUES.streak_bonus_30d} XP bonus</Text>
              <Text style={styles.streakInfoItem}>100 days → +{POINT_VALUES.streak_bonus_100d} XP bonus</Text>
            </View>
          </View>
        )}

        {/* Badges Tab */}
        {activeTab === 'badges' && (
          <View>
            <Text style={styles.sectionTitle}>
              Earned ({userBadges.length}/{allBadges.length})
            </Text>
            {userBadges.length === 0 && (
              <Text style={styles.emptyText}>No badges earned yet. Keep logging to unlock achievements!</Text>
            )}
            {userBadges.map(ub => (
              <View key={ub.id} style={[styles.badgeCard, styles.badgeCardEarned]}>
                <Text style={styles.badgeIcon}>{ub.badge?.icon ?? '🏅'}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={styles.badgeTitle}>{ub.badge?.title ?? 'Badge'}</Text>
                  <Text style={styles.badgeDescription}>{ub.badge?.description}</Text>
                  <Text style={styles.badgeEarned}>Earned {new Date(ub.earned_at).toLocaleDateString()}</Text>
                </View>
              </View>
            ))}

            {allBadges.filter(b => !userBadges.some(ub => ub.badge_id === b.id)).length > 0 && (
              <>
                <Text style={styles.sectionTitle}>Locked</Text>
                {allBadges.filter(b => !userBadges.some(ub => ub.badge_id === b.id)).map(badge => (
                  <View key={badge.id} style={[styles.badgeCard, styles.badgeCardLocked]}>
                    <Text style={[styles.badgeIcon, { opacity: 0.3 }]}>{badge.icon}</Text>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.badgeTitle, { color: Colors.textMuted }]}>{badge.title}</Text>
                      <Text style={styles.badgeDescription}>{badge.description}</Text>
                    </View>
                    <Text style={styles.lockIcon}>🔒</Text>
                  </View>
                ))}
              </>
            )}
          </View>
        )}

        {/* History Tab */}
        {activeTab === 'history' && (
          <View>
            <Text style={styles.sectionTitle}>Points History</Text>
            {history.length === 0 && <Text style={styles.emptyText}>No points earned yet.</Text>}
            {history.map(entry => (
              <View key={entry.id} style={styles.historyCard}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.historyReason}>{entry.reason}</Text>
                  <Text style={styles.historyDate}>{new Date(entry.created_at).toLocaleDateString()}</Text>
                </View>
                <Text style={[styles.historyDelta, entry.points_delta > 0 ? styles.historyPositive : styles.historyNegative]}>
                  {entry.points_delta > 0 ? '+' : ''}{entry.points_delta}
                </Text>
              </View>
            ))}
          </View>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm,
    borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  backButton: { fontSize: 16, color: Colors.primary },
  headerTitle: { fontSize: 18, fontWeight: '700', color: Colors.text },
  tabBar: {
    flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  tab: { flex: 1, paddingVertical: 12, alignItems: 'center' },
  tabActive: { borderBottomWidth: 2, borderBottomColor: Colors.primary },
  tabLabel: { fontSize: 14, color: Colors.textMuted },
  tabLabelActive: { color: Colors.primary, fontWeight: '700' },
  scroll: { flex: 1 },
  statsCard: {
    flexDirection: 'row', marginHorizontal: Spacing.md, marginTop: Spacing.md,
    backgroundColor: Colors.surface, borderRadius: 12, padding: Spacing.md,
    alignItems: 'center',
  },
  statItem: { flex: 1, alignItems: 'center' },
  statValue: { fontSize: 28, fontWeight: '800', color: Colors.primary },
  statLabel: { fontSize: 11, color: Colors.textMuted, marginTop: 2 },
  statDivider: { width: 1, height: 40, backgroundColor: Colors.border },
  rankCard: {
    marginHorizontal: Spacing.md, marginTop: Spacing.md,
    backgroundColor: Colors.surface, borderRadius: 12, padding: Spacing.md,
  },
  rankHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  rankTitle: { fontSize: 16, fontWeight: '700', color: Colors.text },
  rankNext: { fontSize: 14, color: Colors.textMuted },
  progressBar: {
    height: 8, backgroundColor: Colors.border, borderRadius: 4, overflow: 'hidden',
  },
  progressFill: { height: '100%', backgroundColor: Colors.primary, borderRadius: 4 },
  rankSubtitle: { fontSize: 12, color: Colors.textMuted, marginTop: 4 },
  petCard: {
    flexDirection: 'row', alignItems: 'center',
    marginHorizontal: Spacing.md, marginTop: Spacing.md,
    backgroundColor: Colors.surface, borderRadius: 12, padding: Spacing.md, gap: 12,
  },
  petEmoji: { fontSize: 40 },
  petName: { fontSize: 14, fontWeight: '700', color: Colors.text },
  petStage: { fontSize: 12, color: Colors.textMuted, marginTop: 2 },
  petProgressBar: {
    height: 6, backgroundColor: Colors.border, borderRadius: 3, overflow: 'hidden', marginTop: 6,
  },
  petProgressFill: { height: '100%', backgroundColor: '#FFB300', borderRadius: 3 },
  sectionTitle: {
    fontSize: 15, fontWeight: '700', color: Colors.text,
    marginHorizontal: Spacing.md, marginTop: Spacing.md, marginBottom: Spacing.xs,
  },
  taskCard: {
    flexDirection: 'row', alignItems: 'center',
    marginHorizontal: Spacing.md, marginBottom: Spacing.sm,
    backgroundColor: Colors.surface, borderRadius: 12, padding: Spacing.md, gap: 12,
  },
  taskCardDone: { opacity: 0.6, backgroundColor: Colors.success + '15' },
  taskIcon: { fontSize: 24 },
  taskLabel: { fontSize: 14, fontWeight: '600', color: Colors.text },
  taskLabelDone: { textDecorationLine: 'line-through', color: Colors.textMuted },
  taskPoints: { fontSize: 12, color: Colors.primary, marginTop: 2 },
  taskButton: {
    backgroundColor: Colors.primary, borderRadius: 8,
    paddingHorizontal: 16, paddingVertical: 8,
  },
  taskButtonText: { color: '#fff', fontSize: 13, fontWeight: '700' },
  taskDoneCheck: { fontSize: 20, color: Colors.success, fontWeight: '700' },
  streakInfoCard: {
    marginHorizontal: Spacing.md, marginTop: Spacing.md,
    backgroundColor: '#FFF8E1', borderRadius: 12, padding: Spacing.md,
    borderLeftWidth: 4, borderLeftColor: '#FFB300',
  },
  streakInfoTitle: { fontSize: 14, fontWeight: '700', color: Colors.text, marginBottom: 6 },
  streakInfoItem: { fontSize: 13, color: Colors.textSecondary, marginBottom: 2 },
  badgeCard: {
    flexDirection: 'row', alignItems: 'center',
    marginHorizontal: Spacing.md, marginBottom: Spacing.sm,
    borderRadius: 12, padding: Spacing.md, gap: 12,
  },
  badgeCardEarned: { backgroundColor: '#F0FFF4', borderWidth: 1, borderColor: '#4CAF50' },
  badgeCardLocked: { backgroundColor: Colors.surface },
  badgeIcon: { fontSize: 32 },
  badgeTitle: { fontSize: 14, fontWeight: '700', color: Colors.text },
  badgeDescription: { fontSize: 12, color: Colors.textSecondary, marginTop: 2 },
  badgeEarned: { fontSize: 11, color: Colors.success, marginTop: 2 },
  lockIcon: { fontSize: 16 },
  historyCard: {
    flexDirection: 'row', alignItems: 'center',
    marginHorizontal: Spacing.md, marginBottom: Spacing.sm,
    backgroundColor: Colors.surface, borderRadius: 12, padding: Spacing.md,
  },
  historyReason: { fontSize: 14, color: Colors.text },
  historyDate: { fontSize: 12, color: Colors.textMuted, marginTop: 2 },
  historyDelta: { fontSize: 16, fontWeight: '700' },
  historyPositive: { color: Colors.success },
  historyNegative: { color: '#D32F2F' },
  emptyText: { textAlign: 'center', color: Colors.textMuted, marginTop: 40, fontSize: 14, paddingHorizontal: Spacing.xl },
});
