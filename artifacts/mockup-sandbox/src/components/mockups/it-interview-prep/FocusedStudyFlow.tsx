import { useMemo, useState } from "react";
import {
  ArrowRight,
  BookOpen,
  Check,
  ChevronDown,
  Clock3,
  Code2,
  Database,
  Layers3,
  Play,
  Search,
  Sparkles,
  Timer,
  Trophy,
  X,
  Zap,
} from "lucide-react";

type Course = {
  name: string;
  category: string;
  accent: string;
  icon: typeof Code2;
  description: string;
  questions: number;
  level: string;
  progress: number;
};

const COURSES: Course[] = [
  { name: "AWS", category: "Cloud", accent: "#f0a35c", icon: Layers3, description: "Architecture, services, and trade-offs.", questions: 28, level: "Intermediate", progress: 64 },
  { name: "React", category: "Frontend", accent: "#56d9d0", icon: Code2, description: "Rendering, state, and sharp edges.", questions: 24, level: "Advanced", progress: 38 },
  { name: "Java", category: "Languages", accent: "#efb84e", icon: Code2, description: "Collections, concurrency, and clean design.", questions: 31, level: "Intermediate", progress: 82 },
  { name: "PostgreSQL", category: "Databases", accent: "#6fcbe9", icon: Database, description: "Indexes, transactions, and data modeling.", questions: 22, level: "Intermediate", progress: 17 },
  { name: "Kubernetes", category: "DevOps", accent: "#907fee", icon: Zap, description: "Deployments, networking, and recovery.", questions: 26, level: "Advanced", progress: 0 },
  { name: "Python", category: "Languages", accent: "#56d9d0", icon: Code2, description: "Async work, testing, and architecture.", questions: 29, level: "Beginner", progress: 51 },
];

export function FocusedStudyFlow() {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("All topics");
  const [selected, setSelected] = useState<Course | null>(null);
  const [timed, setTimed] = useState(false);
  const [nav, setNav] = useState("Study");
  const categories = ["All topics", ...Array.from(new Set(COURSES.map((course) => course.category)))];
  const filtered = useMemo(() => COURSES.filter((course) => (category === "All topics" || course.category === category) && `${course.name} ${course.category} ${course.description}`.toLowerCase().includes(query.toLowerCase())), [category, query]);

  return (
    <main className="flow-shell">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Mono:wght@400;500&family=Manrope:wght@400;500;600;700;800&display=swap');
        .flow-shell{--bg:#090d18;--panel:#111827;--panel2:#151f32;--line:rgba(174,193,255,.14);--text:#edf1ff;--muted:#8793b3;--teal:#59dfd4;--violet:#9b89f4;min-height:100vh;background:radial-gradient(650px 430px at 74% 0%,rgba(89,223,212,.14),transparent 70%),radial-gradient(700px 500px at 10% 64%,rgba(155,137,244,.11),transparent 70%),var(--bg);color:var(--text);font-family:'Manrope',sans-serif;padding:26px clamp(18px,5vw,78px) 74px;position:relative;overflow:hidden}.flow-shell *{box-sizing:border-box}.flow-shell:after{content:'';position:absolute;inset:0;pointer-events:none;opacity:.035;background-image:radial-gradient(#fff 1px,transparent 1px);background-size:5px 5px;mask-image:linear-gradient(to bottom,black,transparent 80%)}
        .flow-header,.flow-content{max-width:1040px;margin:auto;position:relative;z-index:1}.flow-header{display:flex;align-items:center;justify-content:space-between;border-bottom:1px solid var(--line);padding-bottom:20px}.flow-brand{display:flex;gap:10px;align-items:center;font-weight:800;letter-spacing:-.05em}.flow-mark{width:31px;height:31px;border:1px solid rgba(89,223,212,.4);border-radius:9px;display:grid;place-items:center;color:var(--teal);font:500 11px 'DM Mono';background:rgba(89,223,212,.08)}.flow-brand em{font-style:normal;color:var(--teal)}.flow-nav{display:flex;gap:5px}.flow-nav button{border:0;background:transparent;color:var(--muted);padding:8px 12px;border-radius:8px;font:500 11px 'DM Mono';cursor:pointer}.flow-nav button.active{color:var(--teal);background:rgba(89,223,212,.09)}.flow-user{display:flex;align-items:center;gap:9px;color:var(--muted);font-size:11px}.flow-avatar{display:grid;place-items:center;width:29px;height:29px;border-radius:50%;background:linear-gradient(135deg,#354573,#59dfd4);color:#081018;font-size:10px;font-weight:800}
        .flow-progress{display:flex;align-items:center;gap:11px;color:#65718f;font:10px 'DM Mono';margin-top:33px}.flow-progress-line{height:2px;width:100px;background:rgba(255,255,255,.1)}.flow-progress-line i{display:block;width:64%;height:100%;background:var(--teal)}.flow-step{color:var(--teal)}.flow-hero{padding:28px 0 30px;max-width:770px}.flow-eyebrow{color:var(--teal);font:500 10px 'DM Mono';text-transform:uppercase;letter-spacing:.16em;display:flex;gap:8px;align-items:center;margin-bottom:16px}.flow-eyebrow:before{content:'';width:21px;height:1px;background:var(--teal)}.flow-title{font-size:clamp(38px,6vw,72px);line-height:.98;letter-spacing:-.075em;margin:0 0 17px}.flow-title span{color:var(--teal)}.flow-sub{color:var(--muted);font-size:14px;line-height:1.7;max-width:550px;margin:0}.flow-focus{display:grid;grid-template-columns:minmax(0,1fr) 250px;gap:24px;align-items:stretch;background:linear-gradient(115deg,rgba(23,38,65,.93),rgba(14,23,42,.86));border:1px solid rgba(89,223,212,.25);border-radius:18px;padding:23px;box-shadow:0 16px 50px rgba(0,0,0,.18);margin-bottom:42px}.flow-focus-main{display:flex;flex-direction:column;justify-content:space-between}.flow-kicker{display:flex;justify-content:space-between;color:#8b98b7;font:10px 'DM Mono';text-transform:uppercase;letter-spacing:.1em}.flow-focus-info{display:flex;align-items:center;gap:14px;margin:27px 0 22px}.flow-focus-icon{width:48px;height:48px;border-radius:13px;background:rgba(89,223,212,.11);border:1px solid rgba(89,223,212,.3);color:var(--teal);display:grid;place-items:center}.flow-focus h2{font-size:22px;letter-spacing:-.05em;margin:0 0 5px}.flow-focus p{font:11px 'DM Mono';color:var(--muted);margin:0}.flow-bar{height:5px;background:rgba(255,255,255,.08);border-radius:4px;overflow:hidden}.flow-bar i{display:block;width:64%;height:100%;background:linear-gradient(90deg,var(--teal),var(--violet));border-radius:4px}.flow-foot{display:flex;justify-content:space-between;color:var(--muted);font:10px 'DM Mono';margin-top:11px}.flow-foot b{color:var(--teal);font-weight:500}.flow-focus-side{border-left:1px solid var(--line);padding-left:23px;display:flex;flex-direction:column;justify-content:center;gap:11px}.flow-stat{color:var(--muted);font:10px 'DM Mono';line-height:1.5}.flow-stat strong{display:block;color:var(--text);font:700 21px 'Manrope';letter-spacing:-.06em}.flow-resume{border:0;border-radius:9px;padding:11px 13px;background:var(--teal);color:#071019;font-size:11px;font-weight:800;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:8px;margin-top:5px}.flow-section-head{display:flex;align-items:end;justify-content:space-between;border-bottom:1px solid var(--line);padding-bottom:15px;margin-bottom:12px}.flow-section-head h2{font-size:19px;letter-spacing:-.05em;margin:0}.flow-count{color:#697693;font:10px 'DM Mono';margin-left:9px}.flow-controls{display:flex;gap:8px}.flow-search{display:flex;gap:8px;align-items:center;border:1px solid var(--line);background:rgba(10,15,29,.7);border-radius:8px;padding:9px 11px;width:210px}.flow-search input{width:100%;background:transparent;border:0;outline:0;color:var(--text);font:11px 'DM Mono'}.flow-search input::placeholder{color:#5c6987}.flow-select{border:1px solid var(--line);border-radius:8px;background:var(--panel);color:var(--muted);font:10px 'DM Mono';padding:0 9px;outline:0}.flow-list{display:flex;flex-direction:column;gap:7px}.flow-row{display:grid;grid-template-columns:39px minmax(135px,1fr) minmax(180px,1.5fr) 94px 80px 73px;align-items:center;gap:15px;border:1px solid transparent;border-radius:11px;background:rgba(17,24,39,.7);padding:11px 13px;transition:transform .2s,border-color .2s,background .2s}.flow-row:hover{transform:translateX(5px);border-color:rgba(89,223,212,.28);background:rgba(21,32,53,.92)}.flow-icon{width:35px;height:35px;border-radius:9px;display:grid;place-items:center;border:1px solid currentColor;background:rgba(255,255,255,.03)}.flow-name{font-size:12px;font-weight:700}.flow-meta,.flow-level,.flow-questions{color:var(--muted);font:10px 'DM Mono';margin-top:4px}.flow-desc{color:#7d89a7;font-size:10px;line-height:1.4}.flow-launch{border:1px solid rgba(89,223,212,.35);background:rgba(89,223,212,.06);color:var(--teal);border-radius:7px;padding:7px 8px;font:500 10px 'DM Mono';cursor:pointer}.flow-launch:hover{background:var(--teal);color:#071019}.flow-empty{padding:38px;text-align:center;color:var(--muted);font:11px 'DM Mono'}.flow-modal{position:fixed;inset:0;background:rgba(4,7,17,.75);backdrop-filter:blur(8px);display:grid;place-items:center;z-index:5;padding:20px}.flow-modal-card{width:min(420px,100%);background:#121d34;border:1px solid rgba(89,223,212,.3);border-radius:17px;padding:24px;box-shadow:0 25px 80px rgba(0,0,0,.45)}.flow-modal-card header{display:flex;justify-content:space-between}.flow-modal-card h2{font-size:24px;letter-spacing:-.06em;margin:0}.flow-close{border:0;background:transparent;color:var(--muted);cursor:pointer}.flow-modal-card p{color:var(--muted);font-size:12px;line-height:1.6}.flow-mode{display:flex;justify-content:space-between;align-items:center;background:rgba(255,255,255,.04);border-radius:9px;padding:12px;color:var(--muted);font-size:11px}.flow-mode button{width:37px;height:21px;border:0;border-radius:20px;background:#3c496b;padding:3px;cursor:pointer}.flow-mode button i{display:block;width:15px;height:15px;border-radius:50%;background:#c2cbe0;transition:transform .2s}.flow-mode button.on{background:var(--teal)}.flow-mode button.on i{transform:translateX(16px);background:#071019}.flow-start{width:100%;margin-top:17px;border:0;border-radius:9px;padding:12px;background:var(--teal);font-weight:800;color:#071019;cursor:pointer}
        @media(max-width:760px){.flow-shell{padding:18px 15px 50px}.flow-nav{display:none}.flow-user span{display:none}.flow-focus{grid-template-columns:1fr;gap:20px}.flow-focus-side{border-left:0;border-top:1px solid var(--line);padding:17px 0 0;flex-direction:row;align-items:center}.flow-stat{flex:1}.flow-resume{margin-top:0}.flow-section-head{align-items:flex-start;flex-direction:column;gap:13px}.flow-controls{width:100%}.flow-search{flex:1;width:auto}.flow-select{min-width:105px}.flow-row{grid-template-columns:34px 1fr 72px;padding:10px;gap:10px}.flow-desc,.flow-level,.flow-questions{display:none}.flow-launch{padding:7px 6px}}
      `}</style>
      <header className="flow-header">
        <div className="flow-brand"><div className="flow-mark">&gt;_</div><span>TechInterview<em>Prep</em></span></div>
        <nav className="flow-nav">{["Study", "Leaderboard", "Code Lab"].map((item) => <button key={item} className={nav === item ? "active" : ""} onClick={() => setNav(item)}>{item}</button>)}</nav>
        <div className="flow-user"><span>Alex Morgan</span><div className="flow-avatar">AM</div><ChevronDown size={13} /></div>
      </header>
      <div className="flow-content">
        <div className="flow-progress"><span className="flow-step">01</span><div className="flow-progress-line"><i /></div><span>YOUR STUDY PATH</span><span style={{ marginLeft: "auto" }}>4 day streak <Trophy size={12} style={{ verticalAlign: "middle", marginLeft: 4, color: "#efb84e" }} /></span></div>
        <section className="flow-hero"><div className="flow-eyebrow">Technical interview platform</div><h1 className="flow-title">Make your next<br /><span>answer obvious.</span></h1><p className="flow-sub">One clear path through the questions that decide technical interviews. Continue where you left off, or choose a new lane below.</p></section>
        <section className="flow-focus">
          <div className="flow-focus-main"><div className="flow-kicker"><span>Continue training</span><span><Sparkles size={13} style={{ verticalAlign: "middle" }} /> Recommended for you</span></div><div className="flow-focus-info"><div className="flow-focus-icon"><BookOpen size={21} /></div><div><h2>React patterns</h2><p>12 questions remaining · Advanced</p></div></div><div className="flow-bar"><i /></div><div className="flow-foot"><span>64% complete</span><b>Last studied 2 days ago</b></div></div>
          <div className="flow-focus-side"><div className="flow-stat"><strong>18 min</strong>estimated session</div><div className="flow-stat"><strong>12</strong>questions to finish</div><button className="flow-resume" onClick={() => setSelected(COURSES[1])}><Play size={13} fill="currentColor" /> Resume session</button></div>
        </section>
        <section><div className="flow-section-head"><h2>Choose your next lane <span className="flow-count">{filtered.length} available</span></h2><div className="flow-controls"><label className="flow-search"><Search size={13} color="#697693" /><input aria-label="Search courses" placeholder="Search topics..." value={query} onChange={(e) => setQuery(e.target.value)} />{query && <X size={12} color="#697693" onClick={() => setQuery("")} />}</label><select className="flow-select" value={category} onChange={(e) => setCategory(e.target.value)}>{categories.map((item) => <option key={item}>{item}</option>)}</select></div></div>
          <div className="flow-list">{filtered.map((course) => { const Icon = course.icon; return <article className="flow-row" key={course.name}><div className="flow-icon" style={{ color: course.accent }}><Icon size={16} /></div><div><div className="flow-name">{course.name}</div><div className="flow-meta">{course.category} · {course.progress ? `${course.progress}% practiced` : "Not started"}</div></div><div className="flow-desc">{course.description}</div><div className="flow-level">{course.level}</div><div className="flow-questions">{course.questions} questions</div><button className="flow-launch" onClick={() => setSelected(course)}>Start <ArrowRight size={11} style={{ verticalAlign: "middle" }} /></button></article>; })}</div>
          {!filtered.length && <div className="flow-empty">No topics match that search. Try a broader signal.</div>}
        </section>
      </div>
      {selected && <div className="flow-modal" role="dialog" aria-modal="true"><div className="flow-modal-card"><header><div><div className="flow-eyebrow">Ready when you are</div><h2>{selected.name}</h2></div><button className="flow-close" onClick={() => setSelected(null)} aria-label="Close"><X size={18} /></button></header><p>{selected.description} Choose your mode before the first question lands.</p><div className="flow-mode"><span><Timer size={13} style={{ verticalAlign: "middle", marginRight: 7 }} />Timed mode</span><button className={timed ? "on" : ""} onClick={() => setTimed(!timed)} aria-label="Toggle timed mode"><i /></button></div><button className="flow-start" onClick={() => setSelected(null)}><Check size={14} style={{ verticalAlign: "middle", marginRight: 6 }} />Enter {selected.name} practice</button></div></div>}
    </main>
  );
}

export default FocusedStudyFlow;