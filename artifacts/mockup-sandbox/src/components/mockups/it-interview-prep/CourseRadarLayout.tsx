import { useMemo, useState } from "react";
import {
  ArrowUpRight,
  BarChart3,
  BookOpen,
  ChevronDown,
  Code2,
  Command,
  Compass,
  Database,
  Layers3,
  LifeBuoy,
  Medal,
  Search,
  ShieldCheck,
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
  { name: "AWS", category: "Cloud", accent: "#f0a35c", icon: Layers3, description: "Core services, architecture, and the trade-offs interviewers probe.", questions: 28, level: "Intermediate", progress: 64 },
  { name: "React", category: "Frontend", accent: "#5be3d8", icon: Code2, description: "Patterns, rendering, state, and the sharp edges of modern React.", questions: 24, level: "Advanced", progress: 38 },
  { name: "Java", category: "Languages", accent: "#f0b84f", icon: Code2, description: "Collections, concurrency, JVM fundamentals, and clean design.", questions: 31, level: "Intermediate", progress: 82 },
  { name: "PostgreSQL", category: "Databases", accent: "#6fd3f0", icon: Database, description: "Query planning, indexes, transactions, and data modeling.", questions: 22, level: "Intermediate", progress: 17 },
  { name: "Kubernetes", category: "DevOps", accent: "#8f7bf0", icon: Zap, description: "Deployments, networking, observability, and production recovery.", questions: 26, level: "Advanced", progress: 0 },
  { name: "Python", category: "Languages", accent: "#5be3d8", icon: Code2, description: "Language fluency, async work, testing, and pragmatic architecture.", questions: 29, level: "Beginner", progress: 51 },
];

const NAV_ITEMS = [
  { label: "Courses", icon: Compass },
  { label: "Leaderboard", icon: Trophy },
  { label: "Challenge", icon: Zap },
  { label: "Code Lab", icon: Code2 },
];

export function CourseRadarLayout() {
  const [query, setQuery] = useState("");
  const [activeNav, setActiveNav] = useState("Courses");
  const [selected, setSelected] = useState<Course | null>(null);
  const [timed, setTimed] = useState(false);
  const [category, setCategory] = useState("All topics");

  const categories = ["All topics", ...Array.from(new Set(COURSES.map((course) => course.category)))];
  const filtered = useMemo(
    () =>
      COURSES.filter((course) => category === "All topics" || course.category === category).filter((course) =>
        `${course.name} ${course.category} ${course.description}`.toLowerCase().includes(query.toLowerCase()),
      ),
    [category, query],
  );

  return (
    <main className="radar-shell">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Mono:wght@400;500&family=Manrope:wght@400;500;600;700;800&display=swap');
        .radar-shell { --bg:#070b18; --panel:#0d1427; --panel2:#111b32; --line:rgba(174,193,255,.13); --text:#edf1ff; --muted:#8591b1; --teal:#5be3d8; --violet:#8f7bf0; min-height:100vh; color:var(--text); background:radial-gradient(900px 550px at 74% -10%,rgba(91,227,216,.13),transparent 65%),radial-gradient(800px 620px at 35% 100%,rgba(143,123,240,.12),transparent 68%),var(--bg); font-family:'Manrope',sans-serif; display:flex; overflow:hidden; }
        .radar-shell * { box-sizing:border-box; }
        .radar-rail { width:250px; flex:0 0 250px; min-height:100vh; background:rgba(10,16,34,.74); border-right:1px solid var(--line); padding:28px 18px; display:flex; flex-direction:column; }
        .radar-brand { display:flex; align-items:center; gap:11px; padding:0 12px 42px; color:var(--text); font-weight:800; letter-spacing:-.04em; font-size:17px; }
        .radar-mark { width:33px;height:33px;border-radius:10px;background:linear-gradient(140deg,rgba(143,123,240,.35),rgba(91,227,216,.14));border:1px solid rgba(174,193,255,.24);color:var(--teal);display:grid;place-items:center;font:500 12px 'DM Mono'; }
        .radar-brand em { color:var(--teal); font-style:normal; }
        .radar-caption { color:#53617f; text-transform:uppercase; letter-spacing:.16em; font:500 10px 'DM Mono'; padding:0 13px 12px; }
        .radar-nav { display:flex; flex-direction:column; gap:5px; }
        .radar-nav button { border:0;background:transparent;color:var(--muted);display:flex;align-items:center;gap:12px;padding:12px 13px;border-radius:10px;font:600 13px 'Manrope';text-align:left;cursor:pointer;transition:all .2s; }
        .radar-nav button:hover { color:var(--text);background:rgba(255,255,255,.04); }
        .radar-nav button.active { color:var(--teal);background:rgba(91,227,216,.09);box-shadow:inset 2px 0 var(--teal); }
        .radar-rail-bottom { margin-top:auto; border-top:1px solid var(--line); padding:19px 12px 0; }
        .radar-streak { display:flex;gap:10px;align-items:center;color:var(--muted);font-size:12px;line-height:1.45; }
        .radar-streak strong { display:block;color:var(--text);font-size:13px; }
        .radar-help { margin-top:25px; display:flex; align-items:center; gap:9px; color:#667292; font-size:12px; cursor:pointer; }
        .radar-main { flex:1; min-width:0; padding:30px clamp(24px,4vw,64px) 64px; overflow:auto; }
        .radar-topbar { display:flex;align-items:center;justify-content:space-between;gap:20px;margin-bottom:44px; }
        .radar-breadcrumb { color:var(--muted);font:400 11px 'DM Mono';letter-spacing:.05em; }
        .radar-breadcrumb b { color:var(--teal); font-weight:400; }
        .radar-profile { display:flex;align-items:center;gap:10px;font-size:12px;color:var(--muted); }
        .radar-avatar { width:30px;height:30px;border-radius:50%;background:linear-gradient(135deg,#2c3662,#5be3d8);display:grid;place-items:center;color:#071019;font-weight:800;font-size:11px; }
        .radar-hero { display:grid;grid-template-columns:minmax(0,1.1fr) minmax(290px,.9fr);gap:44px;align-items:end;margin-bottom:40px; }
        .radar-eyebrow { color:var(--teal);font:500 11px 'DM Mono';letter-spacing:.15em;text-transform:uppercase;display:flex;align-items:center;gap:8px;margin-bottom:18px; }
        .radar-eyebrow:before { content:'';width:24px;height:1px;background:var(--teal); }
        .radar-title { font-size:clamp(34px,4.4vw,63px);line-height:1.01;letter-spacing:-.065em;margin:0 0 19px;max-width:650px; }
        .radar-title span { color:var(--teal); }
        .radar-sub { color:var(--muted);font-size:15px;line-height:1.7;max-width:520px;margin:0; }
        .radar-hero-card { background:linear-gradient(140deg,rgba(19,31,59,.92),rgba(12,20,40,.88));border:1px solid rgba(91,227,216,.22);border-radius:18px;padding:22px;position:relative;overflow:hidden; }
        .radar-hero-card:after { content:'';position:absolute;width:170px;height:170px;right:-52px;top:-74px;border-radius:50%;background:rgba(91,227,216,.16);filter:blur(35px); }
        .radar-card-kicker { display:flex;justify-content:space-between;color:var(--muted);font:400 10px 'DM Mono';text-transform:uppercase;letter-spacing:.1em; }
        .radar-focus { display:flex;gap:15px;align-items:center;margin:22px 0; }
        .radar-focus-icon { width:43px;height:43px;border-radius:12px;background:rgba(91,227,216,.11);border:1px solid rgba(91,227,216,.3);display:grid;place-items:center;color:var(--teal); }
        .radar-focus h3 { margin:0 0 4px;font-size:17px;letter-spacing:-.03em; }
        .radar-focus p { margin:0;color:var(--muted);font:11px 'DM Mono'; }
        .radar-progress { height:5px;background:rgba(255,255,255,.08);border-radius:4px;overflow:hidden; }
        .radar-progress i { display:block;width:64%;height:100%;background:linear-gradient(90deg,var(--teal),var(--violet));border-radius:inherit; }
        .radar-focus-foot { display:flex;justify-content:space-between;margin-top:12px;color:var(--muted);font:11px 'DM Mono'; }
        .radar-focus-foot b { color:var(--teal);font-weight:500; }
        .radar-toolbar { display:flex;align-items:center;justify-content:space-between;gap:15px;margin:0 0 18px;border-bottom:1px solid var(--line);padding-bottom:16px; }
        .radar-section-title { font-size:19px;letter-spacing:-.04em;margin:0; }
        .radar-count { color:#687592;font:11px 'DM Mono';margin-left:9px; }
        .radar-actions { display:flex;gap:10px;align-items:center; }
        .radar-search { display:flex;align-items:center;gap:9px;background:rgba(10,16,34,.7);border:1px solid var(--line);border-radius:9px;padding:9px 12px;width:220px; }
        .radar-search input { border:0;outline:0;background:transparent;color:var(--text);font:12px 'DM Mono';width:100%; }
        .radar-search input::placeholder { color:#53617f; }
        .radar-select { background:var(--panel);color:var(--muted);border:1px solid var(--line);border-radius:9px;padding:10px 12px;font:11px 'DM Mono';outline:0; }
        .radar-list { display:flex;flex-direction:column;gap:7px; }
        .radar-row { display:grid;grid-template-columns:38px minmax(140px,1.1fr) minmax(160px,1.7fr) 90px 92px 85px;gap:17px;align-items:center;background:rgba(13,20,39,.68);border:1px solid transparent;border-radius:12px;padding:12px 15px;transition:transform .2s,border-color .2s,background .2s; }
        .radar-row:hover { transform:translateX(5px);border-color:rgba(91,227,216,.32);background:rgba(16,27,51,.9); }
        .radar-icon { width:36px;height:36px;border-radius:10px;display:grid;place-items:center;border:1px solid currentColor;background:rgba(255,255,255,.03); }
        .radar-course-name { font-size:13px;font-weight:700;letter-spacing:-.02em; }
        .radar-meta { color:var(--muted);font:10px 'DM Mono';margin-top:4px; }
        .radar-desc { color:#7885a5;font-size:11px;line-height:1.4; }
        .radar-row .radar-level { color:var(--muted);font:10px 'DM Mono'; }
        .radar-row .radar-questions { color:#bac4de;font:11px 'DM Mono'; }
        .radar-launch { border:1px solid rgba(91,227,216,.32);background:rgba(91,227,216,.07);color:var(--teal);border-radius:7px;padding:7px 9px;font:500 10px 'DM Mono';cursor:pointer;white-space:nowrap; }
        .radar-launch:hover { background:var(--teal);color:#071019; }
        .radar-modal { position:fixed;inset:0;background:rgba(4,7,17,.72);backdrop-filter:blur(8px);display:grid;place-items:center;z-index:10;padding:20px; }
        .radar-modal-card { width:min(430px,100%);background:#101a31;border:1px solid rgba(91,227,216,.3);border-radius:18px;padding:25px;box-shadow:0 25px 80px rgba(0,0,0,.45); }
        .radar-modal-card header { display:flex;justify-content:space-between;align-items:flex-start; }
        .radar-modal-card h2 { margin:0;font-size:24px;letter-spacing:-.05em; }
        .radar-close { background:transparent;border:0;color:var(--muted);cursor:pointer; }
        .radar-modal-card p { color:var(--muted);font-size:13px;line-height:1.6; }
        .radar-mode { display:flex;align-items:center;justify-content:space-between;background:rgba(255,255,255,.04);padding:13px;border-radius:10px;color:var(--muted);font-size:12px; }
        .radar-mode button { width:38px;height:21px;background:#3c496b;border:0;border-radius:20px;padding:3px;cursor:pointer; }
        .radar-mode button i { display:block;width:15px;height:15px;border-radius:50%;background:#c2cbe0;transition:transform .2s; }
        .radar-mode button.on { background:var(--teal); }.radar-mode button.on i { transform:translateX(17px);background:#071019; }
        .radar-start { width:100%;margin-top:17px;padding:13px;border:0;border-radius:10px;background:var(--teal);color:#071019;font-weight:800;cursor:pointer; }
        @media (max-width:900px) { .radar-rail{width:76px;flex-basis:76px;padding:22px 10px}.radar-brand{padding:0 8px 42px}.radar-brand span,.radar-caption,.radar-nav button span,.radar-rail-bottom{display:none}.radar-nav button{justify-content:center}.radar-main{padding:25px 22px 48px}.radar-row{grid-template-columns:38px minmax(120px,1fr) 90px 80px}.radar-desc{display:none}.radar-row .radar-level{display:none} }
        @media (max-width:650px) { .radar-shell{display:block;overflow:auto}.radar-rail{width:100%;min-height:0;height:66px;flex-direction:row;padding:10px 14px;border-right:0;border-bottom:1px solid var(--line);align-items:center}.radar-brand{padding:0;margin-right:auto}.radar-nav{flex-direction:row}.radar-nav button{padding:9px}.radar-nav button span,.radar-brand span{display:none}.radar-nav button svg{width:17px}.radar-rail-bottom{display:none}.radar-topbar{margin-bottom:30px}.radar-profile{display:none}.radar-hero{display:flex;flex-direction:column;gap:22px;align-items:stretch}.radar-title{font-size:42px}.radar-toolbar{align-items:flex-start;flex-direction:column}.radar-actions{width:100%}.radar-search{flex:1;width:auto}.radar-row{grid-template-columns:34px minmax(100px,1fr) 64px;padding:10px;gap:10px}.radar-questions{display:none}.radar-launch{padding:7px 6px}.radar-main{padding:24px 16px 42px} }
      `}</style>
      <aside className="radar-rail">
        <div className="radar-brand"><div className="radar-mark">&gt;_</div><span>TechInterview<em>Prep</em></span></div>
        <div className="radar-caption">Workspace</div>
        <nav className="radar-nav">
          {NAV_ITEMS.map(({ label, icon: Icon }) => <button key={label} className={activeNav === label ? "active" : ""} onClick={() => setActiveNav(label)}><Icon size={17} /><span>{label}</span></button>)}
        </nav>
        <div className="radar-rail-bottom">
          <div className="radar-streak"><Medal size={18} color="#f0b84f" /><div><strong>4 day streak</strong>Keep your edge warm</div></div>
          <div className="radar-help"><LifeBuoy size={15} /> Need a hand?</div>
        </div>
      </aside>
      <section className="radar-main">
        <div className="radar-topbar"><div className="radar-breadcrumb">WORKSPACE / <b>{activeNav.toUpperCase()}</b></div><div className="radar-profile"><span>Alex Morgan</span><div className="radar-avatar">AM</div><ChevronDown size={14} /></div></div>
        <div className="radar-hero">
          <div><div className="radar-eyebrow">Technical interview platform</div><h1 className="radar-title">Find the gap.<br /><span>Close the gap.</span></h1><p className="radar-sub">A focused practice room for the questions that decide technical interviews. Pick a lane, set the pressure, and see what sticks.</p></div>
          <div className="radar-hero-card"><div className="radar-card-kicker"><span>Continue training</span><BarChart3 size={14} /></div><div className="radar-focus"><div className="radar-focus-icon"><BookOpen size={19} /></div><div><h3>React patterns</h3><p>12 questions remaining</p></div></div><div className="radar-progress"><i /></div><div className="radar-focus-foot"><span>64% complete</span><b>Resume →</b></div></div>
        </div>
        <div className="radar-toolbar"><div><h2 className="radar-section-title">Explore courses <span className="radar-count">{filtered.length} available</span></h2></div><div className="radar-actions"><label className="radar-search"><Search size={14} color="#687592" /><input aria-label="Search courses" placeholder="Search topics..." value={query} onChange={(e) => setQuery(e.target.value)} />{query && <X size={13} color="#687592" onClick={() => setQuery("")} />}</label><select className="radar-select" value={category} onChange={(e) => setCategory(e.target.value)}>{categories.map((item) => <option key={item}>{item}</option>)}</select></div></div>
        <div className="radar-list">{filtered.map((course) => { const Icon = course.icon; return <article className="radar-row" key={course.name}><div className="radar-icon" style={{ color: course.accent }}><Icon size={17} /></div><div><div className="radar-course-name">{course.name}</div><div className="radar-meta">{course.category} · {course.progress ? `${course.progress}% practiced` : "Not started"}</div></div><div className="radar-desc">{course.description}</div><div className="radar-level">{course.level}</div><div className="radar-questions">{course.questions} questions</div><button className="radar-launch" onClick={() => setSelected(course)}>Start <ArrowUpRight size={12} style={{ verticalAlign: "middle" }} /></button></article>; })}</div>
        {filtered.length === 0 && <div style={{ color: "var(--muted)", padding: "42px 10px", textAlign: "center", fontFamily: "'DM Mono'" }}>No topics match that search. Try a broader signal.</div>}
      </section>
      {selected && <div className="radar-modal" role="dialog" aria-modal="true"><div className="radar-modal-card"><header><div><div className="radar-eyebrow">Ready when you are</div><h2>{selected.name}</h2></div><button className="radar-close" onClick={() => setSelected(null)} aria-label="Close"><X size={19} /></button></header><p>{selected.description} Choose your mode before the first question lands.</p><div className="radar-mode"><span><Timer size={14} style={{ verticalAlign: "middle", marginRight: 7 }} />Timed mode</span><button className={timed ? "on" : ""} onClick={() => setTimed(!timed)} aria-label="Toggle timed mode"><i /></button></div><button className="radar-start" onClick={() => setSelected(null)}>Enter {selected.name} practice →</button></div></div>}
    </main>
  );
}

export default CourseRadarLayout;