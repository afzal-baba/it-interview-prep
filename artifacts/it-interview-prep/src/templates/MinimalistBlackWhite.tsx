import type { ResumeData } from "@/lib/resume";
import { BasicSections, Contact, ExperienceList } from "./template-utils";
export default function MinimalistBlackWhite({ data }: { data: ResumeData }) {
  return <div className="resume-template minimalist-black-white"><header><h1>{data.contact.name || "Your Name"}</h1><p>{data.contact.role || "Target role"}</p></header><div className="flex"><aside><h2>Contact</h2><Contact data={data} /><h2>Skills</h2><ul>{data.skills.map((skill) => <li key={skill}>{skill}</li>)}</ul></aside><main><h2>Profile</h2><p>{data.summary}</p><h2>Experience</h2><ExperienceList items={data.experience.filter((item) => item.role || item.company)} /><BasicSections data={data} /></main></div></div>;
}