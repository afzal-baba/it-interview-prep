import type { ResumeData } from "@/lib/resume";
import { BasicSections, Contact } from "./template-utils";
export default function GrayTimeline({ data }: { data: ResumeData }) {
  return <div className="resume-template gray-timeline"><div className="timeline-head"><h1>{data.contact.name || "Your Name"}</h1><Contact data={data} /><p>{data.summary}</p></div><div className="timeline"><h2>Experience</h2>{data.experience.filter((item) => item.role || item.company).map((item) => <div className="timeline-item" key={item.id}><time>{item.dates}</time><article><h3>{item.role}</h3><b>{item.company}</b>{item.bullets.map((bullet, i) => <p key={i}>• {bullet}</p>)}</article></div>)}</div><section><h2>Skills</h2><p>{data.skills.join(" · ")}</p></section><BasicSections data={data} /></div>;
}