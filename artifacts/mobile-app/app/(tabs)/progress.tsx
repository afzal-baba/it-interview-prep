import React, { useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Platform,
  ActivityIndicator,
  TouchableOpacity,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather, Ionicons } from '@expo/vector-icons';
import Svg, { Polyline, Circle } from 'react-native-svg';
import {
  useListMyScores,
  getListMyScoresQueryKey,
  type LeaderboardEntry,
} from '@workspace/api-client-react';
import { useColors } from '@/hooks/useColors';
import { useAuth as useAccountAuth } from '@/lib/auth';
import { router } from 'expo-router';

// ─── Types ───────────────────────────────────────────────────────────────────

interface CourseGroup {
  courseId: number;
  courseName: string;
  attempts: LeaderboardEntry[];
  bestPct: number;
  latestPct: number;
  avgPct: number;
  trend: 'up' | 'down' | 'flat';
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getScoreColor(pct: number, colors: ReturnType<typeof import('@/hooks/useColors').useColors>): string {
  if (pct >= 90) return colors.success;
  if (pct >= 70) return colors.amber;
  if (pct >= 50) return colors.orange;
  return colors.destructive;
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

function computeTrend(attempts: LeaderboardEntry[]): 'up' | 'down' | 'flat' {
  if (attempts.length < 2) return 'flat';
  const sorted = [...attempts].sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
  );
  const half = Math.ceil(sorted.length / 2);
  const firstHalf = sorted.slice(0, half);
  const secondHalf = sorted.slice(half);
  const avgFirst = firstHalf.reduce((s, e) => s + e.percentage, 0) / firstHalf.length;
  const avgSecond = secondHalf.reduce((s, e) => s + e.percentage, 0) / secondHalf.length;
  if (avgSecond - avgFirst > 3) return 'up';
  if (avgFirst - avgSecond > 3) return 'down';
  return 'flat';
}

function groupByCourseSortedByWeakest(entries: LeaderboardEntry[]): CourseGroup[] {
  const map = new Map<number, LeaderboardEntry[]>();
  for (const entry of entries) {
    if (!map.has(entry.courseId)) map.set(entry.courseId, []);
    map.get(entry.courseId)!.push(entry);
  }

  return Array.from(map.values())
    .map((attempts) => {
      const sorted = [...attempts].sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
      const bestPct = Math.max(...attempts.map((a) => a.percentage));
      const latestPct = sorted[0].percentage;
      const avgPct = attempts.reduce((s, a) => s + a.percentage, 0) / attempts.length;
      return {
        courseId: attempts[0].courseId,
        courseName: attempts[0].courseName,
        attempts: sorted,
        bestPct,
        latestPct,
        avgPct,
        trend: computeTrend(attempts),
      } as CourseGroup;
    })
    .sort((a, b) => a.bestPct - b.bestPct); // weakest first
}

// ─── Sparkline ───────────────────────────────────────────────────────────────

const SPARK_W = 80;
const SPARK_H = 36;
const SPARK_MAX = 5; // show last N attempts

function Sparkline({ attempts, color }: { attempts: LeaderboardEntry[]; color: string }) {
  const sorted = useMemo(
    () =>
      [...attempts]
        .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
        .slice(-SPARK_MAX),
    [attempts]
  );

  if (sorted.length < 2) {
    // Single dot
    return (
      <Svg width={SPARK_W} height={SPARK_H}>
        <Circle cx={SPARK_W / 2} cy={SPARK_H / 2} r={4} fill={color} />
      </Svg>
    );
  }

  const pcts = sorted.map((e) => e.percentage);
  const minP = Math.max(0, Math.min(...pcts) - 5);
  const maxP = Math.min(100, Math.max(...pcts) + 5);
  const range = Math.max(maxP - minP, 10);

  const points = pcts
    .map((p, i) => {
      const x = (i / (pcts.length - 1)) * (SPARK_W - 8) + 4;
      const y = SPARK_H - 4 - ((p - minP) / range) * (SPARK_H - 8);
      return `${x},${y}`;
    })
    .join(' ');

  const lastX = parseFloat(points.split(' ').at(-1)!.split(',')[0]);
  const lastY = parseFloat(points.split(' ').at(-1)!.split(',')[1]);

  return (
    <Svg width={SPARK_W} height={SPARK_H}>
      <Polyline
        points={points}
        fill="none"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Circle cx={lastX} cy={lastY} r={3.5} fill={color} />
    </Svg>
  );
}

// ─── TrendIcon ────────────────────────────────────────────────────────────────

function TrendIcon({ trend, colors }: { trend: CourseGroup['trend']; colors: ReturnType<typeof import('@/hooks/useColors').useColors> }) {
  if (trend === 'up') return <Ionicons name="trending-up" size={14} color={colors.success} />;
  if (trend === 'down') return <Ionicons name="trending-down" size={14} color={colors.destructive} />;
  return <Feather name="minus" size={13} color={colors.mutedForeground} />;
}

// ─── CourseCard ───────────────────────────────────────────────────────────────

function CourseCard({ group, isWeakest }: { group: CourseGroup; isWeakest: boolean }) {
  const colors = useColors();
  const bestColor = getScoreColor(group.bestPct, colors);
  const latestColor = getScoreColor(group.latestPct, colors);
  const recentAttempts = group.attempts.slice(0, 3);

  return (
    <View
      style={[
        cardStyles.card,
        {
          backgroundColor: colors.card,
          borderColor: isWeakest ? colors.destructive + '50' : colors.border,
        },
      ]}
    >
      {isWeakest && (
        <View style={[cardStyles.weakBanner, { backgroundColor: colors.destructive + '18' }]}>
          <Feather name="alert-triangle" size={11} color={colors.destructive} />
          <Text style={[cardStyles.weakBannerText, { color: colors.destructive }]}>Needs work</Text>
        </View>
      )}

      <View style={cardStyles.topRow}>
        <View style={{ flex: 1 }}>
          <Text style={[cardStyles.courseName, { color: colors.foreground }]} numberOfLines={2}>
            {group.courseName}
          </Text>
          <View style={cardStyles.metaRow}>
            <Text style={[cardStyles.attempts, { color: colors.mutedForeground }]}>
              {group.attempts.length} attempt{group.attempts.length !== 1 ? 's' : ''}
            </Text>
            <View style={cardStyles.trendRow}>
              <TrendIcon trend={group.trend} colors={colors} />
              <Text style={[cardStyles.trendLabel, { color: colors.mutedForeground }]}>
                {group.trend === 'up' ? 'Improving' : group.trend === 'down' ? 'Declining' : 'Steady'}
              </Text>
            </View>
          </View>
        </View>

        <View style={cardStyles.chartArea}>
          <Sparkline attempts={group.attempts} color={latestColor} />
        </View>
      </View>

      <View style={[cardStyles.divider, { backgroundColor: colors.border }]} />

      <View style={cardStyles.statsRow}>
        <View style={cardStyles.statCell}>
          <Text style={[cardStyles.statValue, { color: bestColor }]}>
            {Math.round(group.bestPct)}%
          </Text>
          <Text style={[cardStyles.statLabel, { color: colors.mutedForeground }]}>Best</Text>
        </View>
        <View style={[cardStyles.statDivider, { backgroundColor: colors.border }]} />
        <View style={cardStyles.statCell}>
          <Text style={[cardStyles.statValue, { color: latestColor }]}>
            {Math.round(group.latestPct)}%
          </Text>
          <Text style={[cardStyles.statLabel, { color: colors.mutedForeground }]}>Latest</Text>
        </View>
        <View style={[cardStyles.statDivider, { backgroundColor: colors.border }]} />
        <View style={cardStyles.statCell}>
          <Text style={[cardStyles.statValue, { color: colors.foreground }]}>
            {Math.round(group.avgPct)}%
          </Text>
          <Text style={[cardStyles.statLabel, { color: colors.mutedForeground }]}>Avg</Text>
        </View>
      </View>

      {/* Recent attempts */}
      <View style={{ gap: 6, marginTop: 12 }}>
        {recentAttempts.map((entry) => {
          const pct = Math.round(entry.percentage);
          const pctColor = getScoreColor(pct, colors);
          return (
            <View
              key={entry.id}
              style={[
                cardStyles.attemptRow,
                { backgroundColor: colors.muted, borderColor: colors.border },
              ]}
            >
              <Text
                style={[cardStyles.attemptLevel, { color: colors.mutedForeground }]}
              >
                {entry.level.charAt(0).toUpperCase() + entry.level.slice(1)}
                {entry.timedMode ? ' · ⏱' : ''}
              </Text>
              <Text style={[cardStyles.attemptDate, { color: colors.mutedForeground }]}>
                {formatDate(entry.createdAt)}
              </Text>
              <Text style={[cardStyles.attemptPct, { color: pctColor }]}>{pct}%</Text>
            </View>
          );
        })}
        {group.attempts.length > 3 && (
          <Text style={[cardStyles.moreText, { color: colors.mutedForeground }]}>
            +{group.attempts.length - 3} more attempt{group.attempts.length - 3 !== 1 ? 's' : ''}
          </Text>
        )}
      </View>
    </View>
  );
}

// ─── Summary strip ────────────────────────────────────────────────────────────

function SummaryStrip({
  groups,
  totalAttempts,
  avgPct,
}: {
  groups: CourseGroup[];
  totalAttempts: number;
  avgPct: number;
}) {
  const colors = useColors();
  const avgColor = getScoreColor(avgPct, colors);

  return (
    <View
      style={[stripStyles.strip, { backgroundColor: colors.card, borderColor: colors.border }]}
    >
      <View style={stripStyles.cell}>
        <Text style={[stripStyles.value, { color: colors.accent }]}>{groups.length}</Text>
        <Text style={[stripStyles.label, { color: colors.mutedForeground }]}>Courses</Text>
      </View>
      <View style={[stripStyles.divider, { backgroundColor: colors.border }]} />
      <View style={stripStyles.cell}>
        <Text style={[stripStyles.value, { color: colors.foreground }]}>{totalAttempts}</Text>
        <Text style={[stripStyles.label, { color: colors.mutedForeground }]}>Attempts</Text>
      </View>
      <View style={[stripStyles.divider, { backgroundColor: colors.border }]} />
      <View style={stripStyles.cell}>
        <Text style={[stripStyles.value, { color: avgColor }]}>{Math.round(avgPct)}%</Text>
        <Text style={[stripStyles.label, { color: colors.mutedForeground }]}>Avg Score</Text>
      </View>
    </View>
  );
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function ProgressScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const topPad = Platform.OS === 'web' ? 67 : insets.top;
  const { isAuthenticated } = useAccountAuth();

  const { user } = useAccountAuth();

  // Include the user ID in the query key so each account has its own cache
  // entry. This prevents account A's data from being shown to account B after
  // a login switch.
  const personalScoresKey = [...getListMyScoresQueryKey(), user?.id ?? ''] as const;

  const scoresQuery = useListMyScores({
    query: {
      enabled: isAuthenticated,
      queryKey: personalScoresKey,
    },
  });

  const scores = scoresQuery.data ?? [];

  const groups = useMemo(() => groupByCourseSortedByWeakest(scores), [scores]);
  const totalAttempts = scores.length;
  const avgPct =
    totalAttempts > 0
      ? scores.reduce((s, e) => s + e.percentage, 0) / totalAttempts
      : 0;

  const weakestCourseIds = useMemo(
    () => new Set(groups.filter((g) => g.bestPct < 70).map((g) => g.courseId)),
    [groups]
  );

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View
        style={[
          styles.header,
          {
            paddingTop: topPad + 12,
            backgroundColor: colors.background,
            borderBottomColor: colors.border,
          },
        ]}
      >
        <Text style={[styles.eyebrow, { color: colors.accent }]}>MY LEARNING</Text>
        <Text style={[styles.title, { color: colors.foreground }]}>Progress</Text>
      </View>

      {/* Body */}
      {!isAuthenticated ? (
        <View style={styles.centered}>
          <View
            style={[
              styles.lockCard,
              { backgroundColor: colors.card, borderColor: colors.border },
            ]}
          >
            <Ionicons name="lock-closed-outline" size={40} color={colors.mutedForeground} />
            <Text style={[styles.lockTitle, { color: colors.foreground }]}>
              Sign in to track progress
            </Text>
            <Text style={[styles.lockDesc, { color: colors.mutedForeground }]}>
              Finish a quiz, save your score to the leaderboard, and your history will appear here
              — grouped by course with trend charts.
            </Text>
            <TouchableOpacity
              style={[styles.signInBtn, { backgroundColor: colors.accent }]}
              onPress={() => router.push('/(tabs)/profile')}
            >
              <Text style={[styles.signInBtnText, { color: colors.accentForeground }]}>
                Go to Profile
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : scoresQuery.isLoading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={colors.accent} />
          <Text style={[styles.loadingText, { color: colors.mutedForeground }]}>
            Loading history…
          </Text>
        </View>
      ) : scoresQuery.isError ? (
        <View style={styles.centered}>
          <Ionicons name="cloud-offline-outline" size={40} color={colors.mutedForeground} />
          <Text style={[styles.errorText, { color: colors.mutedForeground }]}>
            Couldn't load history
          </Text>
          <TouchableOpacity
            style={[styles.retryBtn, { borderColor: colors.border }]}
            onPress={() => scoresQuery.refetch()}
          >
            <Text style={[styles.retryText, { color: colors.foreground }]}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : groups.length === 0 ? (
        <View style={styles.centered}>
          <Ionicons name="bar-chart-outline" size={44} color={colors.mutedForeground} />
          <Text style={[styles.emptyTitle, { color: colors.foreground }]}>No history yet</Text>
          <Text style={[styles.emptyDesc, { color: colors.mutedForeground }]}>
            Complete a quiz and save your score to the leaderboard — your progress will appear here,
            grouped by course.
          </Text>
          <TouchableOpacity
            style={[styles.signInBtn, { backgroundColor: colors.accent }]}
            onPress={() => router.push('/')}
          >
            <Text style={[styles.signInBtnText, { color: colors.accentForeground }]}>
              Browse Courses
            </Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={[
            styles.body,
            { paddingBottom: (Platform.OS === 'web' ? 84 : insets.bottom) + 24 },
          ]}
          showsVerticalScrollIndicator={false}
        >
          {/* Summary */}
          <SummaryStrip groups={groups} totalAttempts={totalAttempts} avgPct={avgPct} />

          {/* Needs work section */}
          {weakestCourseIds.size > 0 && (
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Feather name="alert-triangle" size={14} color={colors.destructive} />
                <Text style={[styles.sectionTitle, { color: colors.destructive }]}>
                  Needs Work
                </Text>
              </View>
              <View style={{ gap: 14 }}>
                {groups
                  .filter((g) => weakestCourseIds.has(g.courseId))
                  .map((g) => (
                    <CourseCard key={g.courseId} group={g} isWeakest />
                  ))}
              </View>
            </View>
          )}

          {/* All courses */}
          {groups.filter((g) => !weakestCourseIds.has(g.courseId)).length > 0 && (
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Feather name="bar-chart-2" size={14} color={colors.accent} />
                <Text style={[styles.sectionTitle, { color: colors.accent }]}>All Courses</Text>
              </View>
              <View style={{ gap: 14 }}>
                {groups
                  .filter((g) => !weakestCourseIds.has(g.courseId))
                  .map((g) => (
                    <CourseCard key={g.courseId} group={g} isWeakest={false} />
                  ))}
              </View>
            </View>
          )}

          {/* If all are weak, show them under All Courses too */}
          {weakestCourseIds.size > 0 &&
            groups.filter((g) => !weakestCourseIds.has(g.courseId)).length === 0 && (
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <Feather name="bar-chart-2" size={14} color={colors.accent} />
                  <Text style={[styles.sectionTitle, { color: colors.accent }]}>All Courses</Text>
                </View>
                <Text style={[styles.emptyDesc, { color: colors.mutedForeground }]}>
                  All your scored courses are listed above.
                </Text>
              </View>
            )}
        </ScrollView>
      )}
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: {
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  eyebrow: { fontFamily: 'Inter_600SemiBold', fontSize: 11, letterSpacing: 1.4, marginBottom: 2 },
  title: { fontFamily: 'Inter_700Bold', fontSize: 28, letterSpacing: -0.5 },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    gap: 14,
  },
  lockCard: {
    width: '100%',
    borderRadius: 18,
    borderWidth: 1,
    padding: 24,
    alignItems: 'center',
    gap: 12,
  },
  lockTitle: { fontFamily: 'Inter_700Bold', fontSize: 18, textAlign: 'center' },
  lockDesc: {
    fontFamily: 'Inter_400Regular',
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
  },
  signInBtn: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
    marginTop: 4,
  },
  signInBtnText: { fontFamily: 'Inter_700Bold', fontSize: 15 },
  loadingText: {
    fontFamily: 'Inter_400Regular',
    fontSize: 14,
    marginTop: 8,
  },
  errorText: { fontFamily: 'Inter_500Medium', fontSize: 15, textAlign: 'center' },
  retryBtn: { paddingHorizontal: 20, paddingVertical: 9, borderRadius: 10, borderWidth: 1, marginTop: 4 },
  retryText: { fontFamily: 'Inter_600SemiBold', fontSize: 14 },
  emptyTitle: { fontFamily: 'Inter_700Bold', fontSize: 18, textAlign: 'center' },
  emptyDesc: {
    fontFamily: 'Inter_400Regular',
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
  },
  body: { padding: 16, gap: 0 },
  section: { marginTop: 20, gap: 12 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  sectionTitle: { fontFamily: 'Inter_700Bold', fontSize: 13, letterSpacing: 0.6, textTransform: 'uppercase' },
});

const cardStyles = StyleSheet.create({
  card: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 16,
    overflow: 'hidden',
  },
  weakBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    marginBottom: 12,
    alignSelf: 'flex-start',
  },
  weakBannerText: { fontFamily: 'Inter_600SemiBold', fontSize: 11, letterSpacing: 0.4 },
  topRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  courseName: { fontFamily: 'Inter_700Bold', fontSize: 16, lineHeight: 22 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 6 },
  attempts: { fontFamily: 'Inter_400Regular', fontSize: 12 },
  trendRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  trendLabel: { fontFamily: 'Inter_400Regular', fontSize: 12 },
  chartArea: { alignItems: 'flex-end', justifyContent: 'center' },
  divider: { height: StyleSheet.hairlineWidth, marginVertical: 12 },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statCell: { flex: 1, alignItems: 'center' },
  statValue: { fontFamily: 'Inter_700Bold', fontSize: 18, letterSpacing: -0.3 },
  statLabel: { fontFamily: 'Inter_400Regular', fontSize: 11, marginTop: 2 },
  statDivider: { width: StyleSheet.hairlineWidth, height: 32 },
  attemptRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
  },
  attemptLevel: { fontFamily: 'Inter_500Medium', fontSize: 12, flex: 1, textTransform: 'capitalize' },
  attemptDate: { fontFamily: 'Inter_400Regular', fontSize: 12, marginRight: 12 },
  attemptPct: { fontFamily: 'Inter_700Bold', fontSize: 14 },
  moreText: { fontFamily: 'Inter_400Regular', fontSize: 12, textAlign: 'center', marginTop: 2 },
});

const stripStyles = StyleSheet.create({
  strip: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    borderWidth: 1,
    paddingVertical: 14,
    marginBottom: 4,
  },
  cell: { flex: 1, alignItems: 'center' },
  value: { fontFamily: 'Inter_700Bold', fontSize: 22, letterSpacing: -0.5 },
  label: { fontFamily: 'Inter_400Regular', fontSize: 11, marginTop: 2 },
  divider: { width: StyleSheet.hairlineWidth, height: 36 },
});
