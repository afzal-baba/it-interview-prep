import { useEffect, useState } from "react";
import { Link } from "wouter";
import { Check, ChevronLeft, LockKeyhole, RefreshCw, X } from "lucide-react";

type AdminQuestion = {
  id: number;
  questionText: string;
  courseId: number;
  companyName: string | null;
  roundStage: string | null;
  difficulty: string | null;
  status: string;
  createdAt: string;
};

const base = () => import.meta.env.BASE_URL.replace(/\/$/, "");
const inputStyle: React.CSSProperties = {
  width: "100%",
  boxSizing: "border-box",
  padding: "12px 13px",
  borderRadius: 10,
  border: "1px solid var(--cin-border)",
  background: "rgba(7,12,30,0.8)",
  color: "var(--cin-text)",
  font: "13px 'JetBrains Mono', monospace",
};
const buttonStyle: React.CSSProperties = {
  border: 0,
  borderRadius: 9,
  padding: "10px 14px",
  font: "700 12px 'Inter', sans-serif",
  cursor: "pointer",
};

export default function AdminCommunity() {
  const [secret, setSecret] = useState("");
  const [questions, setQuestions] = useState<AdminQuestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    const saved = window.sessionStorage.getItem("community-admin-key");
    if (saved) {
      setSecret(saved);
      void loadQuestions(saved);
    }
  }, []);

  async function loadQuestions(key = secret) {
    if (!key.trim()) {
      setError("Enter your admin access key to load submissions.");
      return;
    }
    setLoading(true);
    setError("");
    setMessage("");
    try {
      const response = await fetch(`${base()}/api/admin/community/questions?status=pending`, {
        cache: "no-store",
        headers: { "Cache-Control": "no-cache", "x-admin-secret": key.trim() },
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || "Unable to load submissions.");
      window.sessionStorage.setItem("community-admin-key", key.trim());
      setQuestions(body);
    } catch (reason) {
      setQuestions([]);
      setError(reason instanceof Error ? reason.message : "Unable to load submissions.");
    } finally {
      setLoading(false);
    }
  }

  async function updateStatus(id: number, status: "published" | "rejected") {
    setLoading(true);
    setError("");
    setMessage("");
    try {
      const response = await fetch(`${base()}/api/admin/community/questions/${id}/status`, {
        method: "POST",
        cache: "no-store",
        headers: { "Cache-Control": "no-cache", "Content-Type": "application/json", "x-admin-secret": secret.trim() },
        body: JSON.stringify({ status }),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || "Unable to update this question.");
      setQuestions((current) => current.filter((question) => question.id !== id));
      setMessage(status === "published" ? "Question approved and published." : "Question rejected.");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Unable to update this question.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ width: "min(1060px, calc(100% - 40px))", margin: "0 auto", padding: "64px 0 90px" }}>
      <Link href="/community" style={{ display: "inline-flex", alignItems: "center", gap: 5, color: "var(--cin-dim)", textDecoration: "none", fontSize: 12, marginBottom: 24 }}>
        <ChevronLeft size={15} /> Back to Community
      </Link>
      <header style={{ marginBottom: 28 }}>
        <div style={{ color: "var(--cin-cyan)", font: "12px 'JetBrains Mono', monospace", letterSpacing: 1.4, marginBottom: 12 }}>ADMIN / MODERATION</div>
        <h1 style={{ margin: 0, color: "var(--cin-text)", fontSize: "clamp(30px, 5vw, 48px)", letterSpacing: -1.5 }}>Community review queue</h1>
        <p style={{ color: "var(--cin-dim)", maxWidth: 650, lineHeight: 1.6, margin: "12px 0 0" }}>Review questions submitted by the community. Approving a question makes it visible in the public feed.</p>
      </header>

      <form onSubmit={(event) => { event.preventDefault(); void loadQuestions(); }} style={{ padding: 20, border: "1px solid var(--cin-border-strong)", borderRadius: 16, background: "rgba(15,21,48,0.72)", marginBottom: 22 }}>
        <label style={{ display: "grid", gap: 8, color: "var(--cin-dim)", fontSize: 12 }}>
          <span style={{ display: "flex", alignItems: "center", gap: 7 }}><LockKeyhole size={14} color="var(--cin-cyan)" /> Admin access key</span>
          <input type="password" value={secret} onChange={(event) => setSecret(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") void loadQuestions(); }} placeholder="Enter your SESSION_SECRET" style={inputStyle} autoComplete="off" />
        </label>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap", marginTop: 12 }}>
          <span style={{ color: "var(--cin-faint)", fontSize: 11 }}>Stored only in this browser session. Never share it publicly.</span>
          <button type="submit" disabled={loading} style={{ ...buttonStyle, background: "linear-gradient(135deg, var(--cin-cyan), #5b9ee7)", color: "#07101f", opacity: loading ? .65 : 1 }}>{loading ? "Loading…" : "Load pending questions"}</button>
        </div>
      </form>

      {error && <div role="alert" style={{ marginBottom: 18, padding: "12px 14px", borderRadius: 10, border: "1px solid rgba(248,113,113,.3)", background: "rgba(248,113,113,.08)", color: "#fca5a5", fontSize: 12 }}>{error}</div>}
      {message && <div role="status" style={{ marginBottom: 18, padding: "12px 14px", borderRadius: 10, border: "1px solid rgba(91,227,216,.25)", background: "rgba(91,227,216,.08)", color: "var(--cin-cyan)", fontSize: 12 }}>{message}</div>}

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
        <h2 style={{ margin: 0, color: "var(--cin-text)", fontSize: 17 }}>Pending questions</h2>
        <button type="button" onClick={() => void loadQuestions()} disabled={loading || !secret} aria-label="Refresh pending questions" style={{ ...buttonStyle, padding: 8, color: "var(--cin-cyan)", background: "var(--cin-surface)" }}><RefreshCw size={15} /></button>
      </div>
      {questions.length === 0 ? <div style={{ padding: "54px 20px", border: "1px dashed var(--cin-border)", borderRadius: 16, textAlign: "center", color: "var(--cin-dim)", fontSize: 13 }}>{secret ? "No pending questions right now." : "Enter your admin access key to see the review queue."}</div> : <div style={{ display: "grid", gap: 14 }}>
        {questions.map((question) => <article key={question.id} style={{ padding: 20, border: "1px solid var(--cin-border)", borderRadius: 16, background: "rgba(15,21,48,0.72)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "flex-start" }}>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", color: "var(--cin-faint)", fontSize: 11 }}>
              <span style={{ color: "var(--cin-cyan)", fontWeight: 700 }}>Question #{question.id}</span>
              {question.roundStage && <span>{question.roundStage}</span>}
              {question.difficulty && <span style={{ textTransform: "capitalize" }}>{question.difficulty}</span>}
            </div>
            <time dateTime={question.createdAt} style={{ color: "var(--cin-faint)", fontSize: 10 }}>{new Date(question.createdAt).toLocaleDateString()}</time>
          </div>
          <h3 style={{ margin: "14px 0 10px", color: "var(--cin-text)", fontSize: 17, lineHeight: 1.5 }}>{question.questionText}</h3>
          <div style={{ color: "var(--cin-dim)", fontSize: 12 }}>{question.companyName ? `${question.companyName} · ` : ""}Course ID {question.courseId}</div>
          <div style={{ display: "flex", gap: 9, marginTop: 18, flexWrap: "wrap" }}>
            <button type="button" disabled={loading} onClick={() => void updateStatus(question.id, "published")} style={{ ...buttonStyle, background: "#4ade80", color: "#052e16", display: "inline-flex", alignItems: "center", gap: 6 }}><Check size={15} /> Approve & publish</button>
            <button type="button" disabled={loading} onClick={() => void updateStatus(question.id, "rejected")} style={{ ...buttonStyle, background: "rgba(248,113,113,.12)", color: "#fca5a5", border: "1px solid rgba(248,113,113,.25)", display: "inline-flex", alignItems: "center", gap: 6 }}><X size={15} /> Reject</button>
          </div>
        </article>)}
      </div>}
    </div>
  );
}