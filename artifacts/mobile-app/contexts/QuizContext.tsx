import React, { createContext, useContext, useState } from 'react';
import type { Session, SessionResult, Course } from '@workspace/api-client-react';

interface QuizContextValue {
  session: Session | null;
  result: SessionResult | null;
  timedMode: boolean;
  selectedCourse: Course | null;
  setSession: (s: Session | null) => void;
  setResult: (r: SessionResult | null) => void;
  setTimedMode: (t: boolean) => void;
  setSelectedCourse: (c: Course | null) => void;
}

const QuizContext = createContext<QuizContextValue | null>(null);

export function QuizProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [result, setResult] = useState<SessionResult | null>(null);
  const [timedMode, setTimedMode] = useState(false);
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);

  return (
    <QuizContext.Provider
      value={{
        session,
        result,
        timedMode,
        selectedCourse,
        setSession,
        setResult,
        setTimedMode,
        setSelectedCourse,
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
