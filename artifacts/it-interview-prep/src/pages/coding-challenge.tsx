import { useState, lazy, Suspense, useEffect } from "react";
import { useLocation } from "wouter";

const MonacoEditor = lazy(() => import("@monaco-editor/react"));

// ── Challenge data ────────────────────────────────────────────────────────────

export interface ChallengeTask {
  type: "sql" | "python" | "javascript" | "architecture";
  prompt: string;
}

export interface Challenge {
  title: string;
  description: string;
  tasks: ChallengeTask[];
  instructions?: string;
}

const DEFAULT_CHALLENGE: Challenge = {
  title: "Technical Interview Challenge",
  description:
    "In this round, you will be asked to demonstrate practical coding and problem-solving skills.",
  tasks: [
    {
      type: "sql",
      prompt:
        "Write an SQL query to find the top 5 customers who placed the highest number of orders in the last year.",
    },
    {
      type: "python",
      prompt:
        "Write a Python function that takes a list of integers and returns the list sorted in descending order without using built-in sort functions.",
    },
    {
      type: "architecture",
      prompt:
        "Draw and explain the architecture of a web application that supports user authentication, a database for storing user data, and an API layer for communication. Highlight the flow of data between components.",
    },
  ],
  instructions:
    "Please complete each task. For the architecture question, you may either upload a diagram or describe it clearly in text.",
};

// ── Helpers ───────────────────────────────────────────────────────────────────

const TYPE_META: Record<ChallengeTask["type"], { label: string; lang: string; color: string; icon: string }> = {
  sql:          { label: "SQL",          lang: "sql",        color: "#5be7d8", icon: "🗄️" },
  python:       { label: "Python",       lang: "python",     color: "#8f7bf0", icon: "🐍" },
  javascript:   { label: "JavaScript",  lang: "javascript", color: "#facc15", icon: "⚡" },
  architecture: { label: "Architecture", lang: "",           color: "#f472b6", icon: "🏗️" },
};

const PLACEHOLDER: Record<ChallengeTask["type"], string> = {
  sql:          "-- Write your SQL query here\nSELECT ...\n",
  python:       "# Write your Python solution here\ndef solution():\n    pass\n",
  javascript:   "// Write your JavaScript solution here\nfunction solution() {\n\n}\n",
  architecture: "Describe your architecture here...\n\nComponents:\n- \n\nData flow:\n- ",
};

// ── Sub-components ────────────────────────────────────────────────────────────

function TaskBadge({ type }: { type: ChallengeTask["type"] }) {
  const m = TYPE_META[type];
  return (
    <span
      style={{
        fontFamily: "'JetBrains Mono', monospace",
        fontSize: 11,
        fontWeight: 700,
        color: m.color,
        background: `${m.color}18`,
        border: `1px solid ${m.color}40`,
        borderRadius: 6,
        padding: "3px 10px",
        letterSpacing: "0.06em",
        textTransform: "uppercase",
      }}
    >
      {m.icon} {m.label}
    </span>
  );
}

function CodeTaskEditor({
  task,
  idx,
  value,
  onChange,
  done,
}: {
  task: ChallengeTask;
  idx: number;
  value: string;
  onChange: (v: string) => void;
  done: boolean;
}) {
  const m = TYPE_META[task.type];
  return (
    <div
      style={{
        background: "var(--cin-surface)",
        border: `1px solid ${done ? m.color + "60" : "var(--cin-border)"}`,
        borderRadius: 16,
        overflow: "hidden",
        transition: "border-color 0.3s",
      }}
    >
      {/* Card header */}
      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          gap: 16,
          padding: "20px 24px 16px",
          borderBottom: "1px solid var(--cin-border)",
        }}
      >
        <div style={{ flex: 1 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
            <span
              style={{
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: 12,
                color: "var(--cin-dim)",
              }}
            >
              Task {idx + 1}
            </span>
            <TaskBadge type={task.type} />
            {done && (
              <span style={{ fontSize: 12, color: "#22c55e" }}>✓ answered</span>
            )}
          </div>
          <p
            style={{
              fontFamily: "'Inter', sans-serif",
              fontSize: 15,
              lineHeight: 1.65,
              color: "var(--cin-text)",
              margin: 0,
            }}
          >
            {task.prompt}
          </p>
        </div>
      </div>

      {/* Editor */}
      {task.type === "architecture" ? (
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={PLACEHOLDER[task.type]}
          rows={10}
          style={{
            display: "block",
            width: "100%",
            background: "#0d0f18",
            color: "var(--cin-text)",
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: 13,
            lineHeight: 1.7,
            border: "none",
            outline: "none",
            resize: "vertical",
            padding: "18px 24px",
            boxSizing: "border-box",
            minHeight: 200,
          }}
        />
      ) : (
        <div style={{ height: 240, background: "#0d0f18" }}>
          <Suspense
            fallback={
              <div
                style={{
                  height: "100%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "var(--cin-dim)",
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: 12,
                }}
              >
                Loading editor…
              </div>
            }
          >
            <MonacoEditor
              height="240px"
              language={m.lang}
              value={value}
              onChange={(v) => onChange(v ?? "")}
              theme="vs-dark"
              options={{
                minimap: { enabled: false },
                fontSize: 13,
                lineHeight: 22,
                fontFamily: "'JetBrains Mono', monospace",
                scrollBeyondLastLine: false,
                padding: { top: 16, bottom: 16 },
                overviewRulerBorder: false,
                renderLineHighlight: "gutter",
                wordWrap: "on",
              }}
            />
          </Suspense>
        </div>
      )}
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function CodingChallenge() {
  const [, setLocation] = useLocation();
  const challenge = DEFAULT_CHALLENGE;
  const [answers, setAnswers] = useState<string[]>(() =>
    challenge.tasks.map((t) => PLACEHOLDER[t.type])
  );
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    document.title = "Code Lab — TechInterviewPrep";
  }, []);

  const completedCount = answers.filter((a, i) => {
    const ph = PLACEHOLDER[challenge.tasks[i].type];
    return a.trim() !== "" && a.trim() !== ph.trim();
  }).length;

  const allDone = completedCount === challenge.tasks.length;

  function handleAnswer(idx: number, val: string) {
    setAnswers((prev) => {
      const next = [...prev];
      next[idx] = val;
      return next;
    });
  }

  if (submitted) {
    return (
      <div
        style={{
          minHeight: "calc(100vh - 75px)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "40px 24px",
        }}
      >
        <div style={{ textAlign: "center", maxWidth: 520 }}>
          <div
            style={{
              width: 72,
              height: 72,
              borderRadius: "50%",
              background: "rgba(34,197,94,0.12)",
              border: "2px solid rgba(34,197,94,0.4)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 32,
              margin: "0 auto 24px",
            }}
          >
            ✓
          </div>
          <h2
            style={{
              fontFamily: "'Inter', sans-serif",
              fontSize: 28,
              fontWeight: 700,
              color: "var(--cin-text)",
              marginBottom: 12,
            }}
          >
            Challenge submitted!
          </h2>
          <p
            style={{
              fontFamily: "'Inter', sans-serif",
              fontSize: 15,
              color: "var(--cin-dim)",
              lineHeight: 1.6,
              marginBottom: 32,
            }}
          >
            You answered {completedCount} of {challenge.tasks.length} tasks. Great work!
          </p>
          <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
            <button
              onClick={() => { setSubmitted(false); setAnswers(challenge.tasks.map((t) => PLACEHOLDER[t.type])); }}
              style={{
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: 13,
                color: "var(--cin-cyan)",
                background: "none",
                border: "1px solid var(--cin-cyan)",
                padding: "10px 24px",
                borderRadius: 10,
                cursor: "pointer",
              }}
            >
              Try again
            </button>
            <button
              onClick={() => setLocation("/")}
              style={{
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: 13,
                color: "var(--cin-bg)",
                background: "var(--cin-cyan)",
                border: "none",
                padding: "10px 24px",
                borderRadius: 10,
                cursor: "pointer",
                fontWeight: 700,
              }}
            >
              Browse courses →
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 860, margin: "0 auto", padding: "56px 24px 80px" }}>

      {/* ── Header ── */}
      <div style={{ marginBottom: 48 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
          <span
            style={{
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: "0.1em",
              color: "var(--cin-cyan)",
              textTransform: "uppercase",
            }}
          >
            ● Code Lab
          </span>
        </div>
        <h1
          style={{
            fontFamily: "'Inter', sans-serif",
            fontSize: 36,
            fontWeight: 800,
            color: "var(--cin-text)",
            letterSpacing: "-0.02em",
            marginBottom: 14,
            lineHeight: 1.15,
          }}
        >
          {challenge.title}
        </h1>
        <p
          style={{
            fontFamily: "'Inter', sans-serif",
            fontSize: 16,
            color: "var(--cin-dim)",
            lineHeight: 1.65,
            maxWidth: 640,
            marginBottom: 20,
          }}
        >
          {challenge.description}
        </p>

        {/* Progress bar */}
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div
            style={{
              flex: 1,
              maxWidth: 260,
              height: 4,
              background: "var(--cin-border)",
              borderRadius: 4,
              overflow: "hidden",
            }}
          >
            <div
              style={{
                height: "100%",
                width: `${(completedCount / challenge.tasks.length) * 100}%`,
                background: "linear-gradient(90deg, var(--cin-cyan), var(--cin-violet))",
                transition: "width 0.4s ease",
                borderRadius: 4,
              }}
            />
          </div>
          <span
            style={{
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: 12,
              color: "var(--cin-dim)",
            }}
          >
            {completedCount} / {challenge.tasks.length} answered
          </span>
        </div>

        {challenge.instructions && (
          <div
            style={{
              marginTop: 20,
              background: "rgba(91,231,216,0.06)",
              border: "1px solid rgba(91,231,216,0.2)",
              borderRadius: 10,
              padding: "12px 18px",
              fontFamily: "'Inter', sans-serif",
              fontSize: 13,
              color: "var(--cin-dim)",
              lineHeight: 1.6,
            }}
          >
            <span style={{ color: "var(--cin-cyan)", fontWeight: 600 }}>Instructions: </span>
            {challenge.instructions}
          </div>
        )}
      </div>

      {/* ── Task cards ── */}
      <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
        {challenge.tasks.map((task, i) => {
          const ph = PLACEHOLDER[task.type];
          const done = answers[i].trim() !== "" && answers[i].trim() !== ph.trim();
          return (
            <CodeTaskEditor
              key={i}
              task={task}
              idx={i}
              value={answers[i]}
              onChange={(v) => handleAnswer(i, v)}
              done={done}
            />
          );
        })}
      </div>

      {/* ── Submit ── */}
      <div
        style={{
          marginTop: 40,
          display: "flex",
          alignItems: "center",
          justifyContent: "flex-end",
          gap: 16,
          paddingTop: 32,
          borderTop: "1px solid var(--cin-border)",
        }}
      >
        {!allDone && (
          <span
            style={{
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: 12,
              color: "var(--cin-dim)",
            }}
          >
            {challenge.tasks.length - completedCount} task{challenge.tasks.length - completedCount !== 1 ? "s" : ""} remaining
          </span>
        )}
        <button
          onClick={() => setSubmitted(true)}
          disabled={completedCount === 0}
          style={{
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: 14,
            fontWeight: 700,
            color: completedCount === 0 ? "var(--cin-dim)" : "var(--cin-bg)",
            background: completedCount === 0
              ? "var(--cin-surface)"
              : "linear-gradient(90deg, var(--cin-cyan), var(--cin-violet))",
            border: completedCount === 0 ? "1px solid var(--cin-border)" : "none",
            padding: "12px 32px",
            borderRadius: 12,
            cursor: completedCount === 0 ? "not-allowed" : "pointer",
            transition: "all 0.2s",
            letterSpacing: "0.02em",
          }}
        >
          {allDone ? "Submit challenge →" : "Submit partial answers →"}
        </button>
      </div>
    </div>
  );
}
