import { useState, lazy, Suspense, useEffect, useRef } from "react";
import { useLocation } from "wouter";

const MonacoEditor = lazy(() => import("@monaco-editor/react"));

// ── Types ─────────────────────────────────────────────────────────────────────

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

// ── Data ──────────────────────────────────────────────────────────────────────

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

const TEMPLATE_JSON = JSON.stringify(
  {
    title: "My Interview Challenge",
    description: "Demonstrate your practical coding skills.",
    tasks: [
      { type: "sql", prompt: "Write an SQL query to…" },
      { type: "python", prompt: "Write a Python function that…" },
      { type: "architecture", prompt: "Describe the architecture of…" },
    ],
    instructions: "Complete each task to the best of your ability.",
  },
  null,
  2
);

const VALID_TYPES = new Set(["sql", "python", "javascript", "architecture"]);

// ── URL helpers ───────────────────────────────────────────────────────────────

function encodeChallenge(c: Challenge): string {
  return encodeURIComponent(btoa(unescape(encodeURIComponent(JSON.stringify(c)))));
}

function decodeChallenge(param: string): Challenge | null {
  try {
    const json = decodeURIComponent(escape(atob(decodeURIComponent(param))));
    const obj = JSON.parse(json) as Challenge;
    if (!obj.title || !Array.isArray(obj.tasks)) return null;
    obj.tasks = obj.tasks.filter((t) => t.prompt && VALID_TYPES.has(t.type));
    return obj.tasks.length > 0 ? obj : null;
  } catch {
    return null;
  }
}

function readChallengeFromURL(): Challenge | null {
  const params = new URLSearchParams(window.location.search);
  const raw = params.get("challenge");
  return raw ? decodeChallenge(raw) : null;
}

function buildShareURL(c: Challenge): string {
  const base = `${window.location.origin}${window.location.pathname}`;
  return `${base}?challenge=${encodeChallenge(c)}`;
}

// ── Display helpers ───────────────────────────────────────────────────────────

const TYPE_META: Record<
  ChallengeTask["type"],
  { label: string; lang: string; color: string; icon: string }
> = {
  sql:          { label: "SQL",          lang: "sql",        color: "#5be7d8", icon: "🗄️" },
  python:       { label: "Python",       lang: "python",     color: "#8f7bf0", icon: "🐍" },
  javascript:   { label: "JavaScript",   lang: "javascript", color: "#facc15", icon: "⚡" },
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
  task, idx, value, onChange, done,
}: {
  task: ChallengeTask; idx: number; value: string;
  onChange: (v: string) => void; done: boolean;
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
      <div
        style={{
          display: "flex", alignItems: "flex-start", justifyContent: "space-between",
          gap: 16, padding: "20px 24px 16px", borderBottom: "1px solid var(--cin-border)",
        }}
      >
        <div style={{ flex: 1 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
            <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 12, color: "var(--cin-dim)" }}>
              Task {idx + 1}
            </span>
            <TaskBadge type={task.type} />
            {done && <span style={{ fontSize: 12, color: "#22c55e" }}>✓ answered</span>}
          </div>
          <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 15, lineHeight: 1.65, color: "var(--cin-text)", margin: 0 }}>
            {task.prompt}
          </p>
        </div>
      </div>

      {task.type === "architecture" ? (
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={PLACEHOLDER[task.type]}
          rows={10}
          style={{
            display: "block", width: "100%", background: "#0d0f18",
            color: "var(--cin-text)", fontFamily: "'JetBrains Mono', monospace",
            fontSize: 13, lineHeight: 1.7, border: "none", outline: "none",
            resize: "vertical", padding: "18px 24px", boxSizing: "border-box", minHeight: 200,
          }}
        />
      ) : (
        <div style={{ height: 240, background: "#0d0f18" }}>
          <Suspense
            fallback={
              <div style={{ height: "100%", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--cin-dim)", fontFamily: "'JetBrains Mono', monospace", fontSize: 12 }}>
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
                minimap: { enabled: false }, fontSize: 13, lineHeight: 22,
                fontFamily: "'JetBrains Mono', monospace", scrollBeyondLastLine: false,
                padding: { top: 16, bottom: 16 }, overviewRulerBorder: false,
                renderLineHighlight: "gutter", wordWrap: "on",
              }}
            />
          </Suspense>
        </div>
      )}
    </div>
  );
}

// ── Create-challenge modal ────────────────────────────────────────────────────

function CreateChallengeModal({
  onClose,
  onLoad,
}: {
  onClose: () => void;
  onLoad: (c: Challenge, url: string) => void;
}) {
  const [json, setJson] = useState(TEMPLATE_JSON);
  const [error, setError] = useState("");
  const [shareUrl, setShareUrl] = useState("");
  const [copied, setCopied] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  function handleGenerate() {
    setError("");
    try {
      const obj = JSON.parse(json) as Challenge;
      if (!obj.title || !obj.description || !Array.isArray(obj.tasks)) {
        setError("JSON must have title, description, and a tasks array.");
        return;
      }
      const invalidTask = obj.tasks.find((t) => !t.prompt || !VALID_TYPES.has(t.type));
      if (invalidTask) {
        setError(`Invalid task type "${(invalidTask as any).type}". Use: sql, python, javascript, or architecture.`);
        return;
      }
      if (obj.tasks.length === 0) {
        setError("Add at least one task.");
        return;
      }
      const url = buildShareURL(obj);
      setShareUrl(url);
      onLoad(obj, url);
    } catch {
      setError("Invalid JSON — check for missing commas, brackets, or quotes.");
    }
  }

  function handleCopy() {
    if (!shareUrl) return;
    navigator.clipboard.writeText(shareUrl).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)",
          backdropFilter: "blur(4px)", zIndex: 100,
        }}
      />

      {/* Modal */}
      <div
        style={{
          position: "fixed", top: "50%", left: "50%",
          transform: "translate(-50%, -50%)",
          zIndex: 101, width: "min(680px, 92vw)",
          background: "#0d1018",
          border: "1px solid var(--cin-border-strong)",
          borderRadius: 20, padding: "32px 32px 28px",
          boxShadow: "0 32px 80px rgba(0,0,0,0.6)",
          maxHeight: "90vh", overflowY: "auto",
        }}
      >
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 6 }}>
          <div>
            <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, fontWeight: 700, color: "var(--cin-cyan)", letterSpacing: "0.1em", textTransform: "uppercase" }}>
              ● Interviewer Tool
            </span>
            <h2 style={{ fontFamily: "'Inter', sans-serif", fontSize: 22, fontWeight: 700, color: "var(--cin-text)", margin: "8px 0 4px", letterSpacing: "-0.015em" }}>
              Create a custom challenge
            </h2>
            <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 13, color: "var(--cin-dim)", margin: 0 }}>
              Paste your challenge JSON below to generate a shareable link.
            </p>
          </div>
          <button
            onClick={onClose}
            style={{ background: "none", border: "none", color: "var(--cin-dim)", fontSize: 20, cursor: "pointer", padding: "2px 6px", lineHeight: 1, flexShrink: 0 }}
          >
            ×
          </button>
        </div>

        {/* JSON schema hint */}
        <div style={{ margin: "18px 0 10px", background: "rgba(91,231,216,0.05)", border: "1px solid rgba(91,231,216,0.15)", borderRadius: 8, padding: "10px 14px" }}>
          <p style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: "var(--cin-dim)", margin: "0 0 4px", letterSpacing: "0.04em" }}>
            SUPPORTED TASK TYPES
          </p>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {(["sql", "python", "javascript", "architecture"] as const).map((t) => (
              <span key={t} style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: TYPE_META[t].color, background: `${TYPE_META[t].color}15`, border: `1px solid ${TYPE_META[t].color}30`, borderRadius: 5, padding: "2px 8px" }}>
                {t}
              </span>
            ))}
          </div>
        </div>

        {/* JSON textarea */}
        <textarea
          ref={inputRef}
          value={json}
          onChange={(e) => { setJson(e.target.value); setError(""); setShareUrl(""); }}
          rows={14}
          spellCheck={false}
          style={{
            display: "block", width: "100%", boxSizing: "border-box",
            background: "#080b12", color: "var(--cin-text)",
            fontFamily: "'JetBrains Mono', monospace", fontSize: 12.5, lineHeight: 1.65,
            border: `1px solid ${error ? "rgba(248,113,113,0.5)" : "var(--cin-border)"}`,
            borderRadius: 10, padding: "14px 16px", resize: "vertical",
            outline: "none", marginBottom: 10,
          }}
        />

        {error && (
          <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 13, color: "#f87171", marginBottom: 12 }}>
            ⚠ {error}
          </p>
        )}

        {/* Share link result */}
        {shareUrl && (
          <div style={{ background: "rgba(34,197,94,0.07)", border: "1px solid rgba(34,197,94,0.25)", borderRadius: 10, padding: "12px 16px", marginBottom: 14 }}>
            <p style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: "#22c55e", marginBottom: 8, letterSpacing: "0.06em" }}>
              ✓ LINK READY — SEND THIS TO YOUR CANDIDATE
            </p>
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <input
                readOnly
                value={shareUrl}
                onClick={(e) => (e.target as HTMLInputElement).select()}
                style={{
                  flex: 1, background: "#0a0d14", color: "var(--cin-dim)",
                  fontFamily: "'JetBrains Mono', monospace", fontSize: 11,
                  border: "1px solid var(--cin-border)", borderRadius: 7,
                  padding: "8px 12px", outline: "none",
                  overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                }}
              />
              <button
                onClick={handleCopy}
                style={{
                  fontFamily: "'JetBrains Mono', monospace", fontSize: 12, fontWeight: 700,
                  color: copied ? "#22c55e" : "var(--cin-bg)",
                  background: copied ? "rgba(34,197,94,0.15)" : "#22c55e",
                  border: copied ? "1px solid #22c55e" : "none",
                  padding: "8px 18px", borderRadius: 7, cursor: "pointer",
                  whiteSpace: "nowrap", transition: "all 0.2s",
                }}
              >
                {copied ? "✓ Copied!" : "Copy link"}
              </button>
            </div>
          </div>
        )}

        {/* Actions */}
        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
          <button
            onClick={onClose}
            style={{
              fontFamily: "'JetBrains Mono', monospace", fontSize: 13,
              color: "var(--cin-dim)", background: "none",
              border: "1px solid var(--cin-border)", padding: "10px 22px",
              borderRadius: 10, cursor: "pointer",
            }}
          >
            Close
          </button>
          <button
            onClick={handleGenerate}
            style={{
              fontFamily: "'JetBrains Mono', monospace", fontSize: 13, fontWeight: 700,
              color: "var(--cin-bg)",
              background: "linear-gradient(90deg, var(--cin-cyan), var(--cin-violet))",
              border: "none", padding: "10px 28px", borderRadius: 10, cursor: "pointer",
            }}
          >
            Generate link →
          </button>
        </div>
      </div>
    </>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function CodingChallenge() {
  const [, setLocation] = useLocation();

  // Load from URL on mount, fall back to default
  const [challenge, setChallenge] = useState<Challenge>(() => readChallengeFromURL() ?? DEFAULT_CHALLENGE);
  const [isCustom, setIsCustom] = useState(() => readChallengeFromURL() !== null);
  const [answers, setAnswers] = useState<string[]>(() =>
    (readChallengeFromURL() ?? DEFAULT_CHALLENGE).tasks.map((t) => PLACEHOLDER[t.type])
  );
  const [submitted, setSubmitted] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [shareUrl, setShareUrl] = useState("");
  const [linkCopied, setLinkCopied] = useState(false);

  useEffect(() => {
    document.title = `${challenge.title} — TechInterviewPrep`;
  }, [challenge.title]);

  // Sync URL when challenge changes (without full navigation)
  function loadChallenge(c: Challenge, url: string) {
    setChallenge(c);
    setIsCustom(true);
    setAnswers(c.tasks.map((t) => PLACEHOLDER[t.type]));
    setSubmitted(false);
    setShareUrl(url);
    window.history.replaceState(null, "", url);
  }

  function copyShareLink() {
    if (!shareUrl) return;
    navigator.clipboard.writeText(shareUrl).then(() => {
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 2000);
    });
  }

  const completedCount = answers.filter((a, i) => {
    const ph = PLACEHOLDER[challenge.tasks[i].type];
    return a.trim() !== "" && a.trim() !== ph.trim();
  }).length;

  const allDone = completedCount === challenge.tasks.length;

  function handleAnswer(idx: number, val: string) {
    setAnswers((prev) => { const n = [...prev]; n[idx] = val; return n; });
  }

  // ── Submitted state ───────────────────────────────────────────────────────

  if (submitted) {
    return (
      <div style={{ minHeight: "calc(100vh - 75px)", display: "flex", alignItems: "center", justifyContent: "center", padding: "40px 24px" }}>
        <div style={{ textAlign: "center", maxWidth: 520 }}>
          <div style={{ width: 72, height: 72, borderRadius: "50%", background: "rgba(34,197,94,0.12)", border: "2px solid rgba(34,197,94,0.4)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 32, margin: "0 auto 24px" }}>
            ✓
          </div>
          <h2 style={{ fontFamily: "'Inter', sans-serif", fontSize: 28, fontWeight: 700, color: "var(--cin-text)", marginBottom: 12 }}>
            Challenge submitted!
          </h2>
          <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 15, color: "var(--cin-dim)", lineHeight: 1.6, marginBottom: 32 }}>
            You answered {completedCount} of {challenge.tasks.length} tasks. Great work!
          </p>
          <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
            <button
              onClick={() => { setSubmitted(false); setAnswers(challenge.tasks.map((t) => PLACEHOLDER[t.type])); }}
              style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 13, color: "var(--cin-cyan)", background: "none", border: "1px solid var(--cin-cyan)", padding: "10px 24px", borderRadius: 10, cursor: "pointer" }}
            >
              Try again
            </button>
            <button
              onClick={() => setLocation("/")}
              style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 13, color: "var(--cin-bg)", background: "var(--cin-cyan)", border: "none", padding: "10px 24px", borderRadius: 10, cursor: "pointer", fontWeight: 700 }}
            >
              Browse courses →
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Main layout ───────────────────────────────────────────────────────────

  return (
    <>
      {showModal && (
        <CreateChallengeModal
          onClose={() => setShowModal(false)}
          onLoad={(c, url) => loadChallenge(c, url)}
        />
      )}

      <div style={{ maxWidth: 860, margin: "0 auto", padding: "56px 24px 80px" }}>

        {/* ── Header ── */}
        <div style={{ marginBottom: 48 }}>

          {/* Top row: badge + action buttons */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12, marginBottom: 16 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, fontWeight: 700, letterSpacing: "0.1em", color: "var(--cin-cyan)", textTransform: "uppercase" }}>
                ● Code Lab
              </span>
              {isCustom && (
                <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, fontWeight: 700, color: "#8f7bf0", background: "rgba(143,123,240,0.12)", border: "1px solid rgba(143,123,240,0.3)", borderRadius: 6, padding: "2px 10px", letterSpacing: "0.06em", textTransform: "uppercase" }}>
                  Custom challenge
                </span>
              )}
            </div>

            <div style={{ display: "flex", gap: 8 }}>
              {/* Copy link (only if custom challenge is loaded) */}
              {isCustom && shareUrl && (
                <button
                  onClick={copyShareLink}
                  style={{
                    fontFamily: "'JetBrains Mono', monospace", fontSize: 12, fontWeight: 600,
                    color: linkCopied ? "#22c55e" : "var(--cin-cyan)",
                    background: "none",
                    border: `1px solid ${linkCopied ? "#22c55e" : "var(--cin-cyan)"}`,
                    padding: "8px 16px", borderRadius: 8, cursor: "pointer",
                    display: "flex", alignItems: "center", gap: 6, transition: "all 0.2s",
                  }}
                >
                  {linkCopied ? "✓ Copied!" : "🔗 Copy link"}
                </button>
              )}

              {/* Create / change challenge button */}
              <button
                onClick={() => setShowModal(true)}
                style={{
                  fontFamily: "'JetBrains Mono', monospace", fontSize: 12, fontWeight: 700,
                  color: "var(--cin-bg)",
                  background: "linear-gradient(90deg, var(--cin-cyan), var(--cin-violet))",
                  border: "none", padding: "8px 18px", borderRadius: 8, cursor: "pointer",
                  display: "flex", alignItems: "center", gap: 6,
                }}
              >
                {isCustom ? "✏️ Edit challenge" : "✏️ Create challenge"}
              </button>
            </div>
          </div>

          <h1 style={{ fontFamily: "'Inter', sans-serif", fontSize: 36, fontWeight: 800, color: "var(--cin-text)", letterSpacing: "-0.02em", marginBottom: 14, lineHeight: 1.15 }}>
            {challenge.title}
          </h1>
          <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 16, color: "var(--cin-dim)", lineHeight: 1.65, maxWidth: 640, marginBottom: 20 }}>
            {challenge.description}
          </p>

          {/* Progress bar */}
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <div style={{ flex: 1, maxWidth: 260, height: 4, background: "var(--cin-border)", borderRadius: 4, overflow: "hidden" }}>
              <div style={{ height: "100%", width: `${(completedCount / challenge.tasks.length) * 100}%`, background: "linear-gradient(90deg, var(--cin-cyan), var(--cin-violet))", transition: "width 0.4s ease", borderRadius: 4 }} />
            </div>
            <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 12, color: "var(--cin-dim)" }}>
              {completedCount} / {challenge.tasks.length} answered
            </span>
          </div>

          {challenge.instructions && (
            <div style={{ marginTop: 20, background: "rgba(91,231,216,0.06)", border: "1px solid rgba(91,231,216,0.2)", borderRadius: 10, padding: "12px 18px", fontFamily: "'Inter', sans-serif", fontSize: 13, color: "var(--cin-dim)", lineHeight: 1.6 }}>
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
                key={`${challenge.title}-${i}`}
                task={task} idx={i} value={answers[i]}
                onChange={(v) => handleAnswer(i, v)} done={done}
              />
            );
          })}
        </div>

        {/* ── Submit ── */}
        <div style={{ marginTop: 40, display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 16, paddingTop: 32, borderTop: "1px solid var(--cin-border)" }}>
          {!allDone && (
            <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 12, color: "var(--cin-dim)" }}>
              {challenge.tasks.length - completedCount} task{challenge.tasks.length - completedCount !== 1 ? "s" : ""} remaining
            </span>
          )}
          <button
            onClick={() => setSubmitted(true)}
            disabled={completedCount === 0}
            style={{
              fontFamily: "'JetBrains Mono', monospace", fontSize: 14, fontWeight: 700,
              color: completedCount === 0 ? "var(--cin-dim)" : "var(--cin-bg)",
              background: completedCount === 0 ? "var(--cin-surface)" : "linear-gradient(90deg, var(--cin-cyan), var(--cin-violet))",
              border: completedCount === 0 ? "1px solid var(--cin-border)" : "none",
              padding: "12px 32px", borderRadius: 12, cursor: completedCount === 0 ? "not-allowed" : "pointer",
              transition: "all 0.2s", letterSpacing: "0.02em",
            }}
          >
            {allDone ? "Submit challenge →" : "Submit partial answers →"}
          </button>
        </div>

      </div>
    </>
  );
}
