import { useState, useEffect, useRef, useMemo } from "react";
import { useLocation, useSearch } from "wouter";
import { useListCourses } from "@workspace/api-client-react";
import { useRaceSocket, type Level, type RaceStart, type RaceFinished, type ChatMessage } from "@/lib/race-socket";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Swords, Loader2, CheckCircle2, XCircle, Timer, Trophy, Users, Zap, Flag, ChevronRight,
  MessageCircle, Send, X,
} from "lucide-react";
import { cn } from "@/lib/utils";

const NAME_KEY = "race-player-name";

export default function Race() {
  const search = useSearch();
  const params = useMemo(() => new URLSearchParams(search), [search]);
  const targetFromUrl = params.get("opponent");

  const socket = useRaceSocket();
  const [name, setName] = useState<string>(() => localStorage.getItem(NAME_KEY) ?? "");

  // Auto-register once connected if we already have a stored name
  const registeredOnce = useRef(false);
  useEffect(() => {
    if (socket.connected && !socket.registered && name.length >= 2 && !registeredOnce.current) {
      registeredOnce.current = true;
      socket.register(name);
    }
    if (!socket.connected) registeredOnce.current = false;
  }, [socket.connected, socket.registered, name, socket]);

  if (!socket.connected) {
    return (
      <div className="w-full flex-1 flex items-center justify-center">
        <div className="animate-pulse flex flex-col items-center gap-4">
          <Loader2 className="w-12 h-12 text-primary animate-spin" />
          <p className="text-muted-foreground font-medium font-mono uppercase tracking-widest">
            Connecting to race server...
          </p>
        </div>
      </div>
    );
  }

  if (!socket.registered) {
    return (
      <NameEntry
        name={name}
        setName={setName}
        error={socket.error}
        onSubmit={(n) => {
          localStorage.setItem(NAME_KEY, n);
          setName(n);
          socket.register(n);
        }}
      />
    );
  }

  if (socket.finished) {
    return <RaceResults finished={socket.finished} myName={name} race={socket.race} onDone={socket.resetRace} />;
  }

  if (socket.race) {
    return <ActiveRace socket={socket} myName={name} />;
  }

  return <Lobby socket={socket} myName={name} initialTarget={targetFromUrl} />;
}

/* ---------- Name entry ---------- */

function NameEntry({
  name, setName, error, onSubmit,
}: {
  name: string;
  setName: (n: string) => void;
  error: string | null;
  onSubmit: (n: string) => void;
}) {
  const valid = name.trim().length >= 2;
  return (
    <div className="w-full max-w-md mx-auto py-20 px-4">
      <Card className="shadow-xl border-2">
        <CardHeader className="text-center">
          <div className="inline-flex items-center justify-center p-4 rounded-full bg-primary/10 text-primary mb-2 mx-auto">
            <Swords size={32} />
          </div>
          <CardTitle className="text-2xl">Enter the Challenge Arena</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-muted-foreground text-center text-sm">
            Pick a racer name so opponents know who they're up against.
          </p>
          <Input
            placeholder="e.g. CodeNinja99"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && valid && onSubmit(name.trim())}
            className="h-14 text-lg"
            autoComplete="off"
          />
          {error && <p className="text-sm text-destructive text-center">{error}</p>}
          <Button className="w-full h-12 text-lg rounded-xl" disabled={!valid} onClick={() => onSubmit(name.trim())}>
            Join Arena <ChevronRight className="ml-2 h-5 w-5" />
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

/* ---------- Chat panel ---------- */

function ChatPanel({
  messages,
  myName,
  onSend,
  compact = false,
}: {
  messages: ChatMessage[];
  myName: string;
  onSend: (text: string) => void;
  compact?: boolean;
}) {
  const [draft, setDraft] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const submit = () => {
    const t = draft.trim();
    if (!t) return;
    onSend(t);
    setDraft("");
  };

  return (
    <div className={cn("flex flex-col border-2 rounded-2xl overflow-hidden bg-card shadow-lg", compact ? "h-64" : "h-80")}>
      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-3 border-b bg-muted/30">
        <MessageCircle size={16} className="text-primary" />
        <span className="font-bold text-sm">Lobby Chat</span>
        {messages.length > 0 && (
          <span className="ml-auto text-xs text-muted-foreground">{messages.length} message{messages.length !== 1 ? "s" : ""}</span>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2 scroll-smooth">
        {messages.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-6">
            No messages yet. Say hi to the lobby!
          </p>
        ) : (
          messages.map((m, i) => {
            const isMe = m.fromName === myName;
            return (
              <div key={i} className={cn("flex gap-2 items-end", isMe && "flex-row-reverse")}>
                <div
                  className={cn(
                    "max-w-[80%] px-3 py-2 rounded-2xl text-sm leading-snug",
                    isMe
                      ? "bg-primary text-white rounded-br-sm"
                      : "bg-muted text-foreground rounded-bl-sm",
                  )}
                >
                  {!isMe && (
                    <span className="block text-[10px] font-bold text-primary mb-0.5">{m.fromName}</span>
                  )}
                  {m.text}
                </div>
              </div>
            );
          })
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="flex gap-2 p-3 border-t bg-muted/20">
        <Input
          placeholder="Type a message…"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && submit()}
          className="h-9 text-sm rounded-xl"
          maxLength={200}
        />
        <Button size="icon" className="h-9 w-9 rounded-xl shrink-0" onClick={submit} disabled={!draft.trim()}>
          <Send size={15} />
        </Button>
      </div>
    </div>
  );
}

/* ---------- Lobby ---------- */

function Lobby({
  socket, myName, initialTarget,
}: {
  socket: ReturnType<typeof useRaceSocket>;
  myName: string;
  initialTarget: string | null;
}) {
  const { data: courses } = useListCourses();
  const [courseId, setCourseId] = useState<number | null>(null);
  const [level, setLevel] = useState<Level>("beginner");
  const [target, setTarget] = useState<string | null>(initialTarget);

  useEffect(() => {
    if (courses && courses.length > 0 && courseId === null) setCourseId(courses[0].id);
  }, [courses, courseId]);

  const waiting = socket.myChallengeId !== null;
  const incoming = socket.challenges.filter(
    (c) => c.fromName !== myName && (c.targetName === null || c.targetName === myName),
  );
  const otherPlayers = socket.players.filter((p) => p.name !== myName);

  return (
    <div className="w-full max-w-5xl mx-auto py-12 px-4">
      <div className="text-center mb-10">
        <h1 className="text-4xl font-extrabold tracking-tight mb-3 flex items-center justify-center gap-3">
          <Swords className="text-primary" size={36} /> Challenge Arena
        </h1>
        <p className="text-muted-foreground text-lg">
          Playing as <span className="font-bold text-foreground">{myName}</span> — challenge a player and answer the
          same questions head-to-head in real time.
        </p>
      </div>

      {socket.error && (
        <div className="mb-6 p-4 rounded-xl border-2 border-destructive/30 bg-destructive/10 text-destructive font-medium flex items-center justify-between">
          {socket.error}
          <Button variant="ghost" size="sm" onClick={socket.clearError}>Dismiss</Button>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Create challenge */}
        <Card className="shadow-lg border-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Flag size={20} className="text-primary" /> Start a Challenge</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {waiting ? (
              <div className="text-center py-8 space-y-4">
                <Loader2 className="w-10 h-10 text-primary animate-spin mx-auto" />
                <p className="font-medium">
                  {target ? <>Waiting for <span className="font-bold">{target}</span> to accept...</> : "Waiting for an opponent to join..."}
                </p>
                <p className="text-sm text-muted-foreground">Keep this page open — the race starts automatically.</p>
                <Button variant="outline" onClick={socket.cancelChallenge}>Cancel Challenge</Button>
              </div>
            ) : (
              <>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-muted-foreground">COURSE</label>
                  <select
                    className="w-full h-11 px-4 rounded-xl border bg-background text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary"
                    value={courseId ?? ""}
                    onChange={(e) => setCourseId(Number(e.target.value))}
                  >
                    {courses?.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-muted-foreground">LEVEL</label>
                  <div className="flex gap-2">
                    {(["beginner", "intermediate", "advanced"] as Level[]).map((l) => (
                      <button
                        key={l}
                        onClick={() => setLevel(l)}
                        className={cn(
                          "flex-1 h-11 rounded-xl border text-sm font-medium capitalize transition-all",
                          level === l ? "bg-primary text-white border-primary" : "bg-background hover:border-primary/50",
                        )}
                      >
                        {l}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-muted-foreground">OPPONENT</label>
                  <select
                    className="w-full h-11 px-4 rounded-xl border bg-background text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary"
                    value={target ?? ""}
                    onChange={(e) => setTarget(e.target.value || null)}
                  >
                    <option value="">Anyone (random opponent)</option>
                    {target && !otherPlayers.some((p) => p.name === target) && (
                      <option value={target}>{target} (from leaderboard)</option>
                    )}
                    {otherPlayers.map((p) => (
                      <option key={p.id} value={p.name} disabled={p.inRace}>
                        {p.name}{p.inRace ? " (in race)" : ""}
                      </option>
                    ))}
                  </select>
                  {target && !otherPlayers.some((p) => p.name === target) && (
                    <p className="text-xs text-muted-foreground">
                      {target} isn't online right now — they'll see your challenge if they enter the arena.
                    </p>
                  )}
                </div>
                <Button
                  className="w-full h-12 text-lg rounded-xl"
                  disabled={courseId === null}
                  onClick={() => courseId !== null && socket.createChallenge(courseId, level, target)}
                >
                  <Swords className="mr-2 h-5 w-5" /> {target ? `Challenge ${target}` : "Race a Random Opponent"}
                </Button>
              </>
            )}
          </CardContent>
        </Card>

        <div className="space-y-6">
          {/* Incoming challenges */}
          <Card className="shadow-lg border-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Zap size={20} className="text-orange-500" /> Open Challenges</CardTitle>
            </CardHeader>
            <CardContent>
              {incoming.length === 0 ? (
                <p className="text-muted-foreground text-sm py-4 text-center">No open challenges right now.</p>
              ) : (
                <div className="space-y-3">
                  {incoming.map((c) => (
                    <div key={c.id} className="flex items-center justify-between p-4 rounded-xl border bg-muted/30">
                      <div>
                        <div className="font-bold">{c.fromName}</div>
                        <div className="text-xs text-muted-foreground">
                          {c.courseName} · <span className="capitalize">{c.level}</span>
                          {c.targetName === myName && (
                            <Badge className="ml-2 bg-orange-500 text-white border-0 text-[10px]">Challenges you!</Badge>
                          )}
                        </div>
                      </div>
                      <Button size="sm" disabled={waiting} onClick={() => socket.acceptChallenge(c.id)}>
                        Accept
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Online players */}
          <Card className="shadow-lg border-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users size={20} className="text-primary" />
                Players Online
                {socket.players.length > 0 && (
                  <Badge variant="secondary" className="ml-auto font-mono text-xs">
                    {socket.players.length} in arena
                  </Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {otherPlayers.length === 0 ? (
                <p className="text-muted-foreground text-sm py-4 text-center">
                  You're the only one here. Create an open challenge and wait for a rival!
                </p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {otherPlayers.map((p) => (
                    <button
                      key={p.id}
                      disabled={p.inRace || waiting}
                      onClick={() => setTarget(p.name)}
                      className={cn(
                        "px-4 py-2 rounded-full border text-sm font-medium transition-all",
                        p.inRace ? "opacity-50" : "hover:border-primary hover:text-primary",
                        target === p.name && "border-primary bg-primary/10 text-primary",
                      )}
                    >
                      {p.name}{p.inRace ? " · racing" : ""}
                    </button>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Chat panel — full width below the two-column layout */}
      <div className="mt-8">
        <ChatPanel messages={socket.chatMessages} myName={myName} onSend={socket.sendChat} />
      </div>
    </div>
  );
}

/* ---------- Active race ---------- */

function ActiveRace({ socket, myName }: { socket: ReturnType<typeof useRaceSocket>; myName: string }) {
  const race = socket.race as RaceStart;
  const [now, setNow] = useState(() => Date.now());
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [pending, setPending] = useState(false); // answer sent, awaiting server verdict
  const [answeredCount, setAnsweredCount] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);
  const [doneWaiting, setDoneWaiting] = useState(false);
  const questionStart = useRef<number>(race.startAt);

  // Server verdict for the current question (drives the reveal)
  const result = socket.lastAnswerResult;
  const revealed = result?.questionIndex === currentIndex;

  // Global ticker (drives countdown + question timer)
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 100);
    return () => clearInterval(t);
  }, []);

  const countdownMs = race.startAt - now;
  const racing = countdownMs <= 0 && !doneWaiting;
  const question = race.questions[currentIndex];
  const limit = race.questionTimeLimitMs;

  useEffect(() => {
    if (countdownMs <= 0 && questionStart.current < race.startAt) {
      questionStart.current = race.startAt;
    }
  }, [countdownMs, race.startAt]);

  const elapsed = now - questionStart.current;
  const remaining = Math.max(0, limit - elapsed);

  const answer = (optionIndex: number) => {
    if (revealed || pending || !racing) return;
    setSelected(optionIndex);
    setPending(true);
    socket.sendAnswer(currentIndex, optionIndex);
  };

  // When the server verdict for the current question arrives: tally, reveal briefly, advance
  useEffect(() => {
    if (!result || result.questionIndex !== currentIndex || !pending) return;
    setPending(false);
    setAnsweredCount((c) => c + 1);
    if (result.correct) setCorrectCount((c) => c + 1);
    const t = setTimeout(() => {
      if (currentIndex + 1 >= race.questions.length) {
        setDoneWaiting(true);
      } else {
        setCurrentIndex((i) => i + 1);
        setSelected(null);
        questionStart.current = Date.now();
      }
    }, 1200);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [result, currentIndex]);

  // Timeout auto-answer
  useEffect(() => {
    if (racing && !revealed && !pending && remaining <= 0) {
      answer(-1);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [remaining, racing, revealed, pending]);

  const opp = socket.opponentProgress;
  const total = race.questions.length;

  if (countdownMs > 0) {
    const secs = Math.ceil(countdownMs / 1000);
    return (
      <div className="w-full flex-1 flex flex-col items-center justify-center gap-6 py-20">
        <p className="font-mono uppercase tracking-widest text-muted-foreground">
          {myName} <span className="text-primary font-bold">vs</span> {race.opponentName}
        </p>
        <div className="text-8xl font-black font-mono text-primary animate-in zoom-in" key={secs}>
          {secs}
        </div>
        <p className="text-xl font-bold">{race.courseName} · <span className="capitalize">{race.level}</span> · {total} questions</p>
        <p className="text-muted-foreground">Get ready — same questions, same clock. Fastest correct answer wins each question!</p>
      </div>
    );
  }

  if (doneWaiting) {
    return (
      <div className="w-full flex-1 flex flex-col items-center justify-center gap-6 py-20">
        <Loader2 className="w-12 h-12 text-primary animate-spin" />
        <h2 className="text-2xl font-bold">You finished! {correctCount}/{total} correct.</h2>
        <p className="text-muted-foreground">
          Waiting for <span className="font-bold text-foreground">{race.opponentName}</span> to finish
          ({opp?.answeredCount ?? 0}/{total} answered)...
        </p>
      </div>
    );
  }

  const timerProgress = (remaining / limit) * 100;
  const critical = remaining < 10_000;

  return (
    <div className="w-full max-w-4xl mx-auto py-8 px-4 flex flex-col min-h-[calc(100vh-80px)]">
      {/* VS header with both progress bars */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <RacerBar name={myName} label="You" answered={answeredCount} correct={correctCount} total={total} highlight />
        <RacerBar
          name={race.opponentName}
          label="Opponent"
          answered={opp?.answeredCount ?? 0}
          correct={opp?.correctCount ?? 0}
          total={total}
        />
      </div>

      {/* Timer */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-1.5">
          <div className={`flex items-center gap-1.5 text-sm font-mono font-bold ${critical ? "text-red-500" : "text-orange-500"}`}>
            <Timer size={14} /> {Math.ceil(remaining / 1000)}s
          </div>
          <div className="text-xs text-muted-foreground font-mono">Question {currentIndex + 1} of {total}</div>
        </div>
        <div className="h-2.5 w-full rounded-full bg-muted overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-100 ${critical ? "bg-red-500" : "bg-orange-400"}`}
            style={{ width: `${timerProgress}%` }}
          />
        </div>
      </div>

      {/* Question card */}
      <div className="dark-panel p-8 md:p-10 rounded-[2rem] flex-1 flex flex-col animate-in fade-in duration-300" key={currentIndex}>
        <h2 className="text-xl md:text-2xl font-bold leading-tight mb-8 text-white">{question.text}</h2>
        <div className="space-y-3">
          {question.options.map((opt, idx) => {
            let btnClass = "border-white/10 bg-white/5 hover:bg-white/10 hover:border-primary/50 text-white";
            let icon = null;
            if (revealed && result) {
              if (idx === result.correctOptionIndex) {
                btnClass = "border-success bg-success/20 text-white";
                icon = <CheckCircle2 className="text-success" size={20} />;
              } else if (idx === selected) {
                btnClass = "border-destructive bg-destructive/20 text-white";
                icon = <XCircle className="text-destructive" size={20} />;
              } else {
                btnClass = "border-white/5 bg-transparent opacity-50";
              }
            } else if (pending && idx === selected) {
              btnClass = "border-primary bg-primary/20 text-white";
            }
            return (
              <button
                key={idx}
                onClick={() => answer(idx)}
                disabled={revealed || pending}
                className={`w-full text-left p-4 rounded-xl border-2 transition-all duration-200 flex items-center justify-between ${btnClass}`}
              >
                <span className="flex-1">{opt}</span>
                {icon}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function RacerBar({
  name, label, answered, correct, total, highlight,
}: {
  name: string;
  label: string;
  answered: number;
  correct: number;
  total: number;
  highlight?: boolean;
}) {
  return (
    <div className={cn("p-4 rounded-2xl border-2", highlight ? "border-primary/40 bg-primary/5" : "border-border bg-white")}>
      <div className="flex items-center justify-between mb-2">
        <div className="font-bold truncate">{name} <span className="text-xs text-muted-foreground font-normal">({label})</span></div>
        <div className="text-xs font-mono font-bold text-muted-foreground">{answered}/{total} · {correct} ✓</div>
      </div>
      <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
        <div
          className={cn("h-full rounded-full transition-all duration-500", highlight ? "bg-primary" : "bg-orange-400")}
          style={{ width: `${total > 0 ? (answered / total) * 100 : 0}%` }}
        />
      </div>
    </div>
  );
}

/* ---------- Results ---------- */

function RaceResults({
  finished, myName, race, onDone,
}: {
  finished: RaceFinished;
  myName: string;
  race: RaceStart | null;
  onDone: () => void;
}) {
  const [, setLocation] = useLocation();
  const iWon = finished.winner === myName;
  const tie = finished.winner === null && !finished.forfeitedBy;

  return (
    <div className="w-full max-w-4xl mx-auto py-12 px-4 animate-in fade-in slide-in-from-bottom-8 duration-700">
      <div className="text-center mb-10">
        <div className={cn(
          "inline-flex items-center justify-center p-4 rounded-full mb-6 ring-8",
          iWon ? "bg-success/10 text-success ring-success/5" : tie ? "bg-primary/10 text-primary ring-primary/5" : "bg-destructive/10 text-destructive ring-destructive/5",
        )}>
          <Trophy size={48} strokeWidth={1.5} />
        </div>
        <h1 className="text-4xl font-extrabold tracking-tight mb-3">
          {finished.forfeitedBy
            ? `${finished.forfeitedBy} left the race — ${finished.winner} wins!`
            : tie
            ? "It's a tie!"
            : iWon
            ? "Victory!"
            : `${finished.winner} wins!`}
        </h1>
        {race && (
          <p className="text-muted-foreground text-lg">
            {race.courseName} · <span className="capitalize">{race.level}</span> · {myName} vs {race.opponentName}
          </p>
        )}
      </div>

      {finished.totals.length > 0 && (
        <div className="grid grid-cols-2 gap-4 mb-10">
          {finished.totals.map((t) => (
            <Card key={t.name} className={cn("border-2", t.name === finished.winner && "border-success/40 bg-success/5")}>
              <CardContent className="p-6 text-center">
                <div className="font-bold text-lg mb-1 flex items-center justify-center gap-2">
                  {t.name === finished.winner && <Trophy size={16} className="text-success" />}
                  {t.name}{t.name === myName && <span className="text-xs text-muted-foreground font-normal">(you)</span>}
                </div>
                <div className="text-3xl font-black font-mono">{t.correctCount}</div>
                <div className="text-xs text-muted-foreground uppercase tracking-wider mb-2">correct answers</div>
                <Badge variant="outline" className="font-mono">
                  <Zap size={11} className="mr-1 text-orange-500" /> {t.questionsWonFirst} answered first
                </Badge>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {finished.perQuestion.length > 0 && (
        <div className="space-y-4 mb-10">
          <h3 className="text-2xl font-bold">Question by Question</h3>
          {finished.perQuestion.map((pq) => (
            <div key={pq.questionIndex} className="p-5 rounded-xl border bg-white shadow-sm">
              <div className="flex items-start justify-between gap-4 mb-3">
                <h4 className="font-bold">Q{pq.questionIndex + 1}. {pq.questionText}</h4>
                {pq.firstBy ? (
                  <Badge className={cn("shrink-0 border-0", pq.firstBy === myName ? "bg-success text-white" : "bg-orange-500 text-white")}>
                    <Zap size={11} className="mr-1" /> {pq.firstBy === myName ? "You" : pq.firstBy} first
                  </Badge>
                ) : (
                  <Badge variant="outline" className="shrink-0">No correct answers</Badge>
                )}
              </div>
              <div className="flex gap-6 text-sm">
                {pq.results.map((r) => (
                  <div key={r.name} className="flex items-center gap-1.5">
                    {r.correct
                      ? <CheckCircle2 size={16} className="text-success" />
                      : <XCircle size={16} className="text-destructive" />}
                    <span className={cn("font-medium", r.name === myName && "font-bold")}>
                      {r.name === myName ? "You" : r.name}
                    </span>
                    {!r.answered && <span className="text-xs text-muted-foreground">(no answer)</span>}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="flex justify-center gap-4">
        <Button size="lg" className="rounded-xl px-8" onClick={onDone}>
          <Swords className="mr-2 h-5 w-5" /> Race Again
        </Button>
        <Button size="lg" variant="outline" className="rounded-xl px-8" onClick={() => setLocation("/leaderboard")}>
          View Leaderboard
        </Button>
      </div>
    </div>
  );
}
