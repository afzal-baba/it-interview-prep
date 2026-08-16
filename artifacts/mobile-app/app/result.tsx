import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  TextInput,
  Platform,
  ScrollView,
  ActivityIndicator,
  Pressable,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons, Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { useCreateLeaderboardEntry } from '@workspace/api-client-react';
import { useQuizContext } from '@/contexts/QuizContext';
import { useColors } from '@/hooks/useColors';
import { useAuth } from '@/contexts/AuthContext';

const BADGE_META: Record<string, { color: string; icon: string; label: string }> = {
  Platinum: { color: '#e0c9ff', icon: 'diamond-outline', label: 'Platinum' },
  Gold:     { color: '#f0b84f', icon: 'trophy-outline',  label: 'Gold'     },
  Silver:   { color: '#93a0bd', icon: 'medal-outline',   label: 'Silver'   },
  Bronze:   { color: '#f0a35c', icon: 'ribbon-outline',  label: 'Bronze'   },
};

function getScoreColor(pct: number, colors: ReturnType<typeof import('@/hooks/useColors').useColors>): string {
  if (pct >= 90) return colors.success;
  if (pct >= 70) return colors.amber;
  if (pct >= 50) return colors.orange;
  return colors.destructive;
}

export default function ResultScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const topPad = Platform.OS === 'web' ? 67 : insets.top;
  const botPad = Platform.OS === 'web' ? 34 : insets.bottom;

  const { result, selectedCourse, timedMode, setSession, setResult } = useQuizContext();
  const createEntry = useCreateLeaderboardEntry();
  const { playerName: storedName } = useAuth();

  const [showSaveModal, setShowSaveModal] = useState(false);
  const [playerName, setPlayerName] = useState(storedName ?? '');
  const [saved, setSaved] = useState(false);

  if (!result) {
    return (
      <View style={[styles.root, styles.centered, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.accent} />
      </View>
    );
  }

  const pct = Math.round(result.percentage);
  const scoreColor = getScoreColor(pct, colors);
  // API returns badges in ascending order (Bronze→Platinum); last = highest earned
  const topBadge = result.badges?.length ? result.badges[result.badges.length - 1] : undefined;
  const badgeMeta = topBadge ? (BADGE_META[topBadge] ?? null) : null;

  const handleSave = () => {
    const name = playerName.trim();
    if (!name) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    createEntry.mutate(
      { data: { sessionId: result.sessionId, playerName: name } },
      {
        onSuccess: () => {
          setSaved(true);
          setShowSaveModal(false);
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        },
      }
    );
  };

  const handlePlayAgain = () => {
    setSession(null);
    setResult(null);
    router.replace('/');
  };

  const handleHome = () => {
    setSession(null);
    setResult(null);
    router.replace('/');
  };

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <ScrollView
        contentContainerStyle={[styles.content, { paddingTop: topPad + 20, paddingBottom: botPad + 24 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Close button */}
        <TouchableOpacity
          onPress={handleHome}
          style={[styles.closeBtn, { backgroundColor: colors.muted }]}
        >
          <Feather name="x" size={18} color={colors.foreground} />
        </TouchableOpacity>

        {/* Score display */}
        <View style={styles.scoreSection}>
          <Text style={[styles.scoreLabel, { color: colors.mutedForeground }]}>SCORE</Text>
          <Text style={[styles.scorePct, { color: scoreColor }]}>{pct}%</Text>
          <View style={[styles.scoreBar, { backgroundColor: colors.muted }]}>
            <View style={[styles.scoreBarFill, { width: `${pct}%` as any, backgroundColor: scoreColor }]} />
          </View>
          <Text style={[styles.correctCount, { color: colors.mutedForeground }]}>
            {result.correctCount} correct out of {result.totalQuestions}
          </Text>
        </View>

        {/* Badge */}
        {badgeMeta && (
          <View style={[styles.badgeCard, { backgroundColor: colors.card, borderColor: badgeMeta.color + '40' }]}>
            <Ionicons name={badgeMeta.icon as any} size={36} color={badgeMeta.color} />
            <View style={{ marginLeft: 16 }}>
              <Text style={[styles.badgeLabel, { color: badgeMeta.color }]}>{badgeMeta.label} Badge</Text>
              <Text style={[styles.badgeSub, { color: colors.mutedForeground }]}>Earned for this performance</Text>
            </View>
          </View>
        )}

        {/* Stats grid */}
        <View style={[styles.statsGrid, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: colors.foreground }]}>{result.totalQuestions}</Text>
            <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>Questions</Text>
          </View>
          <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: colors.success }]}>{result.correctCount}</Text>
            <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>Correct</Text>
          </View>
          <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: colors.destructive }]}>
              {result.totalQuestions - result.correctCount}
            </Text>
            <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>Incorrect</Text>
          </View>
          {timedMode && result.timeBonus !== undefined && (
            <>
              <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
              <View style={styles.statItem}>
                <Text style={[styles.statValue, { color: colors.orange }]}>+{result.timeBonus}</Text>
                <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>Time Bonus</Text>
              </View>
            </>
          )}
        </View>

        {/* Course info */}
        {selectedCourse && (
          <View style={[styles.courseRow, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={[styles.courseIcon, { backgroundColor: colors.muted }]}>
              <Text style={[styles.courseIconText, { color: colors.accent }]}>
                {selectedCourse.name.slice(0, 2).toUpperCase()}
              </Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.courseLabel, { color: colors.mutedForeground }]}>COMPLETED</Text>
              <Text style={[styles.courseName, { color: colors.foreground }]}>{selectedCourse.name}</Text>
            </View>
            {timedMode && (
              <View style={[styles.timedChip, { backgroundColor: colors.orange + '20', borderColor: colors.orange + '40' }]}>
                <Ionicons name="timer-outline" size={11} color={colors.orange} />
                <Text style={[styles.timedChipText, { color: colors.orange }]}>TIMED</Text>
              </View>
            )}
          </View>
        )}

        {/* Save leaderboard */}
        {!saved ? (
          <TouchableOpacity
            style={[styles.saveBtn, { backgroundColor: colors.accent + '20', borderColor: colors.accent + '50' }]}
            onPress={() => setShowSaveModal(true)}
            activeOpacity={0.75}
          >
            <Ionicons name="trophy-outline" size={18} color={colors.accent} />
            <Text style={[styles.saveBtnText, { color: colors.accent }]}>Save to Leaderboard</Text>
          </TouchableOpacity>
        ) : (
          <View style={[styles.savedRow, { backgroundColor: colors.success + '15', borderColor: colors.success + '40' }]}>
            <Ionicons name="checkmark-circle" size={18} color={colors.success} />
            <Text style={[styles.savedText, { color: colors.success }]}>Score saved to leaderboard!</Text>
          </View>
        )}

        {/* Action buttons */}
        <TouchableOpacity
          style={[styles.primaryBtn, { backgroundColor: colors.primary }]}
          onPress={handlePlayAgain}
          activeOpacity={0.8}
        >
          <Ionicons name="refresh-outline" size={18} color={colors.primaryForeground} />
          <Text style={[styles.primaryBtnText, { color: colors.primaryForeground }]}>Practice Again</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.ghostBtn, { borderColor: colors.border }]}
          onPress={handleHome}
          activeOpacity={0.75}
        >
          <Text style={[styles.ghostBtnText, { color: colors.mutedForeground }]}>Back to Courses</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Save modal */}
      <Modal visible={showSaveModal} transparent animationType="slide" onRequestClose={() => setShowSaveModal(false)}>
        <Pressable style={styles.modalOverlay} onPress={() => setShowSaveModal(false)}>
          <Pressable
            style={[styles.modalSheet, { backgroundColor: colors.card, borderColor: colors.border, paddingBottom: botPad + 24 }]}
            onPress={(e) => e.stopPropagation()}
          >
            <View style={[styles.sheetHandle, { backgroundColor: colors.border }]} />
            <Text style={[styles.sheetTitle, { color: colors.foreground }]}>Save Your Score</Text>
            <Text style={[styles.sheetSub, { color: colors.mutedForeground }]}>
              Enter your name to appear on the global leaderboard
            </Text>
            <TextInput
              style={[styles.nameInput, { backgroundColor: colors.muted, borderColor: colors.border, color: colors.foreground }]}
              placeholder="Your name…"
              placeholderTextColor={colors.mutedForeground}
              value={playerName}
              onChangeText={setPlayerName}
              maxLength={30}
              autoCapitalize="words"
              returnKeyType="done"
              onSubmitEditing={handleSave}
            />
            <TouchableOpacity
              style={[styles.saveSubmitBtn, { backgroundColor: colors.primary, opacity: playerName.trim().length > 0 ? 1 : 0.5 }]}
              onPress={handleSave}
              disabled={createEntry.isPending || playerName.trim().length === 0}
              activeOpacity={0.8}
            >
              {createEntry.isPending ? (
                <ActivityIndicator size="small" color={colors.primaryForeground} />
              ) : (
                <Text style={[styles.saveSubmitText, { color: colors.primaryForeground }]}>Save Score</Text>
              )}
            </TouchableOpacity>
            {createEntry.isError && (
              <Text style={[styles.saveError, { color: colors.destructive }]}>Failed to save. Try again.</Text>
            )}
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  centered: { alignItems: 'center', justifyContent: 'center' },
  content: { paddingHorizontal: 20, gap: 16 },
  closeBtn: {
    alignSelf: 'flex-end',
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  scoreSection: { alignItems: 'center', paddingVertical: 8 },
  scoreLabel: { fontFamily: 'Inter_600SemiBold', fontSize: 11, letterSpacing: 1.5, marginBottom: 6 },
  scorePct: { fontFamily: 'Inter_700Bold', fontSize: 64, letterSpacing: -2, lineHeight: 70 },
  scoreBar: { width: '100%', height: 6, borderRadius: 3, marginTop: 16, marginBottom: 10, overflow: 'hidden' },
  scoreBarFill: { height: 6, borderRadius: 3 },
  correctCount: { fontFamily: 'Inter_400Regular', fontSize: 14 },
  badgeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    borderWidth: 1,
    padding: 18,
  },
  badgeLabel: { fontFamily: 'Inter_700Bold', fontSize: 17 },
  badgeSub: { fontFamily: 'Inter_400Regular', fontSize: 13, marginTop: 2 },
  statsGrid: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    borderWidth: 1,
    paddingVertical: 16,
  },
  statItem: { flex: 1, alignItems: 'center' },
  statValue: { fontFamily: 'Inter_700Bold', fontSize: 22, letterSpacing: -0.5 },
  statLabel: { fontFamily: 'Inter_400Regular', fontSize: 11, marginTop: 3 },
  statDivider: { width: 1, height: 36 },
  courseRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
  },
  courseIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  courseIconText: { fontFamily: 'Inter_700Bold', fontSize: 12 },
  courseLabel: { fontFamily: 'Inter_500Medium', fontSize: 10, letterSpacing: 1 },
  courseName: { fontFamily: 'Inter_600SemiBold', fontSize: 15, marginTop: 2 },
  timedChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
  },
  timedChipText: { fontFamily: 'Inter_700Bold', fontSize: 9, letterSpacing: 0.5 },
  saveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: 14,
    borderWidth: 1,
    paddingVertical: 14,
  },
  saveBtnText: { fontFamily: 'Inter_600SemiBold', fontSize: 15 },
  savedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: 14,
    borderWidth: 1,
    paddingVertical: 14,
  },
  savedText: { fontFamily: 'Inter_600SemiBold', fontSize: 15 },
  primaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: 14,
    paddingVertical: 16,
  },
  primaryBtnText: { fontFamily: 'Inter_700Bold', fontSize: 16 },
  ghostBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 14,
    borderWidth: 1,
    paddingVertical: 14,
  },
  ghostBtnText: { fontFamily: 'Inter_600SemiBold', fontSize: 15 },
  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.65)', justifyContent: 'flex-end' },
  modalSheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
    borderBottomWidth: 0,
    paddingHorizontal: 24,
    paddingTop: 14,
  },
  sheetHandle: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 2,
    marginBottom: 20,
  },
  sheetTitle: { fontFamily: 'Inter_700Bold', fontSize: 22, marginBottom: 8 },
  sheetSub: { fontFamily: 'Inter_400Regular', fontSize: 14, lineHeight: 21, marginBottom: 20 },
  nameInput: {
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontFamily: 'Inter_400Regular',
    fontSize: 16,
    marginBottom: 14,
  },
  saveSubmitBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 14,
    paddingVertical: 16,
  },
  saveSubmitText: { fontFamily: 'Inter_700Bold', fontSize: 16 },
  saveError: { fontFamily: 'Inter_400Regular', fontSize: 13, textAlign: 'center', marginTop: 8 },
});
