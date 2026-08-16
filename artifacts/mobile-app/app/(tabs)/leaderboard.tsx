import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Platform,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons, Feather } from '@expo/vector-icons';
import {
  useListLeaderboard,
  useGetLeaderboardStats,
  getListLeaderboardQueryKey,
  getGetLeaderboardStatsQueryKey,
  type LeaderboardEntry,
} from '@workspace/api-client-react';
import { useColors } from '@/hooks/useColors';

const BADGE_COLORS: Record<string, string> = {
  Platinum: '#e0c9ff',
  Gold: '#f0b84f',
  Silver: '#93a0bd',
  Bronze: '#f0a35c',
};

const LEVEL_COLORS: Record<string, string> = {
  beginner: '#0acc68',
  intermediate: '#f0b84f',
  advanced: '#f0748a',
};

function TopBadge({ rank }: { rank: number }) {
  const colors = useColors();
  if (rank === 1) return <Text style={styles.medal}>🥇</Text>;
  if (rank === 2) return <Text style={styles.medal}>🥈</Text>;
  if (rank === 3) return <Text style={styles.medal}>🥉</Text>;
  return (
    <View style={[styles.rankBadge, { backgroundColor: colors.muted }]}>
      <Text style={[styles.rankText, { color: colors.mutedForeground }]}>#{rank}</Text>
    </View>
  );
}

function EntryRow({ entry, rank }: { entry: LeaderboardEntry; rank: number }) {
  const colors = useColors();
  // API returns badges in ascending order (Bronze→Platinum); last = highest earned
  const topBadge = entry.badges?.length ? entry.badges[entry.badges.length - 1] : undefined;
  const badgeColor = topBadge ? (BADGE_COLORS[topBadge] ?? colors.primary) : colors.border;
  const levelColor = LEVEL_COLORS[entry.level] ?? colors.mutedForeground;

  return (
    <View style={[styles.entryRow, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <TopBadge rank={rank} />

      <View style={styles.entryInfo}>
        <View style={styles.entryTopRow}>
          <Text style={[styles.playerName, { color: colors.foreground }]} numberOfLines={1}>
            {entry.playerName}
          </Text>
          {entry.timedMode && (
            <View style={[styles.timedChip, { backgroundColor: colors.orange + '20', borderColor: colors.orange + '50' }]}>
              <Ionicons name="timer-outline" size={9} color={colors.orange} />
              <Text style={[styles.timedChipText, { color: colors.orange }]}>TIMED</Text>
            </View>
          )}
        </View>
        <View style={styles.entryBottomRow}>
          <Text style={[styles.courseName, { color: colors.mutedForeground }]} numberOfLines={1}>
            {entry.courseName}
          </Text>
          <View style={[styles.levelChip, { backgroundColor: levelColor + '20' }]}>
            <Text style={[styles.levelChipText, { color: levelColor }]}>
              {entry.level.charAt(0).toUpperCase() + entry.level.slice(1)}
            </Text>
          </View>
        </View>
      </View>

      <View style={styles.entryScore}>
        <Text style={[styles.scoreText, { color: badgeColor }]}>
          {Math.round(entry.percentage)}%
        </Text>
        {topBadge && (
          <Text style={[styles.badgeLabel, { color: badgeColor }]}>
            {topBadge.charAt(0).toUpperCase() + topBadge.slice(1)}
          </Text>
        )}
      </View>
    </View>
  );
}

export default function LeaderboardScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const topPad = Platform.OS === 'web' ? 67 : insets.top;

  const { data: entries, isLoading, isError, refetch } = useListLeaderboard(
    { limit: 50 },
    { query: { retry: 2, queryKey: getListLeaderboardQueryKey({ limit: 50 }) } }
  );
  const { data: stats } = useGetLeaderboardStats({
    query: { queryKey: getGetLeaderboardStatsQueryKey() },
  });

  const keyExtractor = (item: LeaderboardEntry) => String(item.id);

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: topPad + 12, backgroundColor: colors.background, borderBottomColor: colors.border }]}>
        <Text style={[styles.eyebrow, { color: colors.accent }]}>GLOBAL RANKINGS</Text>
        <Text style={[styles.title, { color: colors.foreground }]}>Leaderboard</Text>

        {/* Stats strip */}
        {stats && (
          <View style={[styles.statsRow, { borderColor: colors.border }]}>
            <View style={styles.statItem}>
              <Text style={[styles.statValue, { color: colors.foreground }]}>{stats.totalAttempts}</Text>
              <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>Attempts</Text>
            </View>
            <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
            <View style={styles.statItem}>
              <Text style={[styles.statValue, { color: colors.foreground }]}>
                {Math.round(stats.avgPercentage)}%
              </Text>
              <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>Avg Score</Text>
            </View>
            <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
            <View style={styles.statItem}>
              <Text style={[styles.statValue, { color: colors.amber }]} numberOfLines={1}>
                {stats.topScorer ?? '—'}
              </Text>
              <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>Top Scorer</Text>
            </View>
          </View>
        )}
      </View>

      {isLoading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={colors.accent} />
          <Text style={[styles.loadingText, { color: colors.mutedForeground }]}>Loading rankings…</Text>
        </View>
      ) : isError ? (
        <View style={styles.centered}>
          <Ionicons name="cloud-offline-outline" size={48} color={colors.mutedForeground} />
          <Text style={[styles.errorText, { color: colors.mutedForeground }]}>Could not load leaderboard</Text>
          <TouchableOpacity
            onPress={() => refetch()}
            style={[styles.retryBtn, { borderColor: colors.accent }]}
          >
            <Text style={[styles.retryText, { color: colors.accent }]}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={entries}
          renderItem={({ item, index }) => <EntryRow entry={item} rank={index + 1} />}
          keyExtractor={keyExtractor}
          contentContainerStyle={[
            styles.list,
            { paddingBottom: (Platform.OS === 'web' ? 84 : insets.bottom) + 20 },
          ]}
          showsVerticalScrollIndicator={false}
          scrollEnabled={!!(entries && entries.length > 0)}
          ListEmptyComponent={
            <View style={styles.centered}>
              <Feather name="award" size={44} color={colors.mutedForeground} />
              <Text style={[styles.emptyTitle, { color: colors.foreground }]}>No scores yet</Text>
              <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
                Complete a quiz to appear here
              </Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: {
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
  },
  eyebrow: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 10,
    letterSpacing: 1.5,
    marginBottom: 2,
  },
  title: {
    fontFamily: 'Inter_700Bold',
    fontSize: 28,
    letterSpacing: -0.5,
    marginBottom: 14,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  statItem: { flex: 1, alignItems: 'center' },
  statValue: {
    fontFamily: 'Inter_700Bold',
    fontSize: 16,
    letterSpacing: -0.3,
  },
  statLabel: { fontFamily: 'Inter_400Regular', fontSize: 11, marginTop: 2 },
  statDivider: { width: 1, height: 30 },
  list: { paddingHorizontal: 16, paddingTop: 14, gap: 10 },
  entryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 13,
    gap: 12,
  },
  medal: { fontSize: 24, width: 32, textAlign: 'center' },
  rankBadge: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rankText: { fontFamily: 'Inter_600SemiBold', fontSize: 12 },
  entryInfo: { flex: 1, gap: 4 },
  entryTopRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  playerName: { fontFamily: 'Inter_600SemiBold', fontSize: 14, flex: 1 },
  timedChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
  },
  timedChipText: { fontFamily: 'Inter_700Bold', fontSize: 8, letterSpacing: 0.5 },
  entryBottomRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  courseName: { fontFamily: 'Inter_400Regular', fontSize: 12, flex: 1 },
  levelChip: { paddingHorizontal: 7, paddingVertical: 2, borderRadius: 6 },
  levelChipText: { fontFamily: 'Inter_600SemiBold', fontSize: 10 },
  entryScore: { alignItems: 'flex-end' },
  scoreText: { fontFamily: 'Inter_700Bold', fontSize: 18, letterSpacing: -0.3 },
  badgeLabel: { fontFamily: 'Inter_500Medium', fontSize: 10, marginTop: 1, textTransform: 'capitalize' },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    paddingVertical: 60,
  },
  loadingText: { fontFamily: 'Inter_400Regular', fontSize: 14, marginTop: 8 },
  errorText: { fontFamily: 'Inter_500Medium', fontSize: 15 },
  retryBtn: { paddingHorizontal: 20, paddingVertical: 9, borderRadius: 10, borderWidth: 1, marginTop: 4 },
  retryText: { fontFamily: 'Inter_600SemiBold', fontSize: 14 },
  emptyTitle: { fontFamily: 'Inter_600SemiBold', fontSize: 17 },
  emptyText: { fontFamily: 'Inter_400Regular', fontSize: 14 },
  amber: {},
});
