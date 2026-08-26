import type { ResumeData, ResumeExperience } from "@/lib/resume";

export const cleanExperience = (data: ResumeData) => data.experience.filter((item) => item.role || item.company);
export const contactText = (data: ResumeData) => [data.contact.email, data.contact.phone, data.contact.location, data.contact.website].filter(Boolean).join(" · ");
export function Contact({ data }: { data: ResumeData }) {
  return <div className="resume-contact">{contactText(data)}</div>;
}
export function ExperienceList({ items, className = "" }: { items: ResumeExperience[]; className?: string }) {
  return <div className={className}>{items.map((item) => <div key={item.id}><strong>{item.role || "Role"}{item.company && ` — ${item.company}`}</strong>{item.dates && <small>{item.dates}</small>}{item.bullets.filter(Boolean).map((bullet, i) => <div key={i}>• {bullet}</div>)}</div>)}</div>;
}
export function BasicSections({ data }: { data: ResumeData }) {
  return <><section><h2>Projects</h2>{data.projects.filter((item) => item.name || item.description).map((item) => <div key={item.id}><strong>{item.name}</strong>{item.technologies && <small>{item.technologies}</small>}<p>{item.description}</p></div>)}</section><section><h2>Education</h2>{data.education.filter(Boolean).map((item, i) => <div key={i}>{item}</div>)}</section><section><h2>Certifications</h2>{data.certifications.filter(Boolean).map((item, i) => <div key={i}>{item}</div>)}</section></>;
}