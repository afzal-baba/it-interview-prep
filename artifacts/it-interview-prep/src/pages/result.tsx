import { useEffect, useRef, useState, useCallback } from "react";
import confetti from "canvas-confetti";
import { useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  useCreateLeaderboardEntry,
  useListCourses,
} from "@workspace/api-client-react";
import { useQuizState } from "@/lib/quiz-context";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Trophy, ArrowRight, Home, CheckCircle2, XCircle, Award, Zap,
  Timer, Linkedin, Twitter, Copy, Check, Users, Share2,
} from "lucide-react";

// ─── Motivating quotes by tier ────────────────────────────────────────────────
const QUOTES: Record<string, string[]> = {
  legendary: [
    "\"The expert in anything was once a beginner who refused to quit.\"",
    "\"Success is the sum of small efforts, repeated day in and day out.\" — R. Collier",
    "\"Excellence is not a destination but a continuous journey.\" — Brian Tracy",
    "\"The harder you work for something, the greater you'll feel when you achieve it.\"",
    "\"Champions keep playing until they get it right.\" — Billie Jean King",
  ],
  excellent: [
    "\"Success usually comes to those who are too busy to be looking for it.\" — Thoreau",
    "\"The secret of getting ahead is getting started.\" — Mark Twain",
    "\"It always seems impossible until it's done.\" — Nelson Mandela",
    "\"Quality is not an act, it is a habit.\" — Aristotle",
    "\"Work hard in silence. Let success make the noise.\"",
  ],
  good: [
    "\"Progress, not perfection, is the goal.\"",
    "\"A little progress each day adds up to big results.\"",
    "\"Keep going. Everything you need will come to you at the right time.\"",
    "\"Small steps in the right direction can turn out to be the biggest step of your life.\"",
    "\"Rome wasn't built in a day, but they were laying bricks every hour.\"",
  ],
  none: [
    "\"The only way to do great work is to love what you do.\" — Steve Jobs",
    "\"Fall seven times, stand up eight.\" — Japanese Proverb",
    "\"Challenges are what make life interesting. Overcoming them is what makes it meaningful.\"",
    "\"Every master was once a disaster.\"",
    "\"You don't have to be great to start, but you have to start to be great.\" — Zig Ziglar",
  ],
  sad: [
    "\"It does not matter how slowly you go as long as you do not stop.\" — Confucius",
    "\"Failure is simply the opportunity to begin again, this time more intelligently.\" — Henry Ford",
    "\"The greatest glory in living lies not in never falling, but in rising every time we fall.\" — Nelson Mandela",
    "\"Every expert was once a beginner. Every pro was once an amateur.\"",
    "\"Success is not final, failure is not fatal: It is the courage to continue that counts.\" — Churchill",
  ],
};

function getRandomQuote(type: string): string {
  const pool = QUOTES[type] ?? QUOTES.none;
  return pool[Math.floor(Math.random() * pool.length)];
}

// ─── Score tier config ────────────────────────────────────────────────────────
function getScoreTier(pct: number) {
  if (pct >= 95) return {
    emoji: "🏆", label: "Legendary!", color: "text-yellow-400",
    borderColor: "border-yellow-400/40", bgColor: "bg-yellow-400/5",
    glowClass: "score-glow-gold",
    message: "You're interview-ready. FAANG is within reach — go get it.",
    confettiType: "legendary" as const,
    quoteType: "legendary",
  };
  if (pct >= 85) return {
    emoji: "🎉", label: "Excellent!", color: "text-green-400",
    borderColor: "border-green-400/30", bgColor: "bg-green-400/5",
    glowClass: "",
    message: "Outstanding! You'll ace your next technical interview.",
    confettiType: "excellent" as const,
    quoteType: "excellent",
  };
  if (pct >= 70) return {
    emoji: "⭐", label: "Great Work!", color: "text-blue-400",
    borderColor: "border-blue-400/30", bgColor: "bg-blue-400/5",
    glowClass: "",
    message: "Solid foundation. A bit more practice and you'll be unstoppable.",
    confettiType: "good" as const,
    quoteType: "good",
  };
  if (pct >= 50) return {
    emoji: "💪", label: "Keep Going!", color: "text-orange-400",
    borderColor: "border-orange-400/30", bgColor: "bg-orange-400/5",
    glowClass: "",
    message: "You're on the right track. Review the explanations and retry!",
    confettiType: "none" as const,
    quoteType: "none",
  };
  return {
    emoji: "🦆", label: "Don't Give Up!", color: "text-red-400",
    borderColor: "border-red-400/30", bgColor: "bg-red-400/5",
    glowClass: "",
    message: "Every expert was once a beginner. Review the basics and come back stronger!",
    confettiType: "sad" as const,
    quoteType: "sad",
  };
}

// ─── Confetti ─────────────────────────────────────────────────────────────────
function fireConfetti(type: "legendary" | "excellent" | "good" | "none" | "sad") {
  if (type === "none" || type === "sad") return;
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

  if (type === "legendary") {
    const duration = 3500;
    const end = Date.now() + duration;
    const colors = ["#FFD700", "#FFA500", "#FFFFFF", "#FFE066", "#FFAA00"];
    const frame = () => {
      confetti({ particleCount: 4, angle: 60,  spread: 55, origin: { x: 0 }, colors });
      confetti({ particleCount: 4, angle: 120, spread: 55, origin: { x: 1 }, colors });
      if (Date.now() < end) requestAnimationFrame(frame);
    };
    frame();
    // Big central burst
    setTimeout(() => confetti({ particleCount: 120, spread: 100, origin: { y: 0.5 }, colors }), 200);
  } else if (type === "excellent") {
    confetti({ particleCount: 160, spread: 90, origin: { y: 0.55 } });
    setTimeout(() => confetti({ particleCount: 60, angle: 60,  spread: 60, origin: { x: 0, y: 0.7 } }), 300);
    setTimeout(() => confetti({ particleCount: 60, angle: 120, spread: 60, origin: { x: 1, y: 0.7 } }), 300);
  } else if (type === "good") {
    confetti({ particleCount: 80, angle: 60,  spread: 55, origin: { x: 0,   y: 0.7 } });
    confetti({ particleCount: 80, angle: 120, spread: 55, origin: { x: 1,   y: 0.7 } });
  }
}

// ─── Sad duck overlay ─────────────────────────────────────────────────────────
function SadDuck() {
  const messages = [
    "Quack... better luck next time! 🥺",
    "Even ducks fail sometimes 🦆",
    "Waddle waddle, try again! 💙",
    "Don't be a sitting duck — practice! 🎯",
  ];
  const msg = messages[Math.floor(Math.random() * messages.length)];

  return (
    <div
      className="fixed bottom-8 right-8 z-50 pointer-events-none flex flex-col items-center gap-2"
      style={{ animation: "duck-pop-in 0.6s cubic-bezier(0.34,1.56,0.64,1) 0.8s both" }}
    >
      {/* Speech bubble */}
      <div
        className="bg-white text-gray-800 text-xs font-bold px-3 py-2 rounded-2xl shadow-xl border border-gray-100 whitespace-nowrap relative"
        style={{ animation: "bubble-pop 0.4s ease 1.4s both" }}
      >
        {msg}
        {/* Bubble tail */}
        <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-3 h-3 bg-white border-r border-b border-gray-100 rotate-45" />
      </div>
      {/* Duck */}
      <div style={{ fontSize: 52, animation: "duck-bob 1.2s ease-in-out infinite 1.6s" }}>
        🦆
      </div>
    </div>
  );
}

// ─── Share panel ──────────────────────────────────────────────────────────────
function SharePanel({
  percentage, courseName, level, courseId, playerName,
}: {
  percentage: number; courseName: string; level: string;
  courseId: number; playerName: string;
}) {
  const [copied, setCopied] = useState(false);
  const [shared, setShared] = useState(false);

  const base = `${window.location.origin}${import.meta.env.BASE_URL.replace(/\/$/, "")}`;
  const pct = Math.round(percentage);
  const shareText = `I just scored ${pct}% on a ${level} ${courseName} quiz on TechInterviewPrep! 🚀 Test your skills → ${base}`;
  const challengeUrl = `${base}?c=${courseId}&l=${encodeURIComponent(level)}&from=${encodeURIComponent(playerName || "A friend")}&cn=${encodeURIComponent(courseName)}`;

  const linkedInUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(base)}&summary=${encodeURIComponent(shareText)}`;
  const twitterUrl  = `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}`;

  const copyChallenge = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(challengeUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // fallback
      const ta = document.createElement("textarea");
      ta.value = challengeUrl;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  }, [challengeUrl]);

  const nativeShare = useCallback(async () => {
    if (!navigator.share) return;
    try {
      await navigator.share({ title: "TechInterviewPrep Challenge", text: shareText, url: challengeUrl });
      setShared(true);
    } catch { /* cancelled */ }
  }, [shareText, challengeUrl]);

  return (
    <div
      className="w-full rounded-2xl border border-white/10 bg-white/3 p-6 space-y-5"
      style={{ animation: "share-slide-up 0.5s ease 0.4s both", backdropFilter: "blur(8px)" }}
    >
      {/* Score share */}
      <div>
        <p className="text-xs font-mono uppercase tracking-widest text-muted-foreground mb-3">
          Share your score
        </p>
        <div className="flex flex-wrap gap-2">
          <Button
            size="sm"
            className="bg-[#0077B5] hover:bg-[#005885] text-white border-0 gap-2 rounded-xl"
            onClick={() => window.open(linkedInUrl, "_blank", "width=570,height=520")}
          >
            <Linkedin size={15} /> LinkedIn
          </Button>
          <Button
            size="sm"
            className="bg-black hover:bg-zinc-900 text-white border border-zinc-700 gap-2 rounded-xl"
            onClick={() => window.open(twitterUrl, "_blank", "width=570,height=520")}
          >
            <Twitter size={15} /> X / Twitter
          </Button>
          {typeof navigator.share === "function" && (
            <Button
              size="sm"
              variant="outline"
              className="gap-2 rounded-xl"
              onClick={nativeShare}
            >
              <Share2 size={15} /> {shared ? "Shared!" : "Share"}
            </Button>
          )}
        </div>
      </div>

      {/* Challenge invite */}
      <div>
        <p className="text-xs font-mono uppercase tracking-widest text-muted-foreground mb-2">
          Challenge a friend
        </p>
        <p className="text-sm text-muted-foreground mb-3">
          Send your friend a direct link — they'll be challenged to beat your score on the same topic.
        </p>
        <div className="flex gap-2 items-center">
          <div className="flex-1 font-mono text-xs bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 truncate text-muted-foreground select-all">
            {challengeUrl}
          </div>
          <Button
            size="sm"
            onClick={copyChallenge}
            className={`rounded-xl gap-1.5 shrink-0 transition-colors ${copied ? "bg-green-600 hover:bg-green-600" : ""}`}
          >
            {copied ? <><Check size={14} /> Copied!</> : <><Copy size={14} /> Copy</>}
          </Button>
        </div>
        <Button
          size="sm"
          variant="outline"
          className="mt-2 w-full rounded-xl gap-2 border-primary/30 text-primary hover:bg-primary/10"
          onClick={copyChallenge}
        >
          <Users size={14} /> Invite Friend to Beat Your Score
        </Button>
      </div>
    </div>
  );
}

// ─── Player name persistence ───────────────────────────────────────────────────
const PLAYER_NAME_KEY = "leaderboard-player-name";
function getSavedPlayerName(): string {
  try { return localStorage.getItem(PLAYER_NAME_KEY) ?? ""; } catch { return ""; }
}
function persistPlayerName(name: string) {
  try { localStorage.setItem(PLAYER_NAME_KEY, name); } catch { /* noop */ }
}

// ─── Form schema ──────────────────────────────────────────────────────────────
const formSchema = z.object({
  playerName: z.string().min(2, "Name must be at least 2 characters").max(30),
});

// ─── Result page ──────────────────────────────────────────────────────────────
export default function Result() {
  const [, setLocation] = useLocation();
  const { sessionResult, currentSession, timedMode } = useQuizState();
  const createLeaderboardEntry = useCreateLeaderboardEntry();
  const { data: courses } = useListCourses();
  const [savedName, setSavedName] = useState("");
  const fired = useRef(false);
  const autoSubmitted = useRef(false);

  const knownName = getSavedPlayerName();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting, isSubmitSuccessful },
    getValues,
    setValue,
  } = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: { playerName: knownName },
  });

  useEffect(() => {
    document.title = "Your Results — TechInterviewPrep";
  }, []);

  useEffect(() => {
    if (!sessionResult || !currentSession) setLocation("/");
  }, [sessionResult, currentSession, setLocation]);

  // Fire confetti once on mount
  useEffect(() => {
    if (!sessionResult || fired.current) return;
    fired.current = true;
    const tier = getScoreTier(sessionResult.percentage);
    fireConfetti(tier.confettiType);
  }, [sessionResult]);

  if (!sessionResult || !currentSession) return null;

  const tier        = getScoreTier(sessionResult.percentage);
  const timeBonus   = sessionResult.timeBonus ?? 0;
  const baseScore   = sessionResult.score - timeBonus;
  const courseName  = courses?.find(c => c.id === currentSession.courseId)?.name ?? "";
  const level       = currentSession.level ?? "";

  // Auto-submit if we already know the player's name from a previous session
  useEffect(() => {
    if (!sessionResult || !currentSession) return;
    if (autoSubmitted.current) return;
    if (!knownName || knownName.length < 2) return;
    autoSubmitted.current = true;
    createLeaderboardEntry.mutateAsync({
      data: { sessionId: sessionResult.sessionId, playerName: knownName },
    }).then(() => {
      setSavedName(knownName);
    }).catch(() => {
      // Silent fail — user can still manually submit below
      autoSubmitted.current = false;
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionResult, currentSession]);

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    await createLeaderboardEntry.mutateAsync({
      data: { sessionId: sessionResult!.sessionId, playerName: values.playerName },
    });
    persistPlayerName(values.playerName);
    setSavedName(values.playerName);
  };

  const currentPlayerName = savedName || getValues("playerName") || "";

  return (
    <div className="w-full max-w-5xl mx-auto py-10 px-4 animate-in fade-in slide-in-from-bottom-8 duration-700">

      {/* ── Sad duck for low scores ── */}
      {tier.confettiType === "sad" && <SadDuck />}

      {/* ── Score hero ── */}
      <div className={`text-center mb-10 p-8 rounded-3xl border-2 ${tier.borderColor} ${tier.bgColor} relative overflow-hidden`}>
        {/* Glow orb for legendary */}
        {tier.confettiType === "legendary" && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="w-64 h-64 rounded-full bg-yellow-400/10 blur-3xl" />
          </div>
        )}

        <div
          className="text-6xl mb-3 inline-block"
          style={tier.confettiType === "legendary"
            ? { animation: "trophy-pulse 2s ease-in-out infinite" }
            : { animation: "result-badge-pop 0.6s cubic-bezier(0.34,1.56,0.64,1) 0.1s both" }}
        >
          {tier.emoji}
        </div>

        <h1
          className={`text-5xl font-black tracking-tight mb-2 ${tier.color}`}
          style={tier.confettiType === "legendary" ? { animation: "score-glow-gold 2.5s ease-in-out infinite" } : {}}
        >
          {tier.label}
        </h1>
        <p className="text-xl text-muted-foreground max-w-md mx-auto">{tier.message}</p>

        {/* Motivating quote */}
        <p
          className="text-sm italic max-w-lg mx-auto mt-4 opacity-70"
          style={{
            fontFamily: "'Inter', sans-serif",
            lineHeight: 1.6,
            color: "currentColor",
          }}
        >
          {getRandomQuote(tier.quoteType)}
        </p>

        {timedMode && (
          <div className="inline-flex items-center gap-2 text-orange-500 font-bold bg-orange-500/10 px-4 py-1.5 rounded-full border border-orange-500/20 mt-4">
            <Timer size={15} /> Timed Mode
          </div>
        )}
      </div>

      {/* ── Stats + leaderboard row ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">

        {/* Score card */}
        <Card className="lg:col-span-1 border-2 border-primary/20 bg-primary/5 shadow-xl">
          <CardContent className="p-8 flex flex-col items-center justify-center text-center h-full gap-4">
            <div className={`text-7xl font-black font-mono tracking-tighter ${tier.color}`}>
              {Math.round(sessionResult.percentage)}%
            </div>
            <p className="text-lg font-medium text-foreground">
              {sessionResult.correctCount} / {sessionResult.totalQuestions} correct
            </p>

            {/* Timed score breakdown */}
            {timedMode && (
              <div className="w-full space-y-1.5 text-sm bg-background/50 rounded-xl p-4 border">
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

            {/* Badges */}
            {sessionResult.badges.length > 0 ? (
              <div className="space-y-2 w-full">
                <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Badges Earned</div>
                <div className="flex flex-wrap justify-center gap-2">
                  {sessionResult.badges.map((b, i) => (
                    <Badge
                      key={b}
                      className="bg-[#FFD700] text-black px-4 py-1.5 text-sm font-bold border-0 shadow-md"
                      style={{ animation: `result-badge-pop 0.5s cubic-bezier(0.34,1.56,0.64,1) ${0.3 + i * 0.1}s both` }}
                    >
                      <Award size={14} className="mr-1 inline" /> {b}
                    </Badge>
                  ))}
                </div>
              </div>
            ) : (
              <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                No badges yet — keep practising!
              </div>
            )}
          </CardContent>
        </Card>

        {/* Save to leaderboard */}
        <Card className="lg:col-span-2 shadow-lg">
          <CardHeader>
            <CardTitle className="text-2xl">Claim Your Rank</CardTitle>
          </CardHeader>
          <CardContent>
            {(isSubmitSuccessful || savedName !== "") ? (
              <div className="bg-success/10 border-2 border-success/20 rounded-xl p-8 text-center animate-in zoom-in">
                <CheckCircle2 className="w-12 h-12 text-success mx-auto mb-4" />
                <h3 className="text-xl font-bold text-success mb-2">Score Saved! 🎉</h3>
                <p className="text-foreground/80 mb-6">
                  <strong>{savedName || knownName}</strong>'s performance is on the global leaderboard.
                </p>
                <div className="flex justify-center gap-3 flex-wrap">
                  <Button variant="outline" onClick={() => setLocation("/")}>
                    <Home className="mr-2 h-4 w-4" /> Home
                  </Button>
                  <Button onClick={() => setLocation("/leaderboard")}>
                    View Leaderboard <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
                <p className="text-muted-foreground text-sm">
                  Enter your name to save your score to the global leaderboard and unlock the <strong>Invite a Friend</strong> challenge link.
                </p>
                <div className="space-y-2">
                  <Input
                    placeholder="e.g. Alex, CodeNinja99..."
                    {...register("playerName")}
                    className={`h-14 text-lg ${errors.playerName ? "border-destructive" : ""}`}
                    autoComplete="off"
                  />
                  {errors.playerName && (
                    <p className="text-sm text-destructive">{errors.playerName.message}</p>
                  )}
                </div>
                <Button type="submit" size="lg" className="w-full h-14 text-lg rounded-xl" disabled={isSubmitting}>
                  {isSubmitting ? "Saving…" : "Save to Leaderboard"}
                </Button>
                <div className="flex justify-center">
                  <Button variant="ghost" type="button" onClick={() => setLocation("/")}>
                    Skip for now
                  </Button>
                </div>
              </form>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ── Share & challenge panel ── */}
      <SharePanel
        percentage={sessionResult.percentage}
        courseName={courseName}
        level={level}
        courseId={currentSession.courseId}
        playerName={currentPlayerName}
      />

      {/* ── Detailed breakdown ── */}
      <div className="mt-10 space-y-6">
        <h3 className="text-2xl font-bold">Detailed Breakdown</h3>
        <div className="space-y-4">
          {sessionResult.questionResults.map((qr, idx) => (
            <div
              key={qr.questionId}
              className={`p-6 rounded-xl border-l-4 ${qr.isCorrect ? "border-l-success bg-white" : "border-l-destructive bg-white"} shadow-sm border-y border-r border-border`}
              style={{ animation: `share-slide-up 0.35s ease ${0.05 * idx}s both` }}
            >
              <div className="flex items-start gap-4">
                <div className="mt-1 shrink-0">
                  {qr.isCorrect
                    ? <CheckCircle2 className="text-success w-6 h-6" />
                    : <XCircle className="text-destructive w-6 h-6" />}
                </div>
                <div>
                  <h4 className="font-bold text-lg mb-1">Question {idx + 1}</h4>
                  {qr.explanation ? (
                    <p className="text-muted-foreground">{qr.explanation}</p>
                  ) : (
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
