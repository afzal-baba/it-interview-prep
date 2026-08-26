import { FormEvent, useEffect, useMemo, useState } from "react";
import { Link } from "wouter";
import { ChevronDown, ChevronUp, Flag, Lightbulb, MessageCircle, ThumbsDown, ThumbsUp } from "lucide-react";
import { useGetCurrentAuthUser, useListCourses } from "@workspace/api-client-react";

type Question = {
  id: number;
  questionText: string;
  companyName: string | null;
  roundStage: string | null;
  difficulty: string | null;
  aiExplanation: { concept: string; approach: string; example_answer: string } | null;
  upvotes: number;
  downvotes: number;
  createdAt: string;
  courseId: number;
  courseName: string;
  courseSlug: string;
  contributor: string;
};

type MyQuestion = {
  id: number;
  questionText: string;
  status: string;
  createdAt: string;
  courseName: string;
};

const base = () => import.meta.env.BASE_URL.replace(/\/$/, "");
const fieldStyle: React.CSSProperties = { width: "100%", background: "rgba(7,12,30,0.8)", border: "1px solid var(--cin-border)", color: "var(--cin-text)", borderRadius: 10, padding: "11px 12px", fontFamily: "'Inter', sans-serif", fontSize: 13, boxSizing: "border-box" };
const buttonStyle: React.CSSProperties = { border: "1px solid var(--cin-border-strong)", borderRadius: 9, padding: "10px 14px", color: "var(--cin-text)", background: "var(--cin-surface)", fontFamily: "'Inter', sans-serif", fontWeight: 700, cursor: "pointer" };

function QuestionCard({ question, onRefresh }: { question: Question; onRefresh: () => void }) {
  const [expanded, setExpanded] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const vote = async (value: number) => {
    setBusy(true);
    try {
      const response = await fetch(`${base()}/api/community/questions/${question.id}/vote`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ value }) });
      if (!response.ok) throw new Error((await response.json()).error || "Please sign in to vote.");
      onRefresh();
    } catch (error) { setMessage(error instanceof Error ? error.message : "Unable to vote."); }
    finally { setBusy(false); }
  };
  const report = async () => {
    const reason = window.prompt("Report reason: inappropriate, duplicate, or incorrect", "incorrect");
    if (!reason || !["inappropriate", "duplicate", "incorrect"].includes(reason)) return;
    const response = await fetch(`${base()}/api/community/questions/${question.id}/report`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ reason }) });
    setMessage(response.ok ? "Thanks — this was sent to the review queue." : ((await response.json()).error || "Unable to report this question."));
  };
  return (
    <article style={{ background: "rgba(15,21,48,0.72)", border: "1px solid var(--cin-border)", borderRadius: 16, padding: "20px 22px", boxShadow: "0 16px 45px rgba(0,0,0,0.12)" }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 14, alignItems: "flex-start" }}>
        <div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 10 }}>
            <span style={{ color: "var(--cin-cyan)", fontSize: 11, fontFamily: "'JetBrains Mono', monospace", fontWeight: 700 }}>{question.courseName}</span>
            {question.difficulty && <span style={{ color: "var(--cin-faint)", fontSize: 11, textTransform: "capitalize" }}>{question.difficulty}</span>}
            {question.roundStage && <span style={{ color: "var(--cin-faint)", fontSize: 11 }}>{question.roundStage}</span>}
          </div>
          <h2 style={{ margin: 0, color: "var(--cin-text)", fontSize: 18, lineHeight: 1.45, fontWeight: 700 }}>{question.questionText}</h2>
        </div>
        <button onClick={() => setExpanded((open) => !open)} aria-label={expanded ? "Collapse explanation" : "Expand explanation"} style={{ ...buttonStyle, padding: 8, flexShrink: 0, color: "var(--cin-cyan)" }}>{expanded ? <ChevronUp size={17} /> : <ChevronDown size={17} />}</button>
      </div>
      {question.companyName && <div style={{ marginTop: 13, color: "#f0b35d", fontSize: 11 }}>User-submitted and unverified — not officially affiliated with or confirmed by {question.companyName}.</div>}
      {expanded && <div style={{ marginTop: 18, padding: 17, background: "rgba(91,227,216,0.055)", border: "1px solid rgba(91,227,216,0.16)", borderRadius: 12 }}>
        {question.aiExplanation ? <div style={{ display: "grid", gap: 15 }}>
          <div><b style={{ color: "var(--cin-cyan)", fontSize: 12 }}>What it tests</b><p style={{ margin: "5px 0 0", color: "var(--cin-text)", lineHeight: 1.6, fontSize: 13 }}>{question.aiExplanation.concept}</p></div>
          <div><b style={{ color: "var(--cin-cyan)", fontSize: 12 }}>A practical approach</b><p style={{ margin: "5px 0 0", color: "var(--cin-text)", lineHeight: 1.6, fontSize: 13 }}>{question.aiExplanation.approach}</p></div>
          <div><b style={{ color: "var(--cin-cyan)", fontSize: 12 }}>Example answer</b><p style={{ margin: "5px 0 0", color: "var(--cin-text)", lineHeight: 1.6, fontSize: 13 }}>{question.aiExplanation.example_answer}</p></div>
        </div> : <div style={{ color: "var(--cin-dim)", fontSize: 13 }}>The coaching explanation is still being prepared. Check back shortly.</div>}
      </div>}
      <div style={{ display: "flex", alignItems: "center", gap: 14, marginTop: 17, color: "var(--cin-faint)", fontSize: 11 }}>
        <span>Submitted by {question.contributor}</span>
        <span style={{ marginLeft: "auto", display: "flex", gap: 6 }}>
          <button disabled={busy} onClick={() => vote(1)} aria-label="Upvote" style={{ ...buttonStyle, padding: "5px 8px", color: "var(--cin-cyan)" }}><ThumbsUp size={13} /> {question.upvotes}</button>
          <button disabled={busy} onClick={() => vote(-1)} aria-label="Downvote" style={{ ...buttonStyle, padding: "5px 8px", color: "var(--cin-faint)" }}><ThumbsDown size={13} /> {question.downvotes}</button>
          <button onClick={report} aria-label="Report question" style={{ ...buttonStyle, padding: "6px 8px", color: "var(--cin-faint)" }}><Flag size={13} /></button>
        </span>
      </div>
      {message && <div style={{ marginTop: 10, color: "#f0b35d", fontSize: 12 }}>{message}</div>}
    </article>
  );
}

export default function Community() {
  const { data: courses } = useListCourses();
  const { data: auth } = useGetCurrentAuthUser();
  const [questions, setQuestions] = useState<Question[]>([]);
  const [myQuestions, setMyQuestions] = useState<MyQuestion[]>([]);
  const [courseId, setCourseId] = useState("");
  const [company, setCompany] = useState("");
  const [difficulty, setDifficulty] = useState("");
  const [sort, setSort] = useState("newest");
  const [showForm, setShowForm] = useState(false);
  const [text, setText] = useState("");
  const [formCourse, setFormCourse] = useState("");
  const [formCompany, setFormCompany] = useState("");
  const [stage, setStage] = useState("");
  const [formDifficulty, setFormDifficulty] = useState("");
  const [formState, setFormState] = useState("");
  const [loading, setLoading] = useState(true);

  const loadMyQuestions = async () => {
    if (!auth?.user) { setMyQuestions([]); return; }
    try {
      const response = await fetch(`${base()}/api/community/my-questions`);
      setMyQuestions(response.ok ? await response.json() : []);
    } catch { setMyQuestions([]); }
  };

  const load = async () => {
    setLoading(true);
    const params = new URLSearchParams({ sort });
    if (courseId) params.set("courseId", courseId);
    if (company.trim()) params.set("company", company.trim());
    if (difficulty) params.set("difficulty", difficulty);
    try {
      const response = await fetch(`${base()}/api/community/questions?${params}`);
      setQuestions(response.ok ? await response.json() : []);
    } finally { setLoading(false); }
  };
  useEffect(() => { void load(); }, [courseId, company, difficulty, sort]);
  useEffect(() => { void loadMyQuestions(); }, [auth?.user?.id]);
  const countLabel = useMemo(() => `${questions.length} ${questions.length === 1 ? "question" : "questions"}`, [questions.length]);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setFormState("");
    if (!auth?.user) { window.location.href = `${base()}/api/login?returnTo=/community`; return; }
    const response = await fetch(`${base()}/api/community/questions`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ questionText: text, courseId: formCourse, companyName: formCompany || null, roundStage: stage || null, difficulty: formDifficulty || null }) });
    const body = await response.json();
    if (!response.ok) { setFormState(body.error || "Unable to submit this question."); return; }
    setText(""); setFormCompany(""); setStage(""); setFormDifficulty(""); setFormState("Submitted for review. You can track it below."); setShowForm(false); void loadMyQuestions();
  };

  return <div style={{ width: "min(1060px, calc(100% - 40px))", margin: "0 auto", padding: "64px 0 90px" }}>
    <header style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", gap: 20, flexWrap: "wrap", marginBottom: 28 }}>
      <div><div style={{ color: "var(--cin-cyan)", fontFamily: "'JetBrains Mono', monospace", fontSize: 12, letterSpacing: 1.4, marginBottom: 12 }}>COMMUNITY / REAL INTERVIEWS</div><h1 style={{ margin: 0, color: "var(--cin-text)", fontSize: "clamp(30px, 5vw, 50px)", letterSpacing: -1.5 }}>Community Questions</h1><p style={{ color: "var(--cin-dim)", maxWidth: 620, lineHeight: 1.6, margin: "12px 0 0" }}>Learn from scenarios shared by interview candidates, with practical coaching notes to help you prepare.</p></div>
      <button onClick={() => setShowForm((open) => !open)} style={{ ...buttonStyle, background: "linear-gradient(135deg, var(--cin-cyan), #5b9ee7)", color: "#07101f", border: "none", display: "flex", gap: 8, alignItems: "center" }}><MessageCircle size={16} /> Submit a question</button>
    </header>
     {showForm && <form onSubmit={submit} style={{ background: "rgba(15,21,48,0.86)", border: "1px solid var(--cin-border-strong)", borderRadius: 16, padding: 22, marginBottom: 28 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 9, marginBottom: 17 }}><Lightbulb size={17} color="var(--cin-cyan)" /><b style={{ color: "var(--cin-text)" }}>Share an interview scenario</b></div>
      {!auth?.user && <div style={{ padding: 12, background: "rgba(240,179,93,0.1)", color: "#f0b35d", borderRadius: 9, fontSize: 12, marginBottom: 15 }}>You’ll be asked to sign in when you submit.</div>}
      <label style={{ display: "grid", gap: 7, color: "var(--cin-dim)", fontSize: 12 }}>Question or scenario *<textarea required minLength={20} maxLength={2000} value={text} onChange={(e) => setText(e.target.value)} placeholder="What were you asked, and what context made it challenging?" rows={5} style={{ ...fieldStyle, resize: "vertical" }} /><span style={{ color: "var(--cin-faint)", textAlign: "right" }}>{text.length}/2000</span></label>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(190px,1fr))", gap: 13, marginTop: 12 }}>
        <label style={{ display: "grid", gap: 7, color: "var(--cin-dim)", fontSize: 12 }}>Technology *<select required value={formCourse} onChange={(e) => setFormCourse(e.target.value)} style={fieldStyle}><option value="">Choose a technology</option>{courses?.map((course) => <option key={course.id} value={course.id}>{course.name}</option>)}</select></label>
        <label style={{ display: "grid", gap: 7, color: "var(--cin-dim)", fontSize: 12 }}>Company (optional)<input value={formCompany} maxLength={120} onChange={(e) => setFormCompany(e.target.value)} placeholder="e.g. Acme" style={fieldStyle} /></label>
        <label style={{ display: "grid", gap: 7, color: "var(--cin-dim)", fontSize: 12 }}>Round / stage<select value={stage} onChange={(e) => setStage(e.target.value)} style={fieldStyle}><option value="">Choose a stage</option><option>phone screen</option><option>technical round</option><option>system design</option><option>onsite</option></select></label>
        <label style={{ display: "grid", gap: 7, color: "var(--cin-dim)", fontSize: 12 }}>Difficulty<select value={formDifficulty} onChange={(e) => setFormDifficulty(e.target.value)} style={fieldStyle}><option value="">Self-rate (optional)</option><option>easy</option><option>medium</option><option>hard</option></select></label>
      </div>
      <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, alignItems: "center", marginTop: 18 }}><span style={{ color: formState.startsWith("Submitted") ? "var(--cin-cyan)" : "#f0b35d", fontSize: 12 }}>{formState}</span><button type="submit" style={buttonStyle}>Send for review</button></div>
     </form>}
     {formState && !showForm && <div style={{ marginBottom: 20, padding: "12px 14px", border: "1px solid rgba(91,227,216,0.25)", borderRadius: 10, background: "rgba(91,227,216,0.08)", color: "var(--cin-cyan)", fontSize: 12 }}>{formState}</div>}
    <section style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(170px,1fr))", gap: 10, marginBottom: 25 }}>
      <select value={courseId} onChange={(e) => setCourseId(e.target.value)} style={fieldStyle}><option value="">All technologies</option>{courses?.map((course) => <option key={course.id} value={course.id}>{course.name}</option>)}</select>
      <input value={company} onChange={(e) => setCompany(e.target.value)} placeholder="Filter by company" style={fieldStyle} />
      <select value={difficulty} onChange={(e) => setDifficulty(e.target.value)} style={fieldStyle}><option value="">All difficulties</option><option>easy</option><option>medium</option><option>hard</option></select>
      <select value={sort} onChange={(e) => setSort(e.target.value)} style={fieldStyle}><option value="newest">Newest first</option><option value="helpful">Most helpful</option></select>
    </section>
     {auth?.user && myQuestions.length > 0 && <section style={{ marginBottom: 26, padding: 18, border: "1px solid var(--cin-border-strong)", borderRadius: 16, background: "rgba(15,21,48,0.58)" }}>
       <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 12, marginBottom: 12 }}>
         <h2 style={{ margin: 0, color: "var(--cin-text)", fontSize: 16 }}>Your submissions</h2>
         <span style={{ color: "var(--cin-faint)", fontSize: 11 }}>{myQuestions.length} total</span>
       </div>
       <div style={{ display: "grid", gap: 8 }}>
          {myQuestions.map((item) => {
           const statusLabel = item.status === "published" ? "Published" : item.status === "rejected" ? "Not approved" : "Pending review";
           const statusColor = item.status === "published" ? "#4ade80" : item.status === "rejected" ? "#f0b35d" : "var(--cin-cyan)";
            return <div key={item.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 14, padding: "11px 12px", borderRadius: 10, background: "rgba(7,12,30,0.66)" }}>
              <div style={{ minWidth: 0, flex: 1 }}><div style={{ color: "var(--cin-text)", fontSize: 12, lineHeight: 1.45, whiteSpace: "pre-wrap", overflowWrap: "anywhere", wordBreak: "break-word" }}>{item.questionText}</div><div style={{ color: "var(--cin-faint)", fontSize: 10, marginTop: 4 }}>{item.courseName} · {new Date(item.createdAt).toLocaleDateString()}</div></div>
             <span style={{ flexShrink: 0, color: statusColor, fontSize: 10, fontWeight: 700 }}>{statusLabel}</span>
           </div>;
         })}
       </div>
     </section>}
     <div style={{ color: "var(--cin-faint)", fontSize: 12, fontFamily: "'JetBrains Mono', monospace", marginBottom: 14 }}>{countLabel}</div>
    {loading ? <div style={{ color: "var(--cin-dim)", padding: "45px 0", textAlign: "center" }}>Loading community questions…</div> : questions.length === 0 ? <div style={{ textAlign: "center", padding: "65px 20px", border: "1px dashed var(--cin-border)", borderRadius: 16 }}><div style={{ fontSize: 28, marginBottom: 10 }}>✦</div><h2 style={{ color: "var(--cin-text)", margin: 0, fontSize: 19 }}>No published questions yet</h2><p style={{ color: "var(--cin-dim)", fontSize: 13 }}>Be the first to share a scenario with the community.</p><Link href="/community" onClick={() => setShowForm(true)} style={{ color: "var(--cin-cyan)", fontSize: 13 }}>Submit a question →</Link></div> : <div style={{ display: "grid", gap: 14 }}>{questions.map((question) => <QuestionCard key={question.id} question={question} onRefresh={() => void load()} />)}</div>}
  </div>;
}