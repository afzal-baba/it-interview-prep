import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { 
  useListQuestions, 
  useSubmitSession,
  AnswerInput,
  getListQuestionsQueryKey
} from "@workspace/api-client-react";
import { useQuizState } from "@/lib/quiz-context";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, XCircle, ChevronRight, Loader2, Send } from "lucide-react";

export default function Quiz() {
  const [, setLocation] = useLocation();
  const { currentSession, setResult } = useQuizState();
  const submitSession = useSubmitSession();

  const { data: questions, isLoading } = useListQuestions(
    currentSession?.courseId || 0,
    { level: currentSession?.level as any },
    { 
      query: { 
        enabled: !!currentSession,
        queryKey: getListQuestionsQueryKey(currentSession?.courseId || 0, { level: currentSession?.level as any })
      } 
    }
  );

  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<AnswerInput[]>([]);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [isRevealed, setIsRevealed] = useState(false);

  // Redirect if no session
  useEffect(() => {
    if (!currentSession) {
      setLocation("/");
    }
  }, [currentSession, setLocation]);

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

  const handleSelect = (idx: number) => {
    if (isRevealed) return;
    setSelectedOption(idx);
    setIsRevealed(true);
    setAnswers(prev => [...prev, { questionId: currentQ.id, selectedOptionIndex: idx }]);
  };

  const handleNext = () => {
    if (isLastQuestion) {
      submitSession.mutate(
        { 
          sessionId: currentSession.id, 
          data: { answers } 
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

  const isCorrect = selectedOption === currentQ.correctOptionIndex;

  return (
    <div className="w-full max-w-4xl mx-auto py-8 px-4 flex flex-col min-h-[calc(100vh-80px)]">
      {/* Header Stats */}
      <div className="flex items-center justify-between mb-8">
        <div className="space-y-1">
          <div className="text-sm font-mono text-muted-foreground uppercase tracking-wider">
            {currentSession.level} Level
          </div>
          <div className="font-bold text-xl">Question {currentIndex + 1} of {questions.length}</div>
        </div>
        <Badge variant="outline" className="font-mono text-base px-4 py-1.5 border-2">
          {currentIndex + 1} / {questions.length}
        </Badge>
      </div>

      <Progress value={progress} className="mb-12 h-3" />

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

          <div className="space-y-4 mb-8 flex-1">
            {currentQ.options.map((opt, idx) => {
              let btnClass = "border-white/10 bg-white/5 hover:bg-white/10 hover:border-primary/50 text-white";
              let icon = null;
              
              if (isRevealed) {
                if (idx === currentQ.correctOptionIndex) {
                  btnClass = "border-success bg-success/20 text-white shadow-[0_0_15px_rgba(0,255,100,0.2)]";
                  icon = <CheckCircle2 className="text-success" />;
                } else if (idx === selectedOption) {
                  btnClass = "border-destructive bg-destructive/20 text-white";
                  icon = <XCircle className="text-destructive" />;
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
                  className={`w-full text-left p-5 rounded-xl border-2 transition-all duration-300 flex items-center justify-between group ${btnClass}`}
                >
                  <span className="text-lg flex-1">{opt}</span>
                  {icon && <span className="ml-4 animate-in zoom-in">{icon}</span>}
                </button>
              );
            })}
          </div>

          {/* Explanation Area */}
          {isRevealed && (
            <div className={`mt-auto p-6 rounded-xl border-2 mb-8 animate-in slide-in-from-top-4 fade-in ${isCorrect ? 'border-success/30 bg-success/10' : 'border-destructive/30 bg-destructive/10'}`}>
              <h4 className={`font-bold mb-2 flex items-center gap-2 ${isCorrect ? 'text-success' : 'text-destructive'}`}>
                {isCorrect ? 'Correct!' : 'Incorrect.'}
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
