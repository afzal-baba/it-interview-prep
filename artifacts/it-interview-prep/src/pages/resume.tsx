import { useEffect, useMemo, useState } from "react";
import { useListCourses } from "@workspace/api-client-react";
import { Download, FileText, Plus, Trash2, Sparkles, CheckCircle2, AlertTriangle, Printer } from "lucide-react";
import {
  createExperience, createProject, createResume, getAtsChecks, resumeToText,
  TEMPLATE_META, type ResumeData, type ResumeExperience, type ResumeProject, type ResumeTemplate,
} from "@/lib/resume";
import { DISTINCT_TEMPLATES } from "@/templates";

const STORAGE_KEY = "techinterviewprep-resume-draft";
const fieldStyle = { width: "100%", boxSizing: "border-box" as const, padding: "10px 11px", borderRadius: 8, border: "1px solid var(--cin-border)", background: "rgba(255,255,255,0.04)", color: "var(--cin-text)", outline: "none", fontSize: 12 };
const labelStyle = { display: "block", color: "var(--cin-dim)", fontSize: 11, marginBottom: 5, fontFamily: "'JetBrains Mono', monospace" };

function Field({ label, value, onChange, multiline = false, placeholder }: { label: string; value: string; onChange: (value: string) => void; multiline?: boolean; placeholder?: string }) {
  return <label style={{ display: "block", marginBottom: 12 }}><span style={labelStyle}>{label}</span>{multiline ? <textarea value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} rows={4} style={{ ...fieldStyle, resize: "vertical" }} /> : <input value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} style={fieldStyle} />}</label>;
}

function Section({ title, children, action }: { title: string; children: React.ReactNode; action?: React.ReactNode }) {
  return <section style={{ padding: 18, marginBottom: 14, border: "1px solid var(--cin-border)", borderRadius: 14, background: "rgba(10,15,42,0.72)" }}><div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}><h2 style={{ margin: 0, color: "var(--cin-text)", fontSize: 15 }}>{title}</h2>{action}</div>{children}</section>;
}

function CollapsibleSection({ title, children, summary, open, onOpenChange }: { title: string; children: React.ReactNode; summary: React.ReactNode; open: boolean; onOpenChange: (open: boolean) => void }) {
  return <section style={{ padding: 18, marginBottom: 14, border: "1px solid var(--cin-border)", borderRadius: 14, background: "rgba(10,15,42,0.72)" }}>
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, marginBottom: open ? 14 : 0 }}>
      <h2 style={{ margin: 0, color: "var(--cin-text)", fontSize: 15 }}>{title}</h2>
      <button type="button" onClick={() => onOpenChange(!open)} aria-expanded={open} style={{ border: "1px solid var(--cin-border)", borderRadius: 7, background: "rgba(255,255,255,0.04)", color: "var(--cin-dim)", cursor: "pointer", padding: "6px 9px", fontSize: 10 }}>
        {open ? "Collapse" : "Choose another"}
      </button>
    </div>
    {open ? children : summary}
  </section>;
}

function Button({ children, onClick, secondary = false, disabled = false }: { children: React.ReactNode; onClick?: () => void; secondary?: boolean; disabled?: boolean }) {
  return <button onClick={onClick} disabled={disabled} style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "8px 11px", borderRadius: 8, border: secondary ? "1px solid var(--cin-border)" : "none", background: secondary ? "rgba(255,255,255,0.04)" : "var(--cin-cyan)", color: secondary ? "var(--cin-dim)" : "#071019", fontSize: 11, fontWeight: 700, cursor: disabled ? "not-allowed" : "pointer", opacity: disabled ? 0.5 : 1 }}>{children}</button>;
}

function LegacyPreview({ resume }: { resume: ResumeData }) {
  const meta = TEMPLATE_META[resume.template];
  const contact = [resume.contact.email, resume.contact.phone, resume.contact.location, resume.contact.website].filter(Boolean).join("  ·  ");
  const sidebar = <aside style={{ width: 150, flexShrink: 0, paddingRight: 18, borderRight: "1px solid #d5d9df" }}><PreviewHeading>CONTACT</PreviewHeading><div>{contact}</div><PreviewHeading>SKILLS</PreviewHeading><div>{resume.skills.join(" · ") || "Add skills"}</div>{resume.verifiedSkills.length > 0 && <><PreviewHeading>VERIFIED</PreviewHeading><div>{resume.verifiedSkills.join(" · ")}</div></>}</aside>;
  const main = <div style={{ flex: 1, minWidth: 0 }}>{resume.summary && <><PreviewHeading>SUMMARY</PreviewHeading><div>{resume.summary}</div></>}<PreviewHeading>EXPERIENCE</PreviewHeading>{resume.experience.filter((item) => item.role || item.company).map((item) => <div key={item.id} style={{ marginBottom: 10 }}><strong>{item.role || "Role"}{item.company && ` — ${item.company}`}</strong><small>{item.dates}</small>{item.bullets.filter(Boolean).map((bullet, index) => <div key={index}>• {bullet}</div>)}</div>)}<PreviewHeading>PROJECTS</PreviewHeading>{resume.projects.filter((item) => item.name || item.description).map((item) => <div key={item.id} style={{ marginBottom: 8 }}><strong>{item.name}</strong>{item.technologies && <small>{item.technologies}</small>}<div>{item.description}</div></div>)}<PreviewHeading>EDUCATION</PreviewHeading>{resume.education.filter(Boolean).map((item, index) => <div key={index}>{item}</div>)}<PreviewHeading>CERTIFICATIONS</PreviewHeading>{resume.certifications.filter(Boolean).map((item, index) => <div key={index}>{item}</div>)}</div>;
  const twoColumn = meta.layout === "sidebar";
  const warmPage = resume.template === "corporate-off-white";
  return <div id="resume-preview" className={`resume-printable resume-template-${resume.template}`} style={{ minHeight: 720, padding: 34, color: "#1b2330", background: warmPage ? "#faf8f3" : "#fff", fontFamily: "Arial, sans-serif", fontSize: 10.5, lineHeight: 1.45, boxShadow: "0 12px 35px rgba(0,0,0,0.25)", display: twoColumn ? "flex" : "block" }}><header style={{ borderBottom: `2px solid ${meta.accent}`, paddingBottom: 12, marginBottom: 15, textAlign: twoColumn ? "left" : "center", borderTop: meta.layout === "focus" ? `7px solid ${meta.accent}` : undefined, paddingTop: meta.layout === "focus" ? 10 : 0 }}><h1 style={{ margin: 0, fontSize: meta.category === "Corporate" ? 28 : 25, letterSpacing: "-0.03em", color: meta.accent }}>{resume.contact.name || "Your Name"}</h1><div style={{ color: "#536071", marginTop: 3 }}>{resume.contact.role || "Target role"}</div>{!twoColumn && contact && <div style={{ marginTop: 6 }}>{contact}</div>}</header>{twoColumn ? <>{sidebar}{main}</> : main}</div>;
}

function Preview({ resume }: { resume: ResumeData }) {
  const DistinctTemplate = DISTINCT_TEMPLATES[resume.template];
  if (DistinctTemplate) {
    return <div id="resume-preview" className={`resume-printable resume-template-${resume.template}`}><DistinctTemplate data={resume} /></div>;
  }
  return <LegacyPreview resume={resume} />;
}

function PreviewHeading({ children }: { children: React.ReactNode }) {
  return <h3 style={{ margin: "13px 0 5px", paddingBottom: 2, borderBottom: "1px solid #b8bec8", fontSize: 10, letterSpacing: "0.1em" }}>{children}</h3>;
}

function MiniPreview({ template }: { template: ResumeTemplate }) {
  const meta = TEMPLATE_META[template];
  const DistinctTemplate = DISTINCT_TEMPLATES[template];
  if (DistinctTemplate) {
    const thumbnail: ResumeData = {
      ...createResume(),
      template,
      contact: { name: "Alex Morgan", role: "Senior Engineer", email: "alex@email.com", phone: "555 0100", location: "New York", website: "alex.dev" },
      summary: "Product-minded engineer building reliable systems.",
      skills: ["TypeScript", "Cloud", "SQL", "React", "Python"],
      experience: [{ id: "thumb", role: "Senior Engineer", company: "Northstar Labs", dates: "2022 — Present", bullets: ["Built scalable platform services", "Improved delivery quality"] }],
      projects: [{ id: "thumb-project", name: "Interview Prep", technologies: "React · Node", description: "A focused learning platform.", link: "" }],
      education: ["B.S. Computer Science"],
      certifications: ["Cloud Practitioner"],
      verifiedSkills: [],
    };
    return <div style={{ height: 72, padding: 0, boxSizing: "border-box", background: "#fff", color: "#1b2330", borderRadius: 5, overflow: "hidden" }}><div style={{ width: 310, transform: "scale(0.23)", transformOrigin: "top left", pointerEvents: "none" }}><DistinctTemplate data={thumbnail} /></div></div>;
  }
  return <div style={{ height: 72, padding: 8, boxSizing: "border-box", background: template === "corporate-off-white" ? "#faf8f3" : "#fff", color: "#1b2330", borderRadius: 5, overflow: "hidden", fontSize: 5, lineHeight: 1.35, borderLeft: meta.layout === "sidebar" ? `18px solid ${meta.accent}` : undefined, borderTop: meta.layout === "focus" ? `5px solid ${meta.accent}` : undefined }}>
    <div style={{ height: 6, width: "48%", background: meta.accent, marginBottom: 5 }} /><div style={{ height: 2, width: "70%", background: "#94a3b8", marginBottom: 6 }} />
    {Array.from({ length: 5 }).map((_, index) => <div key={index} style={{ height: 2, width: `${72 - index * 8}%`, background: index === 1 ? meta.accent : "#cbd5e1", marginBottom: 5 }} />)}
  </div>;
}

function hasTypedResumeContent(resume: ResumeData): boolean {
  const hasText = (value: string) => value.trim().length > 0;
  return Object.values(resume.contact).some(hasText)
    || hasText(resume.summary)
    || resume.skills.length > 0
    || resume.experience.some((item) => [item.role, item.company, item.dates, ...item.bullets].some(hasText))
    || resume.projects.some((item) => [item.name, item.technologies, item.description, item.link].some(hasText))
    || resume.education.some(hasText)
    || resume.certifications.some(hasText);
}

export default function Resume() {
  const { data: courses } = useListCourses();
  const [resume, setResume] = useState<ResumeData>(() => {
    try { return { ...createResume(), ...JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "null") }; } catch { return createResume(); }
  });
  const [bulletContext, setBulletContext] = useState("");
  const [technology, setTechnology] = useState("");
  const [bullets, setBullets] = useState<string[]>([]);
  const [jobDescription, setJobDescription] = useState("");
  const [match, setMatch] = useState<{ matched_keywords: string[]; missing_keywords: string[]; suggested_additions: string[] } | null>(null);
  const [busy, setBusy] = useState<"bullets" | "match" | null>(null);
  const [message, setMessage] = useState("");
  const [templateFilter, setTemplateFilter] = useState<"All" | "ATS" | "Creative" | "Corporate" | "Free Only">("All");
  const [templateChooserOpen, setTemplateChooserOpen] = useState(true);
  const [templateSelected, setTemplateSelected] = useState(false);
  const ats = useMemo(() => getAtsChecks(resume), [resume]);
  const showPreview = templateSelected && hasTypedResumeContent(resume);

  useEffect(() => { localStorage.setItem(STORAGE_KEY, JSON.stringify(resume)); document.title = "Resume Builder — TechInterviewPrep"; }, [resume]);
  useEffect(() => {
    const requested = new URLSearchParams(window.location.search).get("template") as ResumeTemplate | null;
    if (requested && requested in TEMPLATE_META && requested !== resume.template) {
      update({ template: requested });
      setTemplateSelected(true);
      setTemplateChooserOpen(false);
    }
    if (requested && requested in TEMPLATE_META) setTemplateSelected(true);
  // Only apply a template passed by the gallery on the initial page visit.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const update = (patch: Partial<ResumeData>) => setResume((current) => ({ ...current, ...patch }));
  const updateContact = (key: keyof ResumeData["contact"], value: string) => update({ contact: { ...resume.contact, [key]: value } });
  const updateExperience = (id: string, patch: Partial<ResumeExperience>) => update({ experience: resume.experience.map((item) => item.id === id ? { ...item, ...patch } : item) });
  const updateProject = (id: string, patch: Partial<ResumeProject>) => update({ projects: resume.projects.map((item) => item.id === id ? { ...item, ...patch } : item) });
  const api = async (action: string, body: Record<string, unknown>) => {
    const base = import.meta.env.BASE_URL.replace(/\/$/, "");
    const response = await fetch(`${base}/api/resume-ai`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action, ...body }) });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "AI request failed");
    return data;
  };
  const generateBullets = async () => {
    setBusy("bullets"); setMessage("");
    try { const data = await api("bullets", { technology, context: bulletContext }); setBullets(data.bullets ?? []); } catch (error) { setMessage(error instanceof Error ? error.message : "Could not generate bullets."); } finally { setBusy(null); }
  };
  const analyzeJob = async () => {
    setBusy("match"); setMessage("");
    try { setMatch(await api("match", { jobDescription, resume: resumeToText(resume) })); } catch (error) { setMessage(error instanceof Error ? error.message : "Could not analyze the job description."); } finally { setBusy(null); }
  };
  const insertKeyword = async (keyword: string) => {
    setBusy("bullets"); setMessage("");
    try {
      const data = await api("insert", { keyword, resume: resumeToText(resume) });
      if (data.bullet) addBullet(data.bullet);
    } catch (error) { setMessage(error instanceof Error ? error.message : "Could not draft a bullet."); } finally { setBusy(null); }
  };
  const downloadText = () => { const blob = new Blob([resumeToText(resume)], { type: "text/plain" }); const link = document.createElement("a"); link.href = URL.createObjectURL(blob); link.download = `${resume.contact.name || "resume"}.txt`; link.click(); URL.revokeObjectURL(link.href); };
  const addBullet = (bullet: string, id = resume.experience[0]?.id) => { if (!id) return; updateExperience(id, { bullets: [...(resume.experience.find((item) => item.id === id)?.bullets ?? []), bullet] }); };
  const addListItem = (key: "education" | "certifications", value = "") => update({ [key]: [...resume[key], value] });
  const verifiedOptions = courses?.filter((course) => resume.verifiedSkills.includes(course.name) || course.name).slice(0, 77) ?? [];
  const templateEntries = (Object.keys(TEMPLATE_META) as ResumeTemplate[]).filter((key) => templateFilter === "All" || (templateFilter === "Free Only" ? TEMPLATE_META[key].free : TEMPLATE_META[key].category === templateFilter));

  return <div className="resume-page" style={{ minHeight: "100%", padding: "45px 32px 90px", color: "var(--cin-text)" }}>
    <div className="resume-toolbar" style={{ maxWidth: 1250, margin: "0 auto 30px", display: "flex", justifyContent: "space-between", gap: 16, flexWrap: "wrap", alignItems: "end" }}>
      <div><div style={{ color: "var(--cin-cyan)", fontFamily: "'JetBrains Mono', monospace", fontSize: 11, letterSpacing: "0.15em", textTransform: "uppercase" }}>Career toolkit</div><h1 style={{ margin: "8px 0 5px", fontSize: 36, letterSpacing: "-0.04em" }}>Build your next resume</h1><p style={{ margin: 0, color: "var(--cin-dim)", fontSize: 14 }}>Original templates, interview-verified skills, and focused AI help.</p></div>
      <div style={{ display: "flex", gap: 8 }}><Button secondary onClick={downloadText}><Download size={14} />Plain text</Button><Button onClick={() => window.print()}><Printer size={14} />Print / PDF</Button></div>
    </div>
    <div className="resume-layout" style={{ maxWidth: 1250, margin: "0 auto", display: "grid", gridTemplateColumns: "minmax(330px, 0.9fr) minmax(420px, 1.1fr)", gap: 22, alignItems: "start" }}>
       <div className="resume-editor">
         <CollapsibleSection open={templateChooserOpen} onOpenChange={setTemplateChooserOpen} title="Choose a template" summary={<div style={{ display: "flex", alignItems: "center", gap: 10, color: "var(--cin-dim)", fontSize: 11 }}><div style={{ width: 72, height: 30, overflow: "hidden", borderRadius: 5 }}><MiniPreview template={resume.template} /></div><span>Selected: <strong style={{ color: "var(--cin-text)" }}>{TEMPLATE_META[resume.template].name}</strong></span></div>}><div style={{ display: "flex", gap: 5, flexWrap: "wrap", marginBottom: 12 }}>{(["All", "ATS", "Creative", "Corporate", "Free Only"] as const).map((filter) => <button key={filter} onClick={() => setTemplateFilter(filter)} style={{ padding: "6px 8px", borderRadius: 7, border: `1px solid ${templateFilter === filter ? "var(--cin-cyan)" : "var(--cin-border)"}`, background: templateFilter === filter ? "rgba(91,227,216,0.1)" : "transparent", color: templateFilter === filter ? "var(--cin-cyan)" : "var(--cin-dim)", fontSize: 10, cursor: "pointer" }}>{filter}</button>)}</div><h3 style={{ margin: "0 0 8px", color: "var(--cin-cyan)", fontSize: 11 }}>Free Collection (2026)</h3><div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>{templateEntries.map((key) => { const meta = TEMPLATE_META[key]; return <button key={key} aria-pressed={resume.template === key} onClick={() => { update({ template: key }); setTemplateSelected(true); setTemplateChooserOpen(false); }} style={{ textAlign: "left", padding: 8, borderRadius: 9, border: `1px solid ${resume.template === key ? "var(--cin-cyan)" : "var(--cin-border)"}`, background: resume.template === key ? "rgba(91,227,216,0.1)" : "rgba(255,255,255,0.03)", color: "var(--cin-text)", cursor: "pointer" }}><MiniPreview template={key} /><div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 4, marginTop: 7 }}><strong style={{ fontSize: 10 }}>{meta.name}</strong>{meta.free && <span style={{ color: "var(--cin-cyan)", fontSize: 8, fontWeight: 700 }}>FREE</span>}</div><span style={{ display: "block", color: "var(--cin-dim)", fontSize: 9, marginTop: 3 }}>{meta.tags.join(" · ")}</span><span style={{ display: "block", color: "var(--cin-faint)", fontSize: 9, marginTop: 3 }}>Best for: {meta.bestFor}</span></button>; })}</div></CollapsibleSection>
        <Section title="Contact"><div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}><Field label="Name" value={resume.contact.name} onChange={(value) => updateContact("name", value)} /><Field label="Target role" value={resume.contact.role} onChange={(value) => updateContact("role", value)} /><Field label="Email" value={resume.contact.email} onChange={(value) => updateContact("email", value)} /><Field label="Phone" value={resume.contact.phone} onChange={(value) => updateContact("phone", value)} /><Field label="Location" value={resume.contact.location} onChange={(value) => updateContact("location", value)} /><Field label="Website" value={resume.contact.website} onChange={(value) => updateContact("website", value)} /></div></Section>
        <Section title="Summary"><Field label="2–4 sentence professional summary" value={resume.summary} onChange={(value) => update({ summary: value })} multiline placeholder="Backend engineer who..." /></Section>
        <Section title="Skills"><Field label="Comma-separated skills" value={resume.skills.join(", ")} onChange={(value) => update({ skills: value.split(",").map((item) => item.trim()).filter(Boolean) })} placeholder="Python, SQL, Docker, AWS" /></Section>
        <Section title="Experience" action={<Button secondary onClick={() => update({ experience: [...resume.experience, createExperience()] })}><Plus size={13} />Add role</Button>}>{resume.experience.map((item) => <div key={item.id} style={{ paddingBottom: 14, marginBottom: 14, borderBottom: "1px solid var(--cin-border)" }}><div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}><Field label="Role" value={item.role} onChange={(value) => updateExperience(item.id, { role: value })} /><Field label="Company" value={item.company} onChange={(value) => updateExperience(item.id, { company: value })} /><Field label="Dates" value={item.dates} onChange={(value) => updateExperience(item.id, { dates: value })} /></div>{item.bullets.map((bullet, index) => <div key={index} style={{ display: "flex", gap: 6, alignItems: "start" }}><textarea value={bullet} onChange={(event) => updateExperience(item.id, { bullets: item.bullets.map((value, i) => i === index ? event.target.value : value) })} rows={2} placeholder="Improved..." style={{ ...fieldStyle, resize: "vertical" }} />{item.bullets.length > 1 && <button onClick={() => updateExperience(item.id, { bullets: item.bullets.filter((_, i) => i !== index) })} style={{ border: 0, background: "transparent", color: "var(--cin-dim)", cursor: "pointer" }}><Trash2 size={14} /></button>}</div>)}<Button secondary onClick={() => updateExperience(item.id, { bullets: [...item.bullets, ""] })}><Plus size={12} />Add bullet</Button></div>)}</Section>
        <Section title="Projects" action={<Button secondary onClick={() => update({ projects: [...resume.projects, createProject()] })}><Plus size={13} />Add project</Button>}>{resume.projects.map((item) => <div key={item.id} style={{ borderBottom: "1px solid var(--cin-border)", marginBottom: 12, paddingBottom: 10 }}><Field label="Project name" value={item.name} onChange={(value) => updateProject(item.id, { name: value })} /><Field label="Technologies" value={item.technologies} onChange={(value) => updateProject(item.id, { technologies: value })} /><Field label="Description" value={item.description} onChange={(value) => updateProject(item.id, { description: value })} multiline /></div>)}</Section>
        <Section title="Education & certifications"><div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}><div><div style={labelStyle}>Education</div>{resume.education.map((item, index) => <div key={index} style={{ display: "flex", gap: 5, marginBottom: 6 }}><input value={item} onChange={(event) => update({ education: resume.education.map((value, i) => i === index ? event.target.value : value) })} style={fieldStyle} />{resume.education.length > 1 && <button onClick={() => update({ education: resume.education.filter((_, i) => i !== index) })} style={{ border: 0, background: "transparent", color: "var(--cin-dim)" }}><Trash2 size={13} /></button>}</div>)}<Button secondary onClick={() => addListItem("education")}><Plus size={12} />Add</Button></div><div><div style={labelStyle}>Certifications</div>{resume.certifications.map((item, index) => <div key={index} style={{ display: "flex", gap: 5, marginBottom: 6 }}><input value={item} onChange={(event) => update({ certifications: resume.certifications.map((value, i) => i === index ? event.target.value : value) })} style={fieldStyle} />{resume.certifications.length > 1 && <button onClick={() => update({ certifications: resume.certifications.filter((_, i) => i !== index) })} style={{ border: 0, background: "transparent", color: "var(--cin-dim)" }}><Trash2 size={13} /></button>}</div>)}<Button secondary onClick={() => addListItem("certifications")}><Plus size={12} />Add</Button></div></div></Section>
        <Section title="Verified skills"><p style={{ color: "var(--cin-dim)", fontSize: 11, marginTop: 0 }}>Select courses you have completed to highlight them as verified learning.</p><div style={{ display: "flex", flexWrap: "wrap", gap: 6, maxHeight: 170, overflowY: "auto" }}>{verifiedOptions.map((course) => { const selected = resume.verifiedSkills.includes(course.name); return <button key={course.id} onClick={() => update({ verifiedSkills: selected ? resume.verifiedSkills.filter((name) => name !== course.name) : [...resume.verifiedSkills, course.name] })} style={{ padding: "6px 8px", borderRadius: 7, border: `1px solid ${selected ? "var(--cin-cyan)" : "var(--cin-border)"}`, background: selected ? "rgba(91,227,216,0.12)" : "transparent", color: selected ? "var(--cin-cyan)" : "var(--cin-dim)", fontSize: 10, cursor: "pointer" }}>{selected && "✓ "}{course.name}</button>; })}</div></Section>
        <Section title="AI bullet suggestions"><div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}><Field label="Technology" value={technology} onChange={setTechnology} placeholder="AWS, Python, React..." /><Field label="Role / context" value={bulletContext} onChange={setBulletContext} placeholder="What did you build?" /></div><Button onClick={() => void generateBullets()} disabled={busy !== null || !technology}><Sparkles size={13} />{busy === "bullets" ? "Generating..." : "Suggest bullets"}</Button>{bullets.map((bullet) => <div key={bullet} style={{ marginTop: 8, padding: 9, borderRadius: 8, background: "rgba(91,227,216,0.08)", color: "#fff", fontSize: 11, cursor: "pointer" }} onClick={() => addBullet(bullet)}>+ {bullet}</div>)}</Section>
        <Section title="Job description matcher"><Field label="Paste the job description" value={jobDescription} onChange={setJobDescription} multiline placeholder="Paste the employer's description here..." /><Button onClick={() => void analyzeJob()} disabled={busy !== null || !jobDescription}><Sparkles size={13} />{busy === "match" ? "Analyzing..." : "Match keywords"}</Button>{match && <div style={{ marginTop: 12, fontSize: 11 }}><strong style={{ color: "#4ade80" }}>Matched</strong><div style={{ color: "#4ade80", margin: "5px 0 10px" }}>{match.matched_keywords.join(" · ") || "None yet"}</div><strong style={{ color: "#fbbf24" }}>Missing — click to draft a bullet</strong><div style={{ display: "flex", flexWrap: "wrap", gap: 5, marginTop: 5 }}>{match.missing_keywords.map((keyword) => <button key={keyword} onClick={() => void insertKeyword(keyword)} disabled={busy !== null} style={{ padding: "5px 7px", borderRadius: 6, border: "1px solid rgba(251,191,36,0.4)", background: "rgba(251,191,36,0.08)", color: "#fbbf24", cursor: busy ? "wait" : "pointer", fontSize: 10 }}>+ {keyword}</button>)}</div></div>}</Section>
        {message && <div style={{ color: "#fca5a5", fontSize: 12, marginBottom: 14 }}>{message}</div>}
      </div>
       <div className="resume-side"><div className="resume-side-sticky">{showPreview ? <><div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}><h2 style={{ margin: 0, fontSize: 15 }}>Live preview</h2><span style={{ color: "var(--cin-faint)", fontSize: 11 }}>{TEMPLATE_META[resume.template].atsRisk}</span></div><div className="resume-preview-frame"><Preview resume={resume} /></div><div className="resume-ats-checklist" style={{ marginTop: 14, padding: 16, border: "1px solid var(--cin-border)", borderRadius: 14, background: "rgba(10,15,42,0.72)" }}><h2 style={{ margin: "0 0 12px", fontSize: 15 }}>ATS checklist</h2>{ats.map((check) => <div key={check.label} style={{ display: "flex", gap: 8, alignItems: "start", marginBottom: 9, fontSize: 11 }}><span style={{ color: check.pass ? "#4ade80" : "#fbbf24" }}>{check.pass ? <CheckCircle2 size={14} /> : <AlertTriangle size={14} />}</span><div><strong style={{ color: "var(--cin-text)" }}>{check.label}</strong>{!check.pass && <div style={{ color: "var(--cin-dim)", marginTop: 2 }}>{check.fix}</div>}</div></div>)}</div></> : <div style={{ minHeight: 260, display: "grid", placeItems: "center", padding: 30, border: "1px dashed var(--cin-border-strong)", borderRadius: 16, background: "rgba(10,15,42,0.5)", textAlign: "center" }}><div><FileText size={28} color="var(--cin-cyan)" style={{ marginBottom: 12 }} /><h2 style={{ margin: "0 0 8px", fontSize: 17 }}>{templateSelected ? "Start building your resume" : "Choose a template first"}</h2><p style={{ margin: 0, color: "var(--cin-dim)", fontSize: 12, lineHeight: 1.6 }}>{templateSelected ? "Start typing your details on the left and your live preview will appear here." : "Select a template, then start typing your details to see the live preview."}</p></div></div>}</div></div>
    </div>
  </div>;
}