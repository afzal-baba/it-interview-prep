import React, { createContext, useContext, useState, useEffect } from 'react';
import type { Session, SessionResult, Course } from '@workspace/api-client-react';
import {
  loadQuizProgress,
  saveQuizProgress,
  clearQuizProgress,
  type PersistedQuizProgress,
} from '@/lib/quizPersistence';

interface QuizContextValue {
  session: Session | null;
  result: SessionResult | null;
  timedMode: boolean;
  selectedCourse: Course | null;
  savedProgress: PersistedQuizProgress | null;
  setSession: (s: Session | null) => void;
  setResult: (r: SessionResult | null) => void;
  setTimedMode: (t: boolean) => void;
  setSelectedCourse: (c: Course | null) => void;
  /**
   * Atomically write progress to AsyncStorage AND update the in-memory
   * `savedProgress` state so the home-screen resume banner stays in sync
   * without requiring a cold-restart rehydration.
   */
  persistProgress: (progress: PersistedQuizProgress) => Promise<void>;
  /** Remove persisted progress from both AsyncStorage and context state. */
  clearPersistedProgress: () => Promise<void>;
}

const QuizContext = createContext<QuizContextValue | null>(null);

export function QuizProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [result, setResult] = useState<SessionResult | null>(null);
  const [timedMode, setTimedMode] = useState(false);
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [savedProgress, setSavedProgress] = useState<PersistedQuizProgress | null>(null);

  // On app start: load any persisted in-progress quiz and rehydrate context so
  // the quiz screen doesn't redirect home after a cold-process restart.
  useEffect(() => {
    loadQuizProgress().then((progress) => {
      if (!progress) return;
      setSavedProgress(progress);
      // Restore session/mode so quiz.tsx's `!session` guard doesn't fire.
      setSession(progress.session);
      setTimedMode(progress.timedMode);
      setSelectedCourse(progress.selectedCourse);
    });
  }, []);

  const persistProgress = async (progress: PersistedQuizProgress) => {
    await saveQuizProgress(progress);
    setSavedProgress(progress);
  };

  const clearPersistedProgress = async () => {
    await clearQuizProgress();
    setSavedProgress(null);
  };

  return (
    <QuizContext.Provider
      value={{
        session,
        result,
        timedMode,
        selectedCourse,
        savedProgress,
        setSession,
        setResult,
        setTimedMode,
        setSelectedCourse,
        persistProgress,
        clearPersistedProgress,
      }}
    >
      {children}
    </QuizContext.Provider>
  );
}

export function useQuizContext() {
  const ctx = useContext(QuizContext);
  if (!ctx) throw new Error('useQuizContext must be used within QuizProvider');
  return ctx;
}
