import type { ResumeData } from "@/lib/resume";
import { BasicSections, ExperienceList } from "./template-utils";
export default function GreenModern({ data }: { data: ResumeData }) {
  return <div className="resume-template green-modern"><header><h1>{data.contact.name || "Your Name"}</h1><p>{data.contact.role} · {data.contact.email} · {data.contact.phone}</p></header><div className="green-columns"><main><h2>Summary</h2><p>{data.summary}</p><h2>Experience</h2><ExperienceList items={data.experience.filter((item) => item.role || item.company)} /><BasicSections data={data} /></main><aside><h2>Skills</h2><ul>{data.skills.map((skill) => <li key={skill}>{skill}</li>)}</ul><h2>Verified</h2><p>{data.verifiedSkills.join(" · ")}</p></aside></div></div>;
}