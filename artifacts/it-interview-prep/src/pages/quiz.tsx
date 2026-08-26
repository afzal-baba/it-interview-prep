import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useLocation } from "wouter";
import { 
  useListQuestions, 
  useSubmitSession,
  AnswerInput,
  getListQuestionsQueryKey
} from "@workspace/api-client-react";
import { useQuizState } from "@/lib/quiz-context";
import {
  getRecentQuestionIds,
  rememberQuestionRotation,
} from "@/lib/question-rotation";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, XCircle, ChevronRight, Loader2, Send, Timer, Zap } from "lucide-react";

const QUESTION_TIME_LIMIT_MS = 30_000;

export default function Quiz() {
  const [, setLocation] = useLocation();
  const { currentSession, setResult, timedMode } = useQuizState();
  const submitSession = useSubmitSession();
  const rotationQuestionIds = useMemo(
    () =>
      currentSession
        ? getRecentQuestionIds(currentSession.courseId, currentSession.level)
        : [],
    [currentSession?.courseId, currentSession?.level],
  );
  const questionParams = useMemo(
    () => ({
      level: currentSession?.level as any,
      ...(rotationQuestionIds.length > 0
        ? { excludeIds: rotationQuestionIds.join(",") }
        : {}),
    }),
    [currentSession?.level, rotationQuestionIds],
  );
  const recordedRotation = useRef<string | null>(null);

  useEffect(() => {
    document.title = "Quiz — TechInterviewPrep";
  }, []);

  const { data: rawQuestions, isLoading } = useListQuestions(
    currentSession?.courseId || 0,
    questionParams,
    { 
      query: { 
        enabled: !!currentSession,
        // Never background-refetch mid-quiz. The server orders questions randomly, so
        // a refetch returns a different question order and reshuffles currentIndex → wrong question.
        // gcTime: 0 clears the cache on unmount so the next quiz gets a fresh random set.
        staleTime: Infinity,
        gcTime: 0,
        queryKey: getListQuestionsQueryKey(currentSession?.courseId || 0, questionParams)
      } 
    }
  );

  useEffect(() => {
    if (!currentSession || !rawQuestions || rawQuestions.length === 0) return;
    const key = `${currentSession.courseId}:${currentSession.level}:${rawQuestions
      .map((question) => question.id)
      .join(",")}`;
    if (recordedRotation.current === key) return;
    recordedRotation.current = key;
    rememberQuestionRotation(
      currentSession.courseId,
      currentSession.level,
      rawQuestions.map((question) => question.id),
    );
  }, [currentSession, rawQuestions]);

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

  // Timer state
  const [timeRemaining, setTimeRemaining] = useState(QUESTION_TIME_LIMIT_MS);
  const questionStartTime = useRef<number>(Date.now());
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Redirect if no session
  useEffect(() => {
    if (!currentSession) {
      setLocation("/");
    }
  }, [currentSession, setLocation]);

  // Reset and start timer when question changes
  useEffect(() => {
    if (!timedMode || isRevealed) return;
    setTimeRemaining(QUESTION_TIME_LIMIT_MS);
    questionStartTime.current = Date.now();

    timerRef.current = setInterval(() => {
      const elapsed = Date.now() - questionStartTime.current;
      const remaining = Math.max(0, QUESTION_TIME_LIMIT_MS - elapsed);
      setTimeRemaining(remaining);
    }, 100);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [currentIndex, timedMode, isRevealed]);

  // Auto-submit when timer hits 0 (timeout = wrong answer)
  const handleTimeoutRef = useRef<(() => void) | null>(null);

  const handleSelect = useCallback((idx: number, timeTakenMs?: number) => {
    if (isRevealed) return;
    if (timerRef.current) clearInterval(timerRef.current);

    const elapsed = timeTakenMs ?? (Date.now() - questionStartTime.current);

    setSelectedOption(idx);
    setIsRevealed(true);

    const currentQ = questions?.[currentIndex];
    if (currentQ) {
      // Translate shuffled display index → original DB index so server scoring is correct.
      // idx === -1 means timeout (no selection).
      const originalIdx = idx === -1 ? -1 : currentQ.originalIndexMap[idx];
      setAnswers(prev => [...prev, {
        questionId: currentQ.id,
        selectedOptionIndex: originalIdx,
        timeTakenMs: timedMode ? elapsed : undefined,
      }]);
    }
  }, [isRevealed, questions, currentIndex, timedMode]);

  // Store latest handleSelect in ref for timer callback
  handleTimeoutRef.current = () => {
    if (!isRevealed) {
      handleSelect(-1, QUESTION_TIME_LIMIT_MS);
    }
  };

  useEffect(() => {
    if (!timedMode || timeRemaining > 0 || isRevealed) return;
    handleTimeoutRef.current?.();
  }, [timeRemaining, timedMode, isRevealed]);

  if (!currentSession || isLoading || !questions) {
    return (
      <div className="w-full flex-1 flex items-center justify-center">
        <div className="animate-pulse flex flex-col items-center gap-4">
          <Loader2 className="w-12 h-12 text-primary animate-spin" />
          <p className="text-muted-foreground font-medium font-mono uppercase tracking-widest">Preparing Interview Environment...</p>
        </div>
      </div>
    );
  }

  const currentQ = questions[currentIndex];
  const isLastQuestion = currentIndex === questions.length - 1;
  const progress = ((currentIndex) / questions.length) * 100;
  const timerProgress = (timeRemaining / QUESTION_TIME_LIMIT_MS) * 100;
  const timerSeconds = Math.ceil(timeRemaining / 1000);
  const isTimerCritical = timeRemaining < 10_000; // < 10s
  const isTimedOut = timedMode && timeRemaining === 0;

  const isCorrect = selectedOption !== null && selectedOption === currentQ.correctOptionIndex;

  const handleNext = () => {
    if (isLastQuestion) {
      submitSession.mutate(
        { 
          sessionId: currentSession.id, 
          data: { answers, timedMode }
        },
        {
          onSuccess: (result) => {
            setResult(result);
            setLocation("/result");
          }
        }
      );
    } else {
      setSelectedOption(null);
      setIsRevealed(false);
      setCurrentIndex(prev => prev + 1);
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto py-8 px-4 flex flex-col min-h-[calc(100vh-80px)]">
      {/* Header Stats */}
      <div className="flex items-center justify-between mb-6">
        <div className="space-y-1">
          <div className="text-sm font-mono text-muted-foreground uppercase tracking-wider flex items-center gap-2">
            {currentSession.level} Level
            {timedMode && (
              <span className="flex items-center gap-1 text-xs font-bold text-orange-500 bg-orange-500/10 px-2 py-0.5 rounded-full border border-orange-500/20">
                <Zap size={10} /> TIMED
              </span>
            )}
          </div>
          <div className="font-bold text-xl">Question {currentIndex + 1} of {questions.length}</div>
        </div>
        <Badge variant="outline" className="font-mono text-base px-4 py-1.5 border-2">
          {currentIndex + 1} / {questions.length}
        </Badge>
      </div>

      <Progress value={progress} className="mb-4 h-3" />

      {/* Countdown Timer Bar */}
      {timedMode && (
        <div className="mb-8">
          <div className="flex items-center justify-between mb-1.5">
            <div className={`flex items-center gap-1.5 text-sm font-mono font-bold ${isTimerCritical ? 'text-red-500' : 'text-orange-500'}`}>
              <Timer size={14} />
              {isTimedOut ? 'Time\'s up!' : `${timerSeconds}s`}
            </div>
            {!isRevealed && (
              <div className="text-xs text-muted-foreground font-mono">Time remaining</div>
            )}
          </div>
          <div className="h-2.5 w-full rounded-full bg-muted overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-100 ${
                isTimerCritical
                  ? 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.6)]'
                  : timerProgress > 60
                  ? 'bg-orange-400'
                  : 'bg-orange-500'
              }`}
              style={{ width: `${timerProgress}%` }}
            />
          </div>
        </div>
      )}

      {/* Main Question Card */}
      <div className="flex-1 flex flex-col">
        <div className="dark-panel p-8 md:p-12 rounded-[2rem] flex-1 flex flex-col relative animate-in fade-in slide-in-from-bottom-8 duration-500">
          
          {/* Interviewer Persona */}
          <div className="flex items-center gap-4 mb-8 pb-8 border-b border-white/10">
            <div className="w-12 h-12 rounded-full bg-primary/20 text-primary flex items-center justify-center font-bold text-xl border border-primary/30">
              AI
            </div>
            <div>
              <p className="text-white/60 text-sm font-mono">Senior Engineer (Interviewer)</p>
              <p className="text-white font-medium">"Let's test your knowledge on this concept."</p>
            </div>
          </div>

          <h2 className="text-2xl md:text-3xl font-bold leading-tight mb-10 text-white">
            {currentQ.text}
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8 flex-1">
            {currentQ.options.map((opt, idx) => {
              let btnClass = "border-white/10 bg-white/5 hover:bg-white/10 hover:border-primary/50 text-white";
              let icon = null;
              const letter = String.fromCharCode(65 + idx); // A, B, C, D
              
              if (isRevealed) {
                if (idx === currentQ.correctOptionIndex) {
                  btnClass = "border-success bg-success/20 text-white shadow-[0_0_15px_rgba(0,255,100,0.2)]";
                  icon = <CheckCircle2 className="text-success shrink-0" />;
                } else if (idx === selectedOption) {
                  btnClass = "border-destructive bg-destructive/20 text-white";
                  icon = <XCircle className="text-destructive shrink-0" />;
                } else {
                  btnClass = "border-white/5 bg-transparent opacity-50";
                }
              } else if (selectedOption === idx) {
                btnClass = "border-primary bg-primary/20 text-white";
              }

              return (
                <button
                  key={idx}
                  onClick={() => handleSelect(idx)}
                  disabled={isRevealed}
                  className={`w-full text-left p-5 rounded-xl border-2 transition-all duration-300 flex items-start gap-3 group min-h-[90px] ${btnClass}`}
                >
                  <span className="shrink-0 w-7 h-7 rounded-full border border-current/30 flex items-center justify-center text-sm font-bold font-mono opacity-60">{letter}</span>
                  <span className="text-base flex-1 leading-snug">{opt}</span>
                  {icon && <span className="animate-in zoom-in">{icon}</span>}
                </button>
              );
            })}
          </div>

          {/* Explanation Area */}
          {isRevealed && (
            <div className={`mt-auto p-6 rounded-xl border-2 mb-8 animate-in slide-in-from-top-4 fade-in ${isCorrect ? 'border-success/30 bg-success/10' : 'border-destructive/30 bg-destructive/10'}`}>
              <h4 className={`font-bold mb-2 flex items-center gap-2 ${isCorrect ? 'text-success' : 'text-destructive'}`}>
                {isTimedOut ? '⏱ Time\'s up! Question marked wrong.' : isCorrect ? 'Correct!' : 'Incorrect.'}
              </h4>
              <p className="text-white/80 leading-relaxed">
                {currentQ.explanation || "No explanation provided for this question."}
              </p>
            </div>
          )}

          {/* Action Footer */}
          <div className="mt-auto pt-6 border-t border-white/10 flex justify-end">
            <Button
              size="lg"
              className={`rounded-xl px-10 ${isRevealed ? 'animate-in fade-in slide-in-from-right-4' : 'opacity-0 pointer-events-none'}`}
              onClick={handleNext}
              disabled={submitSession.isPending}
            >
              {submitSession.isPending ? (
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              ) : isLastQuestion ? (
                <>Finish Interview <Send className="ml-2 h-5 w-5" /></>
              ) : (
                <>Next Question <ChevronRight className="ml-2 h-5 w-5" /></>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
