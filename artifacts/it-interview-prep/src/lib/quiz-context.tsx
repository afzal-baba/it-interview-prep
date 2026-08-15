import React, { createContext, useContext, useState, ReactNode } from 'react';
import type { Session, SessionResult, Question } from '@workspace/api-client-react';

interface QuizState {
  currentSession: Session | null;
  questions: Question[];
  sessionResult: SessionResult | null;
  timedMode: boolean;
  setSession: (session: Session | null) => void;
  setQuestions: (questions: Question[]) => void;
  setResult: (result: SessionResult | null) => void;
  setTimedMode: (timedMode: boolean) => void;
  reset: () => void;
}

const QuizContext = createContext<QuizState | undefined>(undefined);

export function QuizProvider({ children }: { children: ReactNode }) {
  const [currentSession, setCurrentSession] = useState<Session | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [sessionResult, setSessionResult] = useState<SessionResult | null>(null);
  const [timedMode, setTimedMode] = useState(false);

  const reset = () => {
    setCurrentSession(null);
    setQuestions([]);
    setSessionResult(null);
    setTimedMode(false);
  };

  return (
    <QuizContext.Provider value={{
      currentSession,
      questions,
      sessionResult,
      timedMode,
      setSession: setCurrentSession,
      setQuestions,
      setResult: setSessionResult,
      setTimedMode,
      reset
    }}>
      {children}
    </QuizContext.Provider>
  );
}

export function useQuizState() {
  const context = useContext(QuizContext);
  if (context === undefined) {
    throw new Error('useQuizState must be used within a QuizProvider');
  }
  return context;
}
