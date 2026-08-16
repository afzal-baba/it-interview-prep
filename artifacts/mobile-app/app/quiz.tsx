import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Platform,
  ActivityIndicator,
  Pressable,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons, Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import {
  useListQuestions,
  useSubmitSession,
  getListQuestionsQueryKey,
  type AnswerInput,
} from '@workspace/api-client-react';
import { useQuizContext } from '@/contexts/QuizContext';
import { useColors } from '@/hooks/useColors';

const QUESTION_TIME_MS = 30_000;

export default function QuizScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { session, timedMode, setResult } = useQuizContext();
  const submitSession = useSubmitSession();
  const topPad = Platform.OS === 'web' ? 67 : insets.top;
  const botPad = Platform.OS === 'web' ? 34 : insets.bottom;

  const level = session?.level as 'beginner' | 'intermediate' | 'advanced';
  const { data: rawQuestions, isLoading } = useListQuestions(
    session?.courseId ?? 0,
    { level },
    {
      query: {
        enabled: !!session,
        queryKey: getListQuestionsQueryKey(session?.courseId ?? 0, { level }),
      },
    }
  );

  // Shuffle options client-side once per question load. originalIndexMap[shuffledIdx] → DB index.
  const questions = useMemo(() => {
    if (!rawQuestions) return null;
    return rawQuestions.map((q) => {
      const positions = [0, 1, 2, 3];
      for (let i = positions.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [positions[i], positions[j]] = [positions[j], positions[i]];
      }
      return {
        ...q,
        options: positions.map((p) => q.options[p]),
        correctOptionIndex: positions.indexOf(q.correctOptionIndex),
        originalIndexMap: positions,
      };
    });
  }, [rawQuestions]);

  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<(AnswerInput & { timeTakenMs?: number })[]>([]);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [isRevealed, setIsRevealed] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState(QUESTION_TIME_MS);

  const questionStartTime = useRef(Date.now());
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const handleTimeoutRef = useRef<(() => void) | null>(null);

  // Redirect if no session
  useEffect(() => {
    if (!session) router.replace('/');
  }, [session]);

  // Timer per question
  useEffect(() => {
    if (!timedMode || isRevealed) return;
    setTimeRemaining(QUESTION_TIME_MS);
    questionStartTime.current = Date.now();
    timerRef.current = setInterval(() => {
      const remaining = Math.max(0, QUESTION_TIME_MS - (Date.now() - questionStartTime.current));
      setTimeRemaining(remaining);
    }, 100);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [currentIndex, timedMode, isRevealed]);

  // Timeout auto-select
  useEffect(() => {
    if (!timedMode || timeRemaining > 0 || isRevealed) return;
    handleTimeoutRef.current?.();
  }, [timeRemaining, timedMode, isRevealed]);

  const handleSelect = useCallback(
    (idx: number, forcedTimeMs?: number) => {
      if (isRevealed) return;
      if (timerRef.current) clearInterval(timerRef.current);
      const elapsed = forcedTimeMs ?? (Date.now() - questionStartTime.current);
      setSelectedOption(idx);
      setIsRevealed(true);
      const currentQ = questions?.[currentIndex];
      if (currentQ) {
        const isCorrect = idx === currentQ.correctOptionIndex;
        if (isCorrect) {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        } else if (idx !== -1) {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        }
        // Translate shuffled display index → original DB index so server scoring is correct.
        const originalIdx = idx === -1 ? -1 : currentQ.originalIndexMap[idx];
        setAnswers((prev) => [
          ...prev,
          {
            questionId: currentQ.id,
            selectedOptionIndex: originalIdx,
            timeTakenMs: timedMode ? elapsed : undefined,
          },
        ]);
      }
    },
    [isRevealed, questions, currentIndex, timedMode]
  );

  handleTimeoutRef.current = () => {
    if (!isRevealed) handleSelect(-1, QUESTION_TIME_MS);
  };

  if (!session || isLoading || !questions) {
    return (
      <View style={[styles.root, styles.centered, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.accent} />
        <Text style={[styles.loadingText, { color: colors.mutedForeground }]}>
          Preparing questions…
        </Text>
      </View>
    );
  }

  const currentQ = questions[currentIndex];
  const isLastQuestion = currentIndex === questions.length - 1;
  const progress = (currentIndex / questions.length) * 100;
  const timerPct = (timeRemaining / QUESTION_TIME_MS) * 100;
  const timerSeconds = Math.ceil(timeRemaining / 1000);
  const isTimerCritical = timedMode && timeRemaining < 10_000;
  const isTimedOut = timedMode && timeRemaining === 0;
  const isCorrect = selectedOption !== null && selectedOption >= 0 && selectedOption === currentQ.correctOptionIndex;
  const timerColor = isTimerCritical ? colors.destructive : colors.orange;

  const handleNext = () => {
    if (!isLastQuestion) {
      setSelectedOption(null);
      setIsRevealed(false);
      setCurrentIndex((prev) => prev + 1);
    } else {
      submitSession.mutate(
        { sessionId: session.id, data: { answers, timedMode } },
        {
          onSuccess: (result) => {
            setResult(result);
            router.replace('/result');
          },
        }
      );
    }
  };

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: topPad + 8, borderBottomColor: colors.border, backgroundColor: colors.background }]}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={[styles.backBtn, { backgroundColor: colors.muted }]}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Feather name="x" size={18} color={colors.foreground} />
        </TouchableOpacity>

        <View style={styles.headerCenter}>
          <Text style={[styles.headerLevel, { color: colors.mutedForeground }]}>
            {session.level.toUpperCase()}
            {timedMode ? ' · TIMED' : ''}
          </Text>
          <Text style={[styles.headerCounter, { color: colors.foreground }]}>
            {currentIndex + 1} / {questions.length}
          </Text>
        </View>

        {timedMode && (
          <View style={[styles.timerBadge, { backgroundColor: timerColor + '20', borderColor: timerColor + '50' }]}>
            <Ionicons name="timer-outline" size={13} color={timerColor} />
            <Text style={[styles.timerBadgeText, { color: timerColor }]}>
              {isTimedOut ? '0s' : `${timerSeconds}s`}
            </Text>
          </View>
        )}
      </View>

      {/* Progress bar */}
      <View style={[styles.progressTrack, { backgroundColor: colors.muted }]}>
        <View style={[styles.progressFill, { width: `${progress}%` as any, backgroundColor: colors.accent }]} />
      </View>

      {/* Timer bar */}
      {timedMode && (
        <View style={[styles.timerTrack, { backgroundColor: colors.muted }]}>
          <View
            style={[
              styles.timerFill,
              { width: `${timerPct}%` as any, backgroundColor: timerColor },
            ]}
          />
        </View>
      )}

      <ScrollView
        style={styles.scrollArea}
        contentContainerStyle={[styles.content, { paddingBottom: botPad + 20 }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* AI persona */}
        <View style={[styles.persona, { borderBottomColor: colors.border }]}>
          <View style={[styles.avatar, { backgroundColor: colors.primary + '30', borderColor: colors.primary + '50' }]}>
            <Text style={[styles.avatarText, { color: colors.primary }]}>AI</Text>
          </View>
          <View>
            <Text style={[styles.personaRole, { color: colors.mutedForeground }]}>Senior Engineer · Interviewer</Text>
            <Text style={[styles.personaLine, { color: colors.foreground }]}>"Let's test your knowledge."</Text>
          </View>
        </View>

        {/* Question */}
        <Text style={[styles.question, { color: colors.foreground }]}>{currentQ.text}</Text>

        {/* Options */}
        <View style={styles.options}>
          {currentQ.options.map((opt, idx) => {
            let borderColor = colors.border;
            let bgColor = colors.muted;
            let textColor = colors.foreground;
            let icon: React.ReactNode = null;

            if (isRevealed) {
              if (idx === currentQ.correctOptionIndex) {
                borderColor = colors.success;
                bgColor = colors.success + '20';
                icon = <Ionicons name="checkmark-circle" size={20} color={colors.success} />;
              } else if (idx === selectedOption) {
                borderColor = colors.destructive;
                bgColor = colors.destructive + '20';
                textColor = colors.destructive;
                icon = <Ionicons name="close-circle" size={20} color={colors.destructive} />;
              } else {
                borderColor = colors.border;
                bgColor = 'transparent';
                textColor = colors.mutedForeground;
              }
            } else if (selectedOption === idx) {
              borderColor = colors.primary;
              bgColor = colors.primary + '20';
            }

            return (
              <TouchableOpacity
                key={idx}
                style={[styles.optionBtn, { borderColor, backgroundColor: bgColor }]}
                onPress={() => handleSelect(idx)}
                disabled={isRevealed}
                activeOpacity={0.75}
              >
                <View style={[styles.optionIndex, { backgroundColor: colors.secondary }]}>
                  <Text style={[styles.optionIndexText, { color: colors.mutedForeground }]}>
                    {String.fromCharCode(65 + idx)}
                  </Text>
                </View>
                <Text style={[styles.optionText, { color: textColor }]}>{opt}</Text>
                {icon}
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Explanation */}
        {isRevealed && (
          <View style={[
            styles.explanation,
            {
              borderColor: isCorrect ? colors.success + '40' : colors.destructive + '40',
              backgroundColor: isCorrect ? colors.success + '12' : colors.destructive + '12',
            },
          ]}>
            <Text style={[styles.explainHeader, { color: isCorrect ? colors.success : colors.destructive }]}>
              {isTimedOut ? "⏱ Time's up!" : isCorrect ? 'Correct!' : 'Incorrect'}
            </Text>
            <Text style={[styles.explainText, { color: colors.foreground }]}>
              {currentQ.explanation ?? 'No explanation provided.'}
            </Text>
          </View>
        )}

        {/* Next / Finish */}
        {isRevealed && (
          <TouchableOpacity
            style={[styles.nextBtn, { backgroundColor: colors.primary }]}
            onPress={handleNext}
            disabled={submitSession.isPending}
            activeOpacity={0.8}
          >
            {submitSession.isPending ? (
              <ActivityIndicator size="small" color={colors.primaryForeground} />
            ) : (
              <>
                <Text style={[styles.nextBtnText, { color: colors.primaryForeground }]}>
                  {isLastQuestion ? 'Finish Quiz' : 'Next Question'}
                </Text>
                <Feather
                  name={isLastQuestion ? 'check' : 'arrow-right'}
                  size={18}
                  color={colors.primaryForeground}
                />
              </>
            )}
          </TouchableOpacity>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  centered: { alignItems: 'center', justifyContent: 'center', gap: 12 },
  loadingText: { fontFamily: 'Inter_400Regular', fontSize: 14 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 14,
    borderBottomWidth: 1,
    gap: 12,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCenter: { flex: 1 },
  headerLevel: { fontFamily: 'Inter_500Medium', fontSize: 11, letterSpacing: 1 },
  headerCounter: { fontFamily: 'Inter_700Bold', fontSize: 16 },
  timerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
    borderWidth: 1,
  },
  timerBadgeText: { fontFamily: 'Inter_700Bold', fontSize: 13 },
  progressTrack: { height: 3, width: '100%' },
  progressFill: { height: 3 },
  timerTrack: { height: 3, width: '100%' },
  timerFill: { height: 3 },
  scrollArea: { flex: 1 },
  content: { paddingHorizontal: 20, paddingTop: 24, gap: 20 },
  persona: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingBottom: 20,
    borderBottomWidth: 1,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  avatarText: { fontFamily: 'Inter_700Bold', fontSize: 14 },
  personaRole: { fontFamily: 'Inter_400Regular', fontSize: 12 },
  personaLine: { fontFamily: 'Inter_500Medium', fontSize: 14 },
  question: {
    fontFamily: 'Inter_700Bold',
    fontSize: 20,
    lineHeight: 30,
    letterSpacing: -0.3,
  },
  options: { gap: 10 },
  optionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: 1.5,
    borderRadius: 14,
    padding: 14,
    minHeight: 64,
  },
  optionIndex: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  optionIndexText: { fontFamily: 'Inter_700Bold', fontSize: 12 },
  optionText: { fontFamily: 'Inter_500Medium', fontSize: 15, flex: 1, lineHeight: 22 },
  explanation: {
    borderWidth: 1.5,
    borderRadius: 14,
    padding: 16,
    gap: 6,
  },
  explainHeader: { fontFamily: 'Inter_700Bold', fontSize: 15 },
  explainText: { fontFamily: 'Inter_400Regular', fontSize: 14, lineHeight: 22 },
  nextBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: 14,
    paddingVertical: 16,
  },
  nextBtnText: { fontFamily: 'Inter_700Bold', fontSize: 16 },
});
