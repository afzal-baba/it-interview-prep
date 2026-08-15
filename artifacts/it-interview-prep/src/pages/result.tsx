import { useEffect } from "react";
import { useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useCreateLeaderboardEntry } from "@workspace/api-client-react";
import { useQuizState } from "@/lib/quiz-context";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Trophy, ArrowRight, Home, CheckCircle2, XCircle, Award, Zap, Timer } from "lucide-react";

const formSchema = z.object({
  playerName: z.string().min(2, "Name must be at least 2 characters").max(30),
});

export default function Result() {
  const [, setLocation] = useLocation();
  const { sessionResult, currentSession, timedMode } = useQuizState();
  const createLeaderboardEntry = useCreateLeaderboardEntry();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting, isSubmitSuccessful },
  } = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
  });

  useEffect(() => {
    if (!sessionResult || !currentSession) {
      setLocation("/");
    }
  }, [sessionResult, currentSession, setLocation]);

  if (!sessionResult || !currentSession) return null;

  const timeBonus = sessionResult.timeBonus ?? 0;
  const baseScore = sessionResult.score - timeBonus;

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    await createLeaderboardEntry.mutateAsync({
      data: {
        sessionId: sessionResult.sessionId,
        playerName: values.playerName,
      }
    });
  };

  const getScoreColor = (pct: number) => {
    if (pct >= 85) return "text-success";
    if (pct >= 70) return "text-primary";
    if (pct >= 50) return "text-accent";
    return "text-destructive";
  };

  return (
    <div className="w-full max-w-5xl mx-auto py-12 px-4 animate-in fade-in slide-in-from-bottom-8 duration-700">
      
      <div className="text-center mb-12">
        <div className="inline-flex items-center justify-center p-4 rounded-full bg-primary/10 text-primary mb-6 ring-8 ring-primary/5">
          <Trophy size={48} strokeWidth={1.5} />
        </div>
        <h1 className="text-4xl font-extrabold tracking-tight mb-4">Interview Complete</h1>
        {timedMode && (
          <div className="inline-flex items-center gap-2 text-orange-500 font-bold bg-orange-500/10 px-4 py-1.5 rounded-full border border-orange-500/20 mb-4">
            <Timer size={16} />
            Timed Mode
          </div>
        )}
        <p className="text-xl text-muted-foreground">Here is how you performed.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-12">
        {/* Score Card */}
        <Card className="lg:col-span-1 border-2 border-primary/20 bg-primary/5 shadow-xl">
          <CardContent className="p-8 flex flex-col items-center justify-center text-center h-full">
            <div className={`text-6xl font-black font-mono tracking-tighter mb-2 ${getScoreColor(sessionResult.percentage)}`}>
              {Math.round(sessionResult.percentage)}%
            </div>
            <p className="text-lg font-medium text-foreground mb-4">
              {sessionResult.correctCount} out of {sessionResult.totalQuestions} correct
            </p>

            {/* Score breakdown for timed mode */}
            {timedMode && (
              <div className="w-full mb-6 space-y-2 text-sm bg-background/50 rounded-xl p-4 border">
                <div className="flex justify-between text-muted-foreground">
                  <span>Base score</span>
                  <span className="font-mono font-bold">{baseScore} pts</span>
                </div>
                <div className="flex justify-between text-orange-500">
                  <span className="flex items-center gap-1"><Zap size={12} /> Speed bonus</span>
                  <span className="font-mono font-bold">+{timeBonus} pts</span>
                </div>
                <div className="border-t pt-2 flex justify-between font-bold text-foreground">
                  <span>Total score</span>
                  <span className="font-mono">{sessionResult.score} pts</span>
                </div>
              </div>
            )}
            
            {sessionResult.badges.length > 0 ? (
              <div className="space-y-3 w-full">
                <div className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Badges Earned</div>
                <div className="flex flex-wrap justify-center gap-2">
                  {sessionResult.badges.map(b => (
                    <Badge key={b} className="bg-[#FFD700] text-black px-4 py-1.5 text-sm font-bold border-0 shadow-md">
                      <Award size={16} className="mr-1 inline" /> {b}
                    </Badge>
                  ))}
                </div>
              </div>
            ) : (
              <div className="text-sm font-bold uppercase tracking-wider text-muted-foreground">
                No badges earned. Keep practicing!
              </div>
            )}
          </CardContent>
        </Card>

        {/* Save to Leaderboard */}
        <Card className="lg:col-span-2 shadow-lg">
          <CardHeader>
            <CardTitle className="text-2xl">Claim Your Rank</CardTitle>
          </CardHeader>
          <CardContent>
            {isSubmitSuccessful ? (
              <div className="bg-success/10 border-2 border-success/20 rounded-xl p-8 text-center animate-in zoom-in">
                <CheckCircle2 className="w-12 h-12 text-success mx-auto mb-4" />
                <h3 className="text-xl font-bold text-success mb-2">Score Saved!</h3>
                <p className="text-foreground/80 mb-6">Your performance has been recorded on the global leaderboard.</p>
                <div className="flex justify-center gap-4">
                  <Button variant="outline" onClick={() => setLocation("/")}>
                    <Home className="mr-2 h-4 w-4" /> Home
                  </Button>
                  <Button onClick={() => setLocation("/leaderboard")}>
                    View Leaderboard <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                <p className="text-muted-foreground">
                  Enter your name to save your score to the global leaderboard. Compete with others and track your progress!
                </p>
                <div className="space-y-2">
                  <Input 
                    placeholder="e.g. Alex, CodeNinja99..." 
                    {...register("playerName")}
                    className={`h-14 text-lg ${errors.playerName ? 'border-destructive' : ''}`}
                    autoComplete="off"
                  />
                  {errors.playerName && (
                    <p className="text-sm text-destructive">{errors.playerName.message}</p>
                  )}
                </div>
                <Button type="submit" size="lg" className="w-full h-14 text-lg rounded-xl" disabled={isSubmitting}>
                  {isSubmitting ? 'Saving...' : 'Save to Leaderboard'}
                </Button>
                <div className="pt-4 flex justify-center">
                  <Button variant="ghost" type="button" onClick={() => setLocation("/")}>
                    Skip for now
                  </Button>
                </div>
              </form>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Breakdown */}
      <div className="space-y-6">
        <h3 className="text-2xl font-bold">Detailed Breakdown</h3>
        <div className="space-y-4">
          {sessionResult.questionResults.map((qr, idx) => (
            <div key={qr.questionId} className={`p-6 rounded-xl border-l-4 ${qr.isCorrect ? 'border-l-success bg-white' : 'border-l-destructive bg-white'} shadow-sm border-y border-r border-border`}>
              <div className="flex items-start gap-4">
                <div className="mt-1">
                  {qr.isCorrect ? <CheckCircle2 className="text-success w-6 h-6" /> : <XCircle className="text-destructive w-6 h-6" />}
                </div>
                <div>
                  <h4 className="font-bold text-lg mb-2">Question {idx + 1}</h4>
                  {qr.explanation && (
                    <p className="text-muted-foreground">{qr.explanation}</p>
                  )}
                  {!qr.isCorrect && !qr.explanation && (
                    <p className="text-muted-foreground">No explanation available.</p>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
