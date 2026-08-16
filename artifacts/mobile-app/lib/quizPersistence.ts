import AsyncStorage from '@react-native-async-storage/async-storage';
import type { AnswerInput, Course, Question, Session } from '@workspace/api-client-react';

export const QUIZ_PROGRESS_KEY = 'quiz_in_progress_v1';

export interface PersistedQuizProgress {
  /** Full session object so it can be restored after a cold-process restart. */
  session: Session;
  timedMode: boolean;
  /**
   * Index of the NEXT unanswered question (currentIndex + 1 at time of save).
   * Must be in range [1, questions.length - 1] — after the first answer, before
   * the last question is submitted.
   */
  nextIndex: number;
  /** Answers recorded so far. */
  answers: (AnswerInput & { timeTakenMs?: number })[];
  selectedCourse: Course | null;
  /**
   * The stable shuffled question snapshot captured when the session started.
   * Questions and their option order are randomised server-side on every fetch,
   * so we must persist the original snapshot and resume against it — not a fresh
   * fetch — to keep answer option indices consistent.
   */
  questions: Question[];
  savedAt: number;
}

export async function saveQuizProgress(progress: PersistedQuizProgress): Promise<void> {
  try {
    await AsyncStorage.setItem(QUIZ_PROGRESS_KEY, JSON.stringify(progress));
  } catch {
    // Storage failures are non-fatal; quiz continues normally
  }
}

export async function loadQuizProgress(): Promise<PersistedQuizProgress | null> {
  try {
    const raw = await AsyncStorage.getItem(QUIZ_PROGRESS_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as PersistedQuizProgress;
    // Basic sanity: discard stale progress missing the questions snapshot
    if (!parsed.questions?.length) return null;
    return parsed;
  } catch {
    return null;
  }
}

export async function clearQuizProgress(): Promise<void> {
  try {
    await AsyncStorage.removeItem(QUIZ_PROGRESS_KEY);
  } catch {
    // Ignore
  }
}
