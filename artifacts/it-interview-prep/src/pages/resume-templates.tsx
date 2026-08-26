import { useState } from "react";
import { Link } from "wouter";
import { createResume, TEMPLATE_META, type ResumeTemplate } from "@/lib/resume";
import { DISTINCT_TEMPLATES } from "@/templates";

const TEMPLATE_KEYS = (Object.keys(DISTINCT_TEMPLATES) as ResumeTemplate[]).filter((key) => TEMPLATE_META[key]?.free);

function TemplateCard({ template }: { template: ResumeTemplate }) {
  const Component = DISTINCT_TEMPLATES[template];
  const data = { ...createResume(), template, contact: { name: "Alex Morgan", role: "Senior Engineer", email: "alex@email.com", phone: "555 0100", location: "New York", website: "alex.dev" }, summary: "Product-minded engineer building reliable systems.", skills: ["TypeScript", "Cloud", "SQL", "React", "Python"], experience: [{ id: "gallery", role: "Senior Engineer", company: "Northstar Labs", dates: "2022 — Present", bullets: ["Built scalable platform services", "Improved delivery quality"] }], projects: [{ id: "gallery-project", name: "Interview Prep", technologies: "React · Node", description: "A focused learning platform.", link: "" }], education: ["B.S. Computer Science"], certifications: ["Cloud Practitioner"], verifiedSkills: [] };
  return <article className="resume-gallery-card">
    <div className="resume-gallery-thumbnail">{Component ? <div className="resume-gallery-thumbnail-scale"><Component data={data} /></div> : null}</div>
    <div className="resume-gallery-card-body"><div className="resume-gallery-card-heading"><h2>{TEMPLATE_META[template].name}</h2><span>FREE</span></div><p>{TEMPLATE_META[template].description}</p><div className="resume-gallery-tags">{TEMPLATE_META[template].tags.map((tag) => <span key={tag}>{tag}</span>)}</div><small>Best for: {TEMPLATE_META[template].bestFor}</small><Link className="resume-gallery-select" href={`/resume?template=${template}`}>Use this template →</Link></div>
  </article>;
}

export default function ResumeTemplates() {
  const [filter, setFilter] = useState<"All" | "ATS" | "Creative" | "Corporate">("All");
  const visibleTemplates = TEMPLATE_KEYS.filter((template) => filter === "All" || TEMPLATE_META[template].category === filter);
  return <div className="resume-templates-page">
    <div className="resume-templates-hero"><div className="resume-eyebrow">Career toolkit</div><h1>12 free ATS resume templates</h1><p>Choose a distinct layout, then continue in the full Resume Builder with your content and live preview.</p><Link className="resume-gallery-builder-link" href="/resume-builder">Open Resume Builder →</Link></div>
    <div className="resume-gallery-filters" aria-label="Template categories">{(["All", "ATS", "Creative", "Corporate"] as const).map((category) => <button type="button" key={category} className={filter === category ? "active" : ""} onClick={() => setFilter(category)} aria-pressed={filter === category}>{category}</button>)}</div>
    <div className="resume-gallery-grid">{visibleTemplates.map((template) => <TemplateCard key={template} template={template} />)}</div>
  </div>;
}