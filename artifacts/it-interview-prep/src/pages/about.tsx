import { useEffect } from "react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import {
  Terminal, BookOpen, Trophy, Swords, Timer, Zap, Users, Star, CheckCircle2, Code2,
} from "lucide-react";
import { TOTAL_COURSES, TOTAL_QUESTIONS_DISPLAY, QUESTIONS_PER_COURSE } from "@/lib/platform-stats";

const COURSES = [
  "Oracle DB", "SAP", "Java", "Python", "AWS", "Linux",
  "Docker & Kubernetes", "JavaScript", "Cybersecurity", "SQL",
  "Networking", "Azure", "Git", "Terraform", "CI/CD & DevOps",
  "SRE & Observability", "Ansible", "GCP", "TypeScript", "Bash & Shell Scripting",
];

const FEATURES = [
  {
    icon: <BookOpen size={24} />,
    title: `${TOTAL_QUESTIONS_DISPLAY} Hand-Crafted Questions`,
    desc: `${QUESTIONS_PER_COURSE} questions per course across Beginner, Intermediate, and Advanced tiers — all written by practising engineers.`,
  },
  {
    icon: <Timer size={24} />,
    title: "Timed Mode",
    desc: "30 seconds per question with speed bonuses. Train under real interview pressure and build that instant recall.",
  },
  {
    icon: <Swords size={24} />,
    title: "Real-Time Challenge Mode",
    desc: "Race head-to-head against another player. Same questions, same clock — fastest correct answer wins each round.",
  },
  {
    icon: <Trophy size={24} />,
    title: "Badge System",
    desc: "Earn Bronze, Silver, Gold, or Platinum badges based on your score. Climb the global leaderboard.",
  },
  {
    icon: <Users size={24} />,
    title: "Live Lobby & Chat",
    desc: "See who's online in real time. Trash-talk, study together, or send a targeted challenge to a rival.",
  },
  {
    icon: <Zap size={24} />,
    title: "Instant Feedback",
    desc: "Every answer reveals an explanation immediately — so every wrong guess becomes a learning moment.",
  },
];

const BADGE_TIERS = [
  { label: "Bronze", threshold: "≥ 50%", color: "text-amber-700 bg-amber-100 border-amber-300" },
  { label: "Silver", threshold: "≥ 70%", color: "text-gray-500 bg-gray-100 border-gray-300" },
  { label: "Gold", threshold: "≥ 85%", color: "text-yellow-600 bg-yellow-50 border-yellow-300" },
  { label: "Platinum", threshold: "≥ 95%", color: "text-indigo-600 bg-indigo-50 border-indigo-300" },
];

export default function About() {
  useEffect(() => {
    document.title = `About TechInterviewPrep — ${TOTAL_QUESTIONS_DISPLAY} Questions, ${TOTAL_COURSES} Topics, Free`;
  }, []);

  return (
    <div className="w-full max-w-4xl mx-auto py-16 px-4 animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-20">

      {/* Hero */}
      <section className="text-center space-y-6">
        <div className="inline-flex items-center justify-center p-4 rounded-2xl bg-primary/10 text-primary mb-2">
          <Terminal size={40} strokeWidth={2} />
        </div>
        <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight">
          About <span className="text-primary">TechInterviewPrep</span>
        </h1>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed">
          TechInterviewPrep is a free, open practice platform built by engineers for engineers. 
          We cover {TOTAL_COURSES} technologies — from cloud infrastructure to scripting languages — 
          with real questions, instant feedback, and competitive real-time challenges to keep you sharp.
        </p>
        <div className="flex flex-wrap justify-center gap-3 pt-2">
          <Link href="/">
            <Button size="lg" className="rounded-xl px-8">Start Practicing</Button>
          </Link>
          <Link href="/race">
            <Button size="lg" variant="outline" className="rounded-xl px-8">
              <Swords className="mr-2 h-5 w-5" /> Challenge Mode
            </Button>
          </Link>
        </div>
      </section>

      {/* Stats */}
      <section className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { value: String(TOTAL_COURSES), label: "Courses" },
          { value: TOTAL_QUESTIONS_DISPLAY, label: "Questions" },
          { value: "3", label: "Difficulty Tiers" },
          { value: "∞", label: "Rematches" },
        ].map((s) => (
          <div key={s.label} className="text-center p-6 rounded-2xl border bg-card shadow-sm">
            <div className="text-4xl font-black text-primary mb-1">{s.value}</div>
            <div className="text-sm text-muted-foreground font-medium uppercase tracking-wider">{s.label}</div>
          </div>
        ))}
      </section>

      {/* Features */}
      <section>
        <h2 className="text-3xl font-extrabold tracking-tight mb-8 text-center">Everything You Need to Prepare</h2>
        <div className="grid md:grid-cols-2 gap-5">
          {FEATURES.map((f) => (
            <div key={f.title} className="flex gap-5 p-6 rounded-2xl border bg-card shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all">
              <div className="p-3 rounded-xl bg-primary/10 text-primary shrink-0 h-fit">
                {f.icon}
              </div>
              <div>
                <h3 className="font-bold text-lg mb-1">{f.title}</h3>
                <p className="text-muted-foreground text-sm leading-relaxed">{f.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Badge tiers */}
      <section>
        <h2 className="text-3xl font-extrabold tracking-tight mb-2 text-center">Badge Tiers</h2>
        <p className="text-muted-foreground text-center mb-8">Finish a quiz and earn a badge based on your percentage score.</p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {BADGE_TIERS.map((b) => (
            <div key={b.label} className={`text-center p-6 rounded-2xl border-2 ${b.color}`}>
              <Star className="mx-auto mb-2" size={28} />
              <div className="font-bold text-xl">{b.label}</div>
              <div className="text-sm font-mono font-medium mt-1">{b.threshold}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Courses list */}
      <section>
        <h2 className="text-3xl font-extrabold tracking-tight mb-2 text-center">All {TOTAL_COURSES} Courses</h2>
        <p className="text-muted-foreground text-center mb-8">Each course has {QUESTIONS_PER_COURSE} questions split evenly across Beginner, Intermediate, and Advanced.</p>
        <div className="flex flex-wrap gap-2 justify-center">
          {COURSES.map((c) => (
            <span key={c} className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full border bg-card text-sm font-medium shadow-sm">
              <Code2 size={14} className="text-primary" /> {c}
            </span>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section>
        <h2 className="text-3xl font-extrabold tracking-tight mb-8 text-center">How It Works</h2>
        <ol className="space-y-4 max-w-2xl mx-auto">
          {[
            ["Pick a course", `Browse ${TOTAL_COURSES} technologies and select the one you're practising for.`],
            ["Choose difficulty", "Beginner, Intermediate, or Advanced — each with 10 real questions."],
            ["Answer & learn", "Every answer reveals an instant explanation to cement the concept."],
            ["Earn your badge", "Score ≥ 50% for Bronze and aim for Platinum at 95%+."],
            ["Challenge a rival", "Head to the Race Arena, see who's online, and race head-to-head."],
          ].map(([title, desc], i) => (
            <li key={title} className="flex gap-4 p-5 rounded-2xl border bg-card shadow-sm">
              <div className="w-9 h-9 rounded-full bg-primary text-white font-bold text-sm flex items-center justify-center shrink-0 mt-0.5">
                {i + 1}
              </div>
              <div>
                <div className="font-bold">{title}</div>
                <div className="text-sm text-muted-foreground mt-0.5">{desc}</div>
              </div>
            </li>
          ))}
        </ol>
      </section>

      {/* CTA */}
      <section className="text-center dark-panel rounded-3xl p-12 space-y-4">
        <CheckCircle2 size={40} className="mx-auto text-primary" />
        <h2 className="text-3xl font-extrabold text-white">Ready to level up?</h2>
        <p className="text-gray-400 max-w-md mx-auto">Join players already drilling questions and climbing the leaderboard.</p>
        <div className="flex flex-wrap justify-center gap-3 pt-2">
          <Link href="/">
            <Button size="lg" className="rounded-xl px-8">Browse Courses</Button>
          </Link>
          <Link href="/leaderboard">
            <Button size="lg" variant="outline" className="rounded-xl px-8 border-white/20 text-white hover:bg-white/10">
              View Leaderboard
            </Button>
          </Link>
        </div>
      </section>

    </div>
  );
}
