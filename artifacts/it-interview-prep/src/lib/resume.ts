export type ResumeTemplate =
  | "classic" | "modern" | "cloud" | "data"
  | "minimalist-black-white" | "gray-white-timeline" | "white-black-simple-ats"
  | "infographic-single-column" | "professional-single-column"
  | "green-lined-modern" | "purple-professional" | "orange-amber-creative" | "sidebar-contemporary"
  | "corporate-off-white" | "minimalistic-executive" | "blue-modern-formal";
export type TemplateCategory = "ATS" | "Creative" | "Corporate" | "Focus";

export interface ResumeExperience {
  id: string;
  role: string;
  company: string;
  dates: string;
  bullets: string[];
}

export interface ResumeProject {
  id: string;
  name: string;
  technologies: string;
  description: string;
  link: string;
}

export interface ResumeData {
  template: ResumeTemplate;
  contact: { name: string; role: string; email: string; phone: string; location: string; website: string };
  summary: string;
  skills: string[];
  experience: ResumeExperience[];
  projects: ResumeProject[];
  education: string[];
  certifications: string[];
  verifiedSkills: string[];
}

export interface TemplateMeta {
  name: string;
  description: string;
  atsRisk: string;
  category: TemplateCategory;
  tags: string[];
  bestFor: string;
  free?: boolean;
  accent: string;
  layout: "single" | "sidebar" | "timeline" | "focus";
}

export const TEMPLATE_META: Record<ResumeTemplate, TemplateMeta> = {
  "minimalist-black-white": { name: "Minimalist black & white", description: "Crisp two-column structure with strong contrast.", atsRisk: "Low parsing risk", category: "ATS", tags: ["ATS", "Minimalist"], bestFor: "Software engineers", free: true, accent: "#111827", layout: "sidebar" },
  "gray-white-timeline": { name: "Gray-white timeline", description: "A calm timeline makes career progression easy to scan.", atsRisk: "Low parsing risk", category: "ATS", tags: ["ATS", "Timeline"], bestFor: "Career changers", free: true, accent: "#64748b", layout: "timeline" },
  "white-black-simple-ats": { name: "White-black simple ATS", description: "Pure single-column format for conservative screening.", atsRisk: "Lowest parsing risk", category: "ATS", tags: ["ATS", "Simple"], bestFor: "High-volume applications", free: true, accent: "#0f172a", layout: "single" },
  "infographic-single-column": { name: "Infographic single column", description: "Light visual rhythm without images or parsing traps.", atsRisk: "Low parsing risk", category: "ATS", tags: ["ATS", "Visual"], bestFor: "Early-career candidates", free: true, accent: "#0f766e", layout: "single" },
  "professional-single-column": { name: "Professional single column", description: "Polished, familiar, and effortless to scan.", atsRisk: "Lowest parsing risk", category: "ATS", tags: ["ATS", "Classic"], bestFor: "Most roles", free: true, accent: "#1d4ed8", layout: "single" },
  "green-lined-modern": { name: "Green-lined modern", description: "Fresh green rules with an organized modern feel.", atsRisk: "Low parsing risk", category: "Creative", tags: ["Creative", "Green"], bestFor: "Product builders", free: true, accent: "#2E8B57", layout: "single" },
  "purple-professional": { name: "Purple professional", description: "Confident purple accents with a refined hierarchy.", atsRisk: "Low parsing risk", category: "Creative", tags: ["Creative", "Purple"], bestFor: "Design-minded engineers", free: true, accent: "#7c3aed", layout: "single" },
  "orange-amber-creative": { name: "Orange amber creative", description: "Warm amber accents bring energy to your story.", atsRisk: "Low parsing risk", category: "Creative", tags: ["Creative", "Amber"], bestFor: "Startup candidates", free: true, accent: "#d97706", layout: "single" },
  "sidebar-contemporary": { name: "Sidebar contemporary", description: "A confident sidebar balances profile and experience.", atsRisk: "Some ATS tools may flatten columns", category: "Creative", tags: ["Creative", "Sidebar"], bestFor: "Multi-skilled professionals", free: true, accent: "#0e7490", layout: "sidebar" },
  "corporate-off-white": { name: "Corporate off-white", description: "Executive structure on a warm, understated canvas.", atsRisk: "Low parsing risk", category: "Corporate", tags: ["Corporate", "Executive"], bestFor: "Managers and leads", free: true, accent: "#334155", layout: "single" },
  "minimalistic-executive": { name: "Minimalistic executive", description: "Elegant typography keeps senior experience in focus.", atsRisk: "Lowest parsing risk", category: "Corporate", tags: ["Corporate", "Minimal"], bestFor: "Senior professionals", free: true, accent: "#172554", layout: "focus" },
  "blue-modern-formal": { name: "Blue modern formal", description: "Formal navy headers with a precise technical edge.", atsRisk: "Low parsing risk", category: "Corporate", tags: ["Corporate", "Blue"], bestFor: "Enterprise roles", free: true, accent: "#1e40af", layout: "single" },
  classic: { name: "ATS-safe classic", description: "Single column with a familiar section order.", atsRisk: "Lowest parsing risk", category: "Focus", tags: ["ATS", "Classic"], bestFor: "Most roles", accent: "#1e293b", layout: "single" },
  modern: { name: "Modern two-column", description: "Compact sidebar for contact and skills.", atsRisk: "Some ATS tools may flatten columns", category: "Focus", tags: ["Two-column"], bestFor: "Visual storytellers", accent: "#0e7490", layout: "sidebar" },
  cloud: { name: "Cloud / DevOps focus", description: "Certifications and infrastructure lead the story.", atsRisk: "Low parsing risk", category: "Focus", tags: ["Cloud", "DevOps"], bestFor: "Infrastructure roles", accent: "#0f766e", layout: "focus" },
  data: { name: "Data / Backend focus", description: "Systems, pipelines, and projects lead the story.", atsRisk: "Low parsing risk", category: "Focus", tags: ["Data", "Backend"], bestFor: "Backend roles", accent: "#1d4ed8", layout: "focus" },
};

const id = () => `${Date.now()}-${Math.random().toString(36).slice(2)}`;

export function createExperience(): ResumeExperience {
  return { id: id(), role: "", company: "", dates: "", bullets: [""] };
}

export function createProject(): ResumeProject {
  return { id: id(), name: "", technologies: "", description: "", link: "" };
}

export function createResume(): ResumeData {
  return {
    template: "classic",
    contact: { name: "", role: "", email: "", phone: "", location: "", website: "" },
    summary: "",
    skills: [],
    experience: [createExperience()],
    projects: [createProject()],
    education: [""],
    certifications: [""],
    verifiedSkills: [],
  };
}

export function resumeToText(resume: ResumeData): string {
  const lines: string[] = [];
  const contact = [resume.contact.name, resume.contact.role, resume.contact.email, resume.contact.phone, resume.contact.location, resume.contact.website].filter(Boolean);
  if (contact.length) lines.push(...contact, "");
  if (resume.summary) lines.push("SUMMARY", resume.summary, "");
  if (resume.skills.length) lines.push("SKILLS", resume.skills.join(" • "), "");
  if (resume.verifiedSkills.length) lines.push("SKILLS VERIFIED BY TECHINTERVIEWPREP", resume.verifiedSkills.join(" • "), "");
  if (resume.experience.some((item) => item.role || item.company)) {
    lines.push("EXPERIENCE");
    resume.experience.forEach((item) => {
      if (item.role || item.company) lines.push(`${item.role}${item.company ? ` — ${item.company}` : ""}${item.dates ? ` | ${item.dates}` : ""}`);
      item.bullets.filter(Boolean).forEach((bullet) => lines.push(`• ${bullet}`));
    });
    lines.push("");
  }
  if (resume.projects.some((item) => item.name || item.description)) {
    lines.push("PROJECTS");
    resume.projects.forEach((item) => {
      if (item.name) lines.push(`${item.name}${item.technologies ? ` — ${item.technologies}` : ""}`);
      if (item.description) lines.push(item.description);
      if (item.link) lines.push(item.link);
    });
    lines.push("");
  }
  const appendList = (title: string, values: string[]) => {
    const clean = values.filter(Boolean);
    if (clean.length) lines.push(title, ...clean.map((value) => `• ${value}`), "");
  };
  appendList("EDUCATION", resume.education);
  appendList("CERTIFICATIONS", resume.certifications);
  return lines.join("\n").trim();
}

export function getAtsChecks(resume: ResumeData) {
  const text = resumeToText(resume);
  const hasStandardSections = Boolean(resume.contact.name && resume.summary && resume.skills.length && (resume.experience.some((item) => item.role || item.company) || resume.projects.some((item) => item.name)));
  return [
    { label: "Standard section headers", pass: hasStandardSections, fix: "Add your name, summary, skills, and at least one experience or project." },
    { label: "Readable contact details", pass: Boolean(resume.contact.email || resume.contact.phone), fix: "Add an email address or phone number." },
    { label: "ATS-friendly layout", pass: resume.template !== "modern", fix: "Use ATS-safe classic, Cloud / DevOps, or Data / Backend for the safest parsing." },
    { label: "Standard characters and fonts", pass: !/[^\x00-\x7F]/.test(text), fix: "Replace unusual symbols with plain punctuation where possible." },
    { label: "Focused length", pass: text.length < 8500, fix: "Trim older bullets or use fewer projects to keep the resume concise." },
  ];
}