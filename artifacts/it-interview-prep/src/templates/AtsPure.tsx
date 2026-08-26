import type { ResumeData } from "@/lib/resume";
import { BasicSections, Contact, ExperienceList } from "./template-utils";
export default function AtsPure({ data }: { data: ResumeData }) {
  return <div className="resume-template ats-pure"><h1>{data.contact.name || "Your Name"}</h1><div className="contact-center"><Contact data={data} /></div><p>{data.contact.role}</p><hr /><h2>Professional Summary</h2><p>{data.summary}</p><hr /><h2>Core Skills</h2><p>{data.skills.join(", ")}</p><hr /><h2>Professional Experience</h2><ExperienceList items={data.experience.filter((item) => item.role || item.company)} /><BasicSections data={data} /></div>;
}