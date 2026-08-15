import React, { createContext, useContext, useState, ReactNode } from 'react';
import type { Session, SessionResult, Question } from '@workspace/api-client-react';

interface QuizState {
  currentSession: Session | null;
  questions: Question[];
  sessionResult: SessionResult | null;
  setSession: (session: Session | null) => void;
  setQuestions: (questions: Question[]) => void;
  setResult: (result: SessionResult | null) => void;
  reset: () => void;
}

const QuizContext = createContext<QuizState | undefined>(undefined);

export function QuizProvider({ children }: { children: ReactNode }) {
  const [currentSession, setCurrentSession] = useState<Session | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [sessionResult, setSessionResult] = useState<SessionResult | null>(null);

  const reset = () => {
    setCurrentSession(null);
    setQuestions([]);
    setSessionResult(null);
  };

  return (
    <QuizContext.Provider value={{
      currentSession,
      questions,
      sessionResult,
      setSession: setCurrentSession,
      setQuestions,
      setResult: setSessionResult,
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
