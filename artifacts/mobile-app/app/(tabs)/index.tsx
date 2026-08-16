import React, { useState, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  Modal,
  TouchableOpacity,
  Switch,
  Platform,
  ActivityIndicator,
  Pressable,
  ScrollView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather, Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import {
  useListCourses,
  useCreateSession,
  getListCoursesQueryKey,
  type Course,
  type SessionInputLevel,
} from '@workspace/api-client-react';
import { useQuizContext } from '@/contexts/QuizContext';
import { useColors } from '@/hooks/useColors';

// ─── Course accent colors ────────────────────────────────────────────────────
const SLUG_ACCENT: Record<string, string> = {
  oracle: '#f0748a', sap: '#8f7bf0', java: '#f0b84f', python: '#5be3d8',
  aws: '#f0a35c', linux: '#6fd3f0', 'docker-k8s': '#5be3d8', javascript: '#f0b84f',
  cybersecurity: '#f0748a', sql: '#8f7bf0', networking: '#6fd3f0', azure: '#6fd3f0',
  git: '#f0a35c', terraform: '#8f7bf0', cicd: '#f0a35c', sre: '#5be3d8',
  ansible: '#f0748a', gcp: '#f0b84f', typescript: '#5be3d8', bash: '#f0b84f',
  react: '#5be3d8', nodejs: '#6fd3f0', django: '#5be3d8', 'spring-boot': '#f0b84f',
  mongodb: '#6fd3f0', redis: '#f0748a', postgresql: '#6fd3f0',
  'machine-learning': '#f0b84f', kafka: '#f0748a', elasticsearch: '#f0a35c',
  'data-warehouse': '#5be3d8', virtualization: '#6fd3f0', 'testing-qa': '#8f7bf0',
  graphql: '#f0748a', 'jira-agile': '#f0a35c', fastapi: '#5be3d8',
  rabbitmq: '#f0748a', 'deep-learning': '#8f7bf0', vault: '#f0b84f', 'vue-angular': '#6fd3f0',
};
const FALLBACK = ['#f0748a', '#8f7bf0', '#f0b84f', '#5be3d8', '#f0a35c', '#6fd3f0'];
function getAccent(course: Course, idx: number): string {
  return SLUG_ACCENT[course.slug] ?? FALLBACK[idx % FALLBACK.length];
}

// ─── Level pill ──────────────────────────────────────────────────────────────
type Difficulty = 'beginner' | 'intermediate' | 'advanced';

// ─── CourseCard ──────────────────────────────────────────────────────────────
interface CourseCardProps {
  course: Course;
  accent: string;
  onPress: () => void;
}

function CourseCard({ course, accent, onPress }: CourseCardProps) {
  const colors = useColors();
  const { beginner, intermediate, advanced } = course.questionCounts;
  const totalQs = beginner + intermediate + advanced;

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
        { backgroundColor: colors.card, borderColor: colors.border },
        pressed && styles.cardPressed,
      ]}
    >
      {/* Accent bar */}
      <View style={[styles.accentBar, { backgroundColor: accent }]} />

      {/* Icon badge */}
      <View style={[styles.iconBadge, { backgroundColor: colors.muted, borderColor: colors.border }]}>
        <Text style={[styles.iconText, { color: accent }]}>
          {course.name.slice(0, 2).toUpperCase()}
        </Text>
      </View>

      <Text style={[styles.courseName, { color: colors.foreground }]} numberOfLines={2}>
        {course.name}
      </Text>

      <Text style={[styles.courseDesc, { color: colors.mutedForeground }]} numberOfLines={2}>
        {course.description}
      </Text>

      {/* Footer */}
      <View style={styles.cardFooter}>
        <View style={styles.dots}>
          {[beginner > 0, intermediate > 0, advanced > 0].map((on, i) => (
            <View
              key={i}
              style={[
                styles.dot,
                { backgroundColor: on ? accent : colors.border },
              ]}
            />
          ))}
        </View>
        <Text style={[styles.totalQs, { color: colors.mutedForeground }]}>{totalQs}Q</Text>
      </View>
    </Pressable>
  );
}

// ─── Level Picker Modal ──────────────────────────────────────────────────────
interface LevelModalProps {
  course: Course;
  accent: string;
  visible: boolean;
  onClose: () => void;
}

function LevelModal({ course, accent, visible, onClose }: LevelModalProps) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const [timedMode, setTimedMode] = useState(false);
  const { setSession, setTimedMode: setCtxTimedMode, setSelectedCourse, clearPersistedProgress } = useQuizContext();
  const createSession = useCreateSession();

  const levels: { id: Difficulty; label: string; count: number }[] = [
    { id: 'beginner', label: 'Beginner', count: course.questionCounts.beginner },
    { id: 'intermediate', label: 'Intermediate', count: course.questionCounts.intermediate },
    { id: 'advanced', label: 'Advanced', count: course.questionCounts.advanced },
  ];

  const handleStart = useCallback(async (level: Difficulty) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    // Await the clear so any stale saved progress is fully removed before the
    // new session starts — prevents a race where an old AsyncStorage write
    // arrives after the new session's first persistProgress call.
    await clearPersistedProgress();
    createSession.mutate(
      { data: { courseId: course.id, level: level as SessionInputLevel, timedMode } },
      {
        onSuccess: (session) => {
          setSession(session);
          setCtxTimedMode(timedMode);
          setSelectedCourse(course);
          onClose();
          router.push('/quiz');
        },
      }
    );
  }, [course, timedMode, createSession, setSession, setCtxTimedMode, setSelectedCourse, clearPersistedProgress, onClose]);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.modalOverlay} onPress={onClose}>
        <Pressable
          style={[
            styles.modalSheet,
            {
              backgroundColor: colors.card,
              paddingBottom: insets.bottom + 24,
              borderColor: colors.border,
            },
          ]}
          onPress={(e) => e.stopPropagation()}
        >
          {/* Handle */}
          <View style={[styles.sheetHandle, { backgroundColor: colors.border }]} />

          {/* Accent strip */}
          <View style={[styles.sheetAccent, { backgroundColor: accent }]} />

          <Text style={[styles.sheetTitle, { color: colors.foreground }]}>{course.name}</Text>
          <Text style={[styles.sheetDesc, { color: colors.mutedForeground }]} numberOfLines={3}>
            {course.description}
          </Text>

          {/* Timed mode toggle */}
          <View style={[styles.timedRow, { borderColor: colors.border }]}>
            <View style={styles.timedRowLeft}>
              <Ionicons name="timer-outline" size={18} color={colors.orange} />
              <View style={{ marginLeft: 10 }}>
                <Text style={[styles.timedLabel, { color: colors.foreground }]}>Timed Mode</Text>
                <Text style={[styles.timedSub, { color: colors.mutedForeground }]}>30s per question</Text>
              </View>
            </View>
            <Switch
              value={timedMode}
              onValueChange={setTimedMode}
              trackColor={{ false: colors.border, true: colors.orange + '80' }}
              thumbColor={timedMode ? colors.orange : colors.mutedForeground}
            />
          </View>

          {/* Level buttons */}
          <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>SELECT DIFFICULTY</Text>
          {levels.map((lvl) => (
            <TouchableOpacity
              key={lvl.id}
              style={[
                styles.levelBtn,
                { borderColor: accent + '50', backgroundColor: colors.muted },
              ]}
              onPress={() => handleStart(lvl.id)}
              disabled={createSession.isPending || lvl.count === 0}
              activeOpacity={0.7}
            >
              <View style={styles.levelBtnLeft}>
                <View style={[styles.levelDot, { backgroundColor: accent }]} />
                <Text style={[styles.levelBtnText, { color: colors.foreground }]}>{lvl.label}</Text>
              </View>
              <View style={styles.levelBtnRight}>
                {createSession.isPending ? (
                  <ActivityIndicator size="small" color={accent} />
                ) : (
                  <>
                    <Text style={[styles.levelCount, { color: colors.mutedForeground }]}>
                      {lvl.count}Q
                    </Text>
                    <Feather name="chevron-right" size={16} color={accent} />
                  </>
                )}
              </View>
            </TouchableOpacity>
          ))}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

// ─── Home Screen ─────────────────────────────────────────────────────────────
export default function HomeScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const [search, setSearch] = useState('');
  const [selectedCourse, setSelectedCourse] = useState<{ course: Course; accent: string } | null>(null);
  const { savedProgress } = useQuizContext();

  const { data: courses, isLoading, isError, refetch } = useListCourses({
    query: { retry: 3, retryDelay: (n) => Math.min(1000 * 2 ** n, 8000), queryKey: getListCoursesQueryKey() },
  });

  const filtered = useMemo(() => {
    if (!courses) return [];
    const q = search.trim().toLowerCase();
    if (!q) return courses;
    return courses.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.slug.toLowerCase().includes(q) ||
        (c.description ?? '').toLowerCase().includes(q)
    );
  }, [courses, search]);

  const handleCoursePress = useCallback((course: Course, idx: number) => {
    Haptics.selectionAsync();
    setSelectedCourse({ course, accent: getAccent(course, idx) });
  }, []);

  const topPad = Platform.OS === 'web' ? 67 : insets.top;

  const renderItem = useCallback(
    ({ item, index }: { item: Course; index: number }) => (
      <CourseCard
        course={item}
        accent={getAccent(item, index)}
        onPress={() => handleCoursePress(item, index)}
      />
    ),
    [handleCoursePress]
  );

  const keyExtractor = useCallback((item: Course) => String(item.id), []);

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: topPad + 12, backgroundColor: colors.background, borderBottomColor: colors.border }]}>
        <View style={styles.headerTop}>
          <View>
            <Text style={[styles.headerEyebrow, { color: colors.accent }]}>TECH INTERVIEW PREP</Text>
            <Text style={[styles.headerTitle, { color: colors.foreground }]}>Courses</Text>
          </View>
          <View style={[styles.countBadge, { backgroundColor: colors.muted, borderColor: colors.border }]}>
            <Text style={[styles.countBadgeText, { color: colors.mutedForeground }]}>
              {courses?.length ?? 0}
            </Text>
          </View>
        </View>

        {/* Search */}
        <View style={[styles.searchRow, { backgroundColor: colors.muted, borderColor: colors.border }]}>
          <Feather name="search" size={16} color={colors.mutedForeground} />
          <TextInput
            style={[styles.searchInput, { color: colors.foreground }]}
            placeholder="Search courses…"
            placeholderTextColor={colors.mutedForeground}
            value={search}
            onChangeText={setSearch}
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="search"
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch('')}>
              <Feather name="x" size={16} color={colors.mutedForeground} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Content */}
      {isLoading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={colors.accent} />
          <Text style={[styles.loadingText, { color: colors.mutedForeground }]}>Loading courses…</Text>
        </View>
      ) : isError ? (
        <View style={styles.centered}>
          <Ionicons name="cloud-offline-outline" size={48} color={colors.mutedForeground} />
          <Text style={[styles.errorText, { color: colors.mutedForeground }]}>Could not reach server</Text>
          <TouchableOpacity
            onPress={() => refetch()}
            style={[styles.retryBtn, { borderColor: colors.accent }]}
          >
            <Text style={[styles.retryText, { color: colors.accent }]}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={filtered}
          renderItem={renderItem}
          keyExtractor={keyExtractor}
          numColumns={2}
          columnWrapperStyle={styles.columnWrapper}
          contentContainerStyle={[
            styles.list,
            { paddingBottom: (Platform.OS === 'web' ? 84 : insets.bottom) + 20 },
          ]}
          showsVerticalScrollIndicator={false}
          scrollEnabled={filtered.length > 0}
          ListHeaderComponent={
            savedProgress ? (
              <TouchableOpacity
                style={[
                  styles.resumeBanner,
                  { backgroundColor: colors.accent + '18', borderColor: colors.accent + '45' },
                ]}
                onPress={() => router.push('/quiz')}
                activeOpacity={0.8}
              >
                <View style={[styles.resumeIconBg, { backgroundColor: colors.accent + '25' }]}>
                  <Ionicons name="play-circle-outline" size={22} color={colors.accent} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.resumeBannerTitle, { color: colors.accent }]}>
                    Quiz in Progress
                  </Text>
                  <Text style={[styles.resumeBannerSub, { color: colors.mutedForeground }]}>
                    {savedProgress.selectedCourse?.name ?? 'Tap to continue your quiz'}
                    {savedProgress.selectedCourse
                      ? ` · Q${savedProgress.nextIndex + 1} of next`
                      : ''}
                  </Text>
                </View>
                <Feather name="chevron-right" size={16} color={colors.accent} />
              </TouchableOpacity>
            ) : null
          }
          ListEmptyComponent={
            <View style={styles.centered}>
              <Feather name="search" size={36} color={colors.mutedForeground} />
              <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
                No courses match "{search}"
              </Text>
            </View>
          }
        />
      )}

      {/* Level picker modal */}
      {selectedCourse && (
        <LevelModal
          course={selectedCourse.course}
          accent={selectedCourse.accent}
          visible={true}
          onClose={() => setSelectedCourse(null)}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: {
    paddingHorizontal: 20,
    paddingBottom: 14,
    borderBottomWidth: 1,
    zIndex: 10,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  headerEyebrow: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 10,
    letterSpacing: 1.5,
    marginBottom: 2,
  },
  headerTitle: {
    fontFamily: 'Inter_700Bold',
    fontSize: 28,
    letterSpacing: -0.5,
  },
  countBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
  },
  countBadgeText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 13,
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 10,
    gap: 10,
  },
  searchInput: {
    flex: 1,
    fontFamily: 'Inter_400Regular',
    fontSize: 15,
  },
  list: {
    paddingHorizontal: 12,
    paddingTop: 16,
    gap: 12,
  },
  columnWrapper: {
    gap: 12,
  },
  card: {
    flex: 1,
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    minHeight: 168,
    overflow: 'hidden',
  },
  cardPressed: {
    opacity: 0.75,
    transform: [{ scale: 0.98 }],
  },
  accentBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 3,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
  },
  iconBadge: {
    width: 38,
    height: 38,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
    marginBottom: 10,
  },
  iconText: {
    fontFamily: 'Inter_700Bold',
    fontSize: 12,
  },
  courseName: {
    fontFamily: 'Inter_700Bold',
    fontSize: 14,
    letterSpacing: -0.2,
    marginBottom: 6,
    lineHeight: 20,
  },
  courseDesc: {
    fontFamily: 'Inter_400Regular',
    fontSize: 11.5,
    lineHeight: 16,
    flex: 1,
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 12,
  },
  dots: { flexDirection: 'row', gap: 4 },
  dot: { width: 5, height: 5, borderRadius: 3 },
  totalQs: { fontFamily: 'Inter_500Medium', fontSize: 11 },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    paddingVertical: 60,
  },
  loadingText: { fontFamily: 'Inter_400Regular', fontSize: 14, marginTop: 8 },
  errorText: { fontFamily: 'Inter_500Medium', fontSize: 15 },
  emptyText: { fontFamily: 'Inter_400Regular', fontSize: 15 },
  retryBtn: {
    paddingHorizontal: 20,
    paddingVertical: 9,
    borderRadius: 10,
    borderWidth: 1,
    marginTop: 4,
  },
  retryText: { fontFamily: 'Inter_600SemiBold', fontSize: 14 },
  // Resume banner
  resumeBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    marginBottom: 12,
  },
  resumeIconBg: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  resumeBannerTitle: { fontFamily: 'Inter_700Bold', fontSize: 14 },
  resumeBannerSub: { fontFamily: 'Inter_400Regular', fontSize: 12, marginTop: 2 },
  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.65)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
    borderBottomWidth: 0,
    paddingHorizontal: 24,
    paddingTop: 12,
  },
  sheetHandle: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 2,
    marginBottom: 20,
  },
  sheetAccent: {
    height: 3,
    borderRadius: 2,
    marginBottom: 18,
    width: 48,
  },
  sheetTitle: {
    fontFamily: 'Inter_700Bold',
    fontSize: 22,
    letterSpacing: -0.4,
    marginBottom: 8,
  },
  sheetDesc: {
    fontFamily: 'Inter_400Regular',
    fontSize: 14,
    lineHeight: 21,
    marginBottom: 20,
  },
  timedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    marginBottom: 20,
  },
  timedRowLeft: { flexDirection: 'row', alignItems: 'center' },
  timedLabel: { fontFamily: 'Inter_600SemiBold', fontSize: 15 },
  timedSub: { fontFamily: 'Inter_400Regular', fontSize: 12, marginTop: 1 },
  sectionLabel: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 10,
    letterSpacing: 1.5,
    marginBottom: 12,
  },
  levelBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 15,
    marginBottom: 10,
  },
  levelBtnLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  levelDot: { width: 8, height: 8, borderRadius: 4 },
  levelBtnText: { fontFamily: 'Inter_600SemiBold', fontSize: 16 },
  levelBtnRight: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  levelCount: { fontFamily: 'Inter_500Medium', fontSize: 13 },
});
