import { useState, useMemo, useEffect, useRef } from "react";
import { useLocation } from "wouter";
import {
  useListCourses,
  useCreateSession,
  SessionInputLevel,
  type Course,
} from "@workspace/api-client-react";
import { useQuizState } from "@/lib/quiz-context";
import * as SiIcons from "react-icons/si";
import { Search, X, ArrowLeft, Timer } from "lucide-react";

// ─── Accent colors ────────────────────────────────────────────────────────────
const SLUG_ACCENT: Record<string, string> = {
  // original 20
  oracle:          "#f0748a",
  sap:             "#8f7bf0",
  java:            "#f0b84f",
  python:          "#5be3d8",
  aws:             "#f0a35c",
  linux:           "#6fd3f0",
  "docker-k8s":    "#5be3d8",
  javascript:      "#f0b84f",
  cybersecurity:   "#f0748a",
  sql:             "#8f7bf0",
  networking:      "#6fd3f0",
  azure:           "#6fd3f0",
  git:             "#f0a35c",
  terraform:       "#8f7bf0",
  cicd:            "#f0a35c",
  sre:             "#5be3d8",
  ansible:         "#f0748a",
  gcp:             "#f0b84f",
  typescript:      "#5be3d8",
  bash:            "#f0b84f",
  // new 20
  react:           "#5be3d8",
  nodejs:          "#6fd3f0",
  django:          "#5be3d8",
  "spring-boot":   "#f0b84f",
  mongodb:         "#6fd3f0",
  redis:           "#f0748a",
  postgresql:      "#6fd3f0",
  "machine-learning": "#f0b84f",
  kafka:           "#f0748a",
  elasticsearch:   "#f0a35c",
  "data-warehouse":"#5be3d8",
  virtualization:  "#6fd3f0",
  "testing-qa":    "#8f7bf0",
  graphql:         "#f0748a",
  "jira-agile":    "#f0a35c",
  fastapi:         "#5be3d8",
  rabbitmq:        "#f0748a",
  "deep-learning": "#8f7bf0",
  vault:           "#f0b84f",
  "vue-angular":   "#6fd3f0",
};
const FALLBACK = ["#f0748a","#8f7bf0","#f0b84f","#5be3d8","#f0a35c","#6fd3f0"];
const getAccent = (course: Course, idx: number) =>
  SLUG_ACCENT[course.slug] ?? FALLBACK[idx % FALLBACK.length];

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const getCourseIcon = (name: string): React.ComponentType<any> | null =>
  (SiIcons as Record<string, unknown>)[name] as React.ComponentType<any> ?? null;

// ─── NetworkCanvas ────────────────────────────────────────────────────────────
function NetworkCanvas() {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const canvas = ref.current!;
    const ctx = canvas.getContext("2d")!;
    let raf: number;
    interface Node { x: number; y: number; vx: number; vy: number; r: number }
    let nodes: Node[] = [];

    function resize() {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      const count = Math.min(90, Math.floor((canvas.width * canvas.height) / 16000));
      nodes = Array.from({ length: count }, () => ({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        vx: (Math.random() - 0.5) * 0.4,
        vy: (Math.random() - 0.5) * 0.4,
        r: Math.random() * 1.5 + 0.5,
      }));
    }

    function draw() {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const dx = nodes[i].x - nodes[j].x, dy = nodes[i].y - nodes[j].y;
          const d = Math.sqrt(dx * dx + dy * dy);
          if (d < 140) {
            ctx.beginPath();
            ctx.strokeStyle = `rgba(140,170,255,${0.15 * (1 - d / 140)})`;
            ctx.lineWidth = 0.5;
            ctx.moveTo(nodes[i].x, nodes[i].y);
            ctx.lineTo(nodes[j].x, nodes[j].y);
            ctx.stroke();
          }
        }
      }
      for (const n of nodes) {
        ctx.beginPath();
        ctx.arc(n.x, n.y, n.r, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(180,200,255,0.5)";
        ctx.fill();
        n.x += n.vx; n.y += n.vy;
        if (n.x < 0 || n.x > canvas.width)  n.vx *= -1;
        if (n.y < 0 || n.y > canvas.height) n.vy *= -1;
      }
      raf = requestAnimationFrame(draw);
    }

    resize();
    draw();
    let t: ReturnType<typeof setTimeout>;
    const onResize = () => { clearTimeout(t); t = setTimeout(resize, 200); };
    window.addEventListener("resize", onResize);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", onResize);
      clearTimeout(t);
    };
  }, []);

  return (
    <canvas
      ref={ref}
      style={{ position: "fixed", inset: 0, width: "100%", height: "100%", pointerEvents: "none", zIndex: 0 }}
    />
  );
}

// ─── ParticleCanvas ───────────────────────────────────────────────────────────
function ParticleCanvas() {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const canvas = ref.current!;
    const ctx = canvas.getContext("2d")!;
    let raf: number;
    interface P { x: number; y: number; vx: number; vy: number; life: number; maxLife: number; size: number; cyan: boolean }
    let particles: P[] = [];

    const resize = () => { canvas.width = window.innerWidth; canvas.height = window.innerHeight; };

    const spawn = (): P => ({
      x: Math.random() * canvas.width,
      y: canvas.height + 10,
      vx: (Math.random() - 0.5) * 0.8,
      vy: -(Math.random() * 1 + 0.5),
      life: 0,
      maxLife: 120 + Math.random() * 80,
      size: Math.random() * 3 + 1,
      cyan: Math.random() > 0.5,
    });

    function draw() {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      particles = particles
        .map((p) => {
          const a = Math.sin((p.life / p.maxLife) * Math.PI) * 0.45;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
          ctx.fillStyle = p.cyan ? `rgba(91,227,216,${a})` : `rgba(143,123,240,${a})`;
          ctx.fill();
          return { ...p, x: p.x + p.vx, y: p.y + p.vy, life: p.life + 1 };
        })
        .map((p) => (p.life >= p.maxLife ? spawn() : p));
      raf = requestAnimationFrame(draw);
    }

    resize();
    for (let i = 0; i < 40; i++) {
      const p = spawn();
      p.y = Math.random() * canvas.height;
      p.life = Math.random() * p.maxLife;
      particles.push(p);
    }
    draw();
    window.addEventListener("resize", resize);
    return () => { cancelAnimationFrame(raf); window.removeEventListener("resize", resize); };
  }, []);

  return (
    <canvas
      ref={ref}
      style={{ position: "fixed", inset: 0, width: "100%", height: "100%", pointerEvents: "none", zIndex: 1 }}
    />
  );
}

// ─── CursorGlow ───────────────────────────────────────────────────────────────
function CursorGlow() {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const el = ref.current!;
    let mx = 0, my = 0, px = 0, py = 0, visible = false, raf: number;
    const move = (e: MouseEvent) => {
      mx = e.clientX; my = e.clientY;
      if (!visible) { el.style.opacity = "1"; visible = true; }
    };
    const leave = () => { el.style.opacity = "0"; visible = false; };
    const animate = () => {
      px += (mx - px) * 0.1; py += (my - py) * 0.1;
      el.style.transform = `translate(${px - 120}px,${py - 120}px)`;
      raf = requestAnimationFrame(animate);
    };
    window.addEventListener("mousemove", move);
    window.addEventListener("mouseleave", leave);
    raf = requestAnimationFrame(animate);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("mousemove", move);
      window.removeEventListener("mouseleave", leave);
    };
  }, []);
  return (
    <div
      ref={ref}
      style={{
        position: "fixed", top: 0, left: 0, width: 240, height: 240, borderRadius: "50%",
        background: "radial-gradient(circle, rgba(95,120,240,0.25), transparent 70%)",
        filter: "blur(60px)", pointerEvents: "none", zIndex: 2, opacity: 0,
        transition: "opacity 0.3s",
      }}
    />
  );
}

// ─── CourseCard ───────────────────────────────────────────────────────────────
function CourseCard({
  course, accent, idx, onClick,
}: {
  course: Course; accent: string; idx: number; onClick: () => void;
}) {
  const [hovered, setHovered] = useState(false);
  const Icon = getCourseIcon(course.icon);
  const { beginner, intermediate, advanced } = course.questionCounts;
  const totalQs = beginner + intermediate + advanced;

  return (
    <div
      role="button"
      tabIndex={0}
      aria-label={`Start ${course.name}`}
      onClick={onClick}
      onKeyDown={(e) => e.key === "Enter" && onClick()}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        position: "relative",
        background: hovered ? "rgba(18,22,34,0.80)" : "var(--cin-surface)",
        backdropFilter: "blur(14px)",
        border: `1px solid ${hovered ? "transparent" : "var(--cin-border)"}`,
        padding: 28,
        borderRadius: 16,
        cursor: "pointer",
        overflow: "hidden",
        transform: hovered ? "translateY(-8px)" : "translateY(0)",
        boxShadow: hovered
          ? `0 25px 80px -20px rgba(0,0,0,0.7), inset 0 0 0 1px ${accent}50`
          : "none",
        transition: "transform 0.3s ease, box-shadow 0.3s ease, border-color 0.3s ease, background 0.3s ease",
        opacity: 0,
        animation: `cin-cardSlide 0.4s ease-out ${idx * 0.05}s both`,
        outline: "none",
      }}
    >
      {/* Glow bloom */}
      <div
        style={{
          position: "absolute", top: "-40%", left: "-40%", width: "180%", height: "180%",
          background: `radial-gradient(circle at center, ${accent} 0%, transparent 60%)`,
          filter: "blur(50px)",
          opacity: hovered ? 0.12 : 0,
          transition: "opacity 0.35s ease",
          pointerEvents: "none",
        }}
      />

      {/* Top row */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20, position: "relative", zIndex: 2 }}>
        <div
          style={{
            width: 42, height: 42, borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center",
            background: "rgba(255,255,255,0.03)", border: "1px solid var(--cin-border)",
            boxShadow: `0 0 16px ${accent}28`,
          }}
        >
          {Icon
            ? <Icon size={22} style={{ color: accent }} />
            : (
              <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 13, fontWeight: 800, color: accent }}>
                {course.name.slice(0, 2).toUpperCase()}
              </span>
            )}
        </div>
        <span
          style={{
            fontFamily: "'JetBrains Mono',monospace", fontSize: 11, color: "var(--cin-faint)",
            border: "1px solid var(--cin-border)", padding: "4px 10px", borderRadius: 20,
          }}
        >
          {totalQs} Qs
        </span>
      </div>

      {/* Title */}
      <h3
        style={{
          fontFamily: "'Inter',sans-serif", fontSize: 19, fontWeight: 700,
          letterSpacing: "-0.01em", marginBottom: 10, color: "var(--cin-text)",
          position: "relative", zIndex: 2, lineHeight: 1.3,
        }}
      >
        {course.name}
      </h3>

      {/* Description */}
      <p
        style={{
          fontSize: 13.5, lineHeight: 1.65, color: "var(--cin-dim)",
          marginBottom: 22, minHeight: 64, position: "relative", zIndex: 2,
        }}
      >
        {course.description}
      </p>

      {/* Footer */}
      <div
        style={{
          display: "flex", justifyContent: "space-between", alignItems: "center",
          fontFamily: "'JetBrains Mono',monospace", fontSize: 11.5,
          position: "relative", zIndex: 2,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 7, color: "var(--cin-faint)" }}>
          {[beginner > 0, intermediate > 0, advanced > 0].map((on, i) => (
            <span
              key={i}
              style={{
                width: 5, height: 5, borderRadius: "50%",
                background: on ? accent : "rgba(140,160,220,0.14)",
                boxShadow: on ? `0 0 8px ${accent}` : "none",
                display: "inline-block",
              }}
            />
          ))}
          <span style={{ marginLeft: 3 }}>3 levels</span>
        </div>
        <span
          style={{
            color: hovered ? accent : "var(--cin-faint)",
            transition: "color 0.2s, gap 0.2s",
            display: "flex", alignItems: "center",
            gap: hovered ? 9 : 5,
          }}
        >
          start →
        </span>
      </div>
    </div>
  );
}

// ─── Film grain data URI ──────────────────────────────────────────────────────
const GRAIN = `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='200'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E`;

// ─── Home ─────────────────────────────────────────────────────────────────────
export default function Home() {
  const { data: courses, isLoading, isError, refetch } = useListCourses({
    query: { retry: 4, retryDelay: (n) => Math.min(1000 * 2 ** n, 10000) },
  });
  const [, setLocation] = useLocation();
  const { setSession, setTimedMode } = useQuizState();
  const createSession = useCreateSession();
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [timedModeEnabled, setTimedModeEnabled] = useState(false);
  const [search, setSearch] = useState("");

  useEffect(() => {
    document.title = "IT Interview Prep — Practice Oracle, AWS, Java & 37 More Topics";
  }, []);

  const filteredCourses = useMemo(() => {
    if (!courses) return [];
    const q = search.trim().toLowerCase();
    if (!q) return courses;
    return courses.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.slug.toLowerCase().includes(q) ||
        (c.description ?? "").toLowerCase().includes(q),
    );
  }, [courses, search]);

  const handleStart = (level: SessionInputLevel) => {
    if (!selectedCourse) return;
    createSession.mutate(
      { data: { courseId: selectedCourse.id, level, timedMode: timedModeEnabled } },
      {
        onSuccess: (session) => {
          setSession(session);
          setTimedMode(timedModeEnabled);
          setLocation("/quiz");
        },
      },
    );
  };

  return (
    <>
      {/* ── Atmosphere ── */}
      <NetworkCanvas />
      <ParticleCanvas />
      <CursorGlow />

      {/* Static glow orbs */}
      <div style={{ position: "fixed", inset: 0, pointerEvents: "none", zIndex: 0, overflow: "hidden" }}>
        <div style={{ position: "absolute", top: -220, left: -160, width: 640, height: 640, borderRadius: "50%", background: "radial-gradient(circle, rgba(95,120,240,0.35), transparent 70%)", filter: "blur(110px)" }} />
        <div style={{ position: "absolute", top: -100, right: -200, width: 560, height: 560, borderRadius: "50%", background: "radial-gradient(circle, rgba(91,227,216,0.22), transparent 70%)", filter: "blur(110px)" }} />
        <div style={{ position: "absolute", bottom: -260, left: "30%", width: 700, height: 500, borderRadius: "50%", background: "radial-gradient(circle, rgba(240,116,138,0.14), transparent 70%)", filter: "blur(110px)" }} />
      </div>

      {/* Vignette */}
      <div style={{ position: "fixed", inset: 0, background: "radial-gradient(ellipse 1400px 900px at 50% 20%, transparent 40%, rgba(5,7,12,0.75) 100%)", pointerEvents: "none", zIndex: 3 }} />

      {/* Film grain */}
      <div style={{ position: "fixed", inset: 0, backgroundImage: `url("${GRAIN}")`, opacity: 0.02, mixBlendMode: "overlay", pointerEvents: "none", zIndex: 4 }} />

      {/* ── Page content ── */}
      <div style={{ position: "relative", zIndex: 5, color: "var(--cin-text)", minHeight: "calc(100vh - 75px)" }}>
        {isLoading ? (
          <div style={{ minHeight: "70vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 16 }}>
              <div style={{ width: 40, height: 40, border: "2px solid var(--cin-cyan)", borderTopColor: "transparent", borderRadius: "50%", animation: "cin-spin 0.8s linear infinite" }} />
              <p style={{ color: "var(--cin-dim)", fontFamily: "'JetBrains Mono',monospace", fontSize: 13 }}>Loading courses…</p>
            </div>
          </div>
        ) : isError ? (
          <div style={{ minHeight: "70vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 16, textAlign: "center" }}>
              <p style={{ color: "var(--cin-dim)", fontFamily: "'JetBrains Mono',monospace", fontSize: 14 }}>Could not reach the server.</p>
              <button
                onClick={() => refetch()}
                style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 12, color: "var(--cin-cyan)", background: "none", border: "1px solid var(--cin-cyan)", padding: "8px 20px", borderRadius: 8, cursor: "pointer" }}
              >
                Retry
              </button>
            </div>
          </div>
        ) : selectedCourse ? (
          <LevelSelector
            course={selectedCourse}
            courses={courses ?? []}
            timedMode={timedModeEnabled}
            setTimedMode={setTimedModeEnabled}
            onBack={() => setSelectedCourse(null)}
            onStart={handleStart}
            loading={createSession.isPending}
          />
        ) : (
          <div style={{ maxWidth: 1100, margin: "0 auto", padding: "96px 32px 80px" }}>

            {/* ── Hero ── */}
            <div style={{ textAlign: "center", marginBottom: 80, display: "flex", flexDirection: "column", alignItems: "center" }}>

              {/* Eyebrow */}
              <div
                style={{
                  display: "inline-flex", alignItems: "center", gap: 10,
                  fontFamily: "'JetBrains Mono',monospace", fontSize: 12.5,
                  textTransform: "uppercase", letterSpacing: "0.18em",
                  color: "var(--cin-cyan)", border: "1px solid var(--cin-border)",
                  padding: "8px 16px", borderRadius: 20,
                  background: "var(--cin-surface)", backdropFilter: "blur(10px)",
                  marginBottom: 28, animation: "cin-slideUp 0.6s ease-out 0.2s both",
                }}
              >
                <span style={{ width: 5, height: 5, borderRadius: "50%", background: "var(--cin-cyan)", boxShadow: "0 0 8px var(--cin-cyan)", animation: "cin-blink 2s ease-in-out infinite", display: "inline-block", flexShrink: 0 }} />
                Technical Interview Platform
              </div>

              {/* Headline */}
              <h1
                className="cin-hero-heading"
                style={{
                  fontFamily: "'Inter',sans-serif", fontWeight: 800,
                  fontSize: 72, lineHeight: 1.04, letterSpacing: "-0.035em",
                  marginBottom: 26, maxWidth: 900,
                  animation: "cin-slideUp 0.7s ease-out 0.3s both",
                }}
              >
                <span style={{ color: "var(--cin-text)", display: "block" }}>Ace your next</span>
                <span style={{ display: "block", background: "linear-gradient(90deg, #fff 20%, var(--cin-cyan) 55%, var(--cin-violet) 85%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
                  technical interview
                </span>
              </h1>

              {/* Subtitle */}
              <p
                style={{
                  fontSize: 18, lineHeight: 1.65, color: "var(--cin-dim)",
                  maxWidth: 560, marginBottom: 44,
                  animation: "cin-slideUp 0.7s ease-out 0.4s both",
                }}
              >
                Choose a technology, select your difficulty, and answer realistic interview questions under pressure.
              </p>

              {/* Search box */}
              <div style={{ width: "100%", maxWidth: 540, animation: "cin-slideUp 0.7s ease-out 0.5s both" }}>
                <div
                  style={{
                    display: "flex", alignItems: "center", gap: 12,
                    background: "var(--cin-surface)", backdropFilter: "blur(14px)",
                    border: "1px solid var(--cin-border)", padding: "15px 20px", borderRadius: 14,
                    boxShadow: "0 20px 60px -20px rgba(0,0,0,0.6)",
                  }}
                >
                  <Search size={16} style={{ color: "var(--cin-faint)", flexShrink: 0 }} />
                  <input
                    type="text"
                    className="cin-search-input"
                    placeholder="Search courses… e.g. Docker, React, Kafka, Vault"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    style={{
                      flex: 1, background: "transparent", border: "none", outline: "none",
                      color: "var(--cin-text)", fontFamily: "'JetBrains Mono',monospace", fontSize: 13.5,
                    }}
                  />
                  {search ? (
                    <button
                      onClick={() => setSearch("")}
                      aria-label="Clear search"
                      style={{ background: "none", border: "none", cursor: "pointer", color: "var(--cin-faint)", display: "flex", padding: 0, flexShrink: 0 }}
                    >
                      <X size={15} />
                    </button>
                  ) : (
                    <kbd style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 11, color: "var(--cin-faint)", border: "1px solid var(--cin-border)", padding: "2px 7px", borderRadius: 5, flexShrink: 0 }}>/</kbd>
                  )}
                </div>
              </div>

              {/* Stats row */}
              <div
                className="cin-stats-row"
                style={{ display: "flex", gap: 48, flexWrap: "wrap", justifyContent: "center", marginTop: 52, animation: "cin-slideUp 0.7s ease-out 0.6s both" }}
              >
                {[
                  { val: "40", label: "Technologies" },
                  { val: "1200+", label: "Questions" },
                  { val: "4", label: "Badge Tiers" },
                ].map(({ val, label }) => (
                  <div key={label} style={{ textAlign: "center" }}>
                    <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 26, fontWeight: 700, background: "linear-gradient(90deg, #fff, var(--cin-cyan))", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
                      {val}
                    </div>
                    <div style={{ fontSize: 12.5, textTransform: "uppercase", letterSpacing: "0.04em", color: "var(--cin-faint)", marginTop: 4 }}>
                      {label}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* ── Section header ── */}
            <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", marginBottom: 36, flexWrap: "wrap", gap: 8 }}>
              <h2 style={{ fontFamily: "'Inter',sans-serif", fontSize: 30, fontWeight: 800, letterSpacing: "-0.02em", color: "var(--cin-text)" }}>
                Available courses
              </h2>
              <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 13, color: "var(--cin-faint)" }}>
                {filteredCourses.length} {filteredCourses.length === 1 ? "module" : "modules"} ·{" "}
                {filteredCourses.reduce((s, c) => s + c.questionCounts.beginner + c.questionCounts.intermediate + c.questionCounts.advanced, 0)} questions
              </span>
            </div>

            {/* ── Grid / empty state ── */}
            {filteredCourses.length === 0 ? (
              <div style={{ textAlign: "center", padding: "80px 0", color: "var(--cin-faint)" }}>
                <Search size={40} style={{ margin: "0 auto 16px", opacity: 0.3, display: "block" }} />
                <p style={{ fontSize: 18, fontWeight: 500, color: "var(--cin-dim)", marginBottom: 12 }}>No courses match "{search}"</p>
                <button
                  onClick={() => setSearch("")}
                  style={{ background: "none", border: "none", cursor: "pointer", color: "var(--cin-cyan)", fontFamily: "'JetBrains Mono',monospace", fontSize: 13, textDecoration: "underline", padding: 0 }}
                >
                  Clear search
                </button>
              </div>
            ) : (
              <div className="cin-grid">
                {filteredCourses.map((course, idx) => (
                  <CourseCard
                    key={course.id}
                    course={course}
                    accent={getAccent(course, idx)}
                    idx={idx}
                    onClick={() => setSelectedCourse(course)}
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </>
  );
}

// ─── Level Selector ───────────────────────────────────────────────────────────
function LevelSelector({
  course, courses, timedMode, setTimedMode, onBack, onStart, loading,
}: {
  course: Course;
  courses: Course[];
  timedMode: boolean;
  setTimedMode: (v: boolean) => void;
  onBack: () => void;
  onStart: (level: SessionInputLevel) => void;
  loading: boolean;
}) {
  const accent = getAccent(course, courses.findIndex((c) => c.id === course.id));
  const Icon = getCourseIcon(course.icon);

  return (
    <div style={{ minHeight: "calc(100vh - 75px)", display: "flex", alignItems: "center", justifyContent: "center", padding: 32 }}>
      <div
        style={{
          maxWidth: 540, width: "100%",
          background: "var(--cin-surface)", backdropFilter: "blur(20px)",
          border: "1px solid var(--cin-border)", borderRadius: 24, padding: 40,
          animation: "cin-slideUp 0.5s ease-out both",
          boxShadow: `0 40px 120px -30px rgba(0,0,0,0.8), inset 0 0 0 1px ${accent}20`,
        }}
      >
        {/* Back */}
        <BackButton onClick={onBack} />

        {/* Course header */}
        <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 32 }}>
          <div
            style={{
              width: 56, height: 56, borderRadius: 14, display: "flex", alignItems: "center", justifyContent: "center",
              background: "rgba(255,255,255,0.03)", border: "1px solid var(--cin-border)",
              boxShadow: `0 0 24px ${accent}30`,
            }}
          >
            {Icon
              ? <Icon size={28} style={{ color: accent }} />
              : <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 18, fontWeight: 800, color: accent }}>{course.name.slice(0, 2).toUpperCase()}</span>}
          </div>
          <div>
            <h2 style={{ fontFamily: "'Inter',sans-serif", fontSize: 24, fontWeight: 800, letterSpacing: "-0.02em", color: "var(--cin-text)", marginBottom: 4 }}>
              {course.name}
            </h2>
            <p style={{ fontSize: 13, color: "var(--cin-dim)" }}>Select your difficulty level</p>
          </div>
        </div>

        {/* Timed mode toggle */}
        <button
          onClick={() => setTimedMode(!timedMode)}
          style={{
            width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between",
            padding: "14px 18px", marginBottom: 20, borderRadius: 12,
            background: timedMode ? `${accent}18` : "rgba(255,255,255,0.02)",
            border: `1px solid ${timedMode ? `${accent}60` : "var(--cin-border)"}`,
            cursor: "pointer", transition: "all 0.2s", textAlign: "left",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <Timer size={16} style={{ color: timedMode ? accent : "var(--cin-faint)", flexShrink: 0 }} />
            <div>
              <div style={{ fontFamily: "'Inter',sans-serif", fontSize: 14, fontWeight: 600, color: timedMode ? "var(--cin-text)" : "var(--cin-dim)" }}>Timed Mode</div>
              <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 11, color: "var(--cin-faint)", marginTop: 2 }}>Earn bonus points for quick answers</div>
            </div>
          </div>
          <div style={{ width: 40, height: 22, borderRadius: 11, background: timedMode ? accent : "rgba(140,160,220,0.2)", position: "relative", transition: "background 0.2s", flexShrink: 0 }}>
            <div style={{ position: "absolute", top: 3, left: timedMode ? 20 : 3, width: 16, height: 16, borderRadius: "50%", background: "#fff", transition: "left 0.2s", boxShadow: "0 1px 4px rgba(0,0,0,0.3)" }} />
          </div>
        </button>

        {/* Level buttons */}
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {([
            { level: SessionInputLevel.beginner,     title: "Beginner",     desc: "Core concepts and syntax.", count: course.questionCounts.beginner },
            { level: SessionInputLevel.intermediate, title: "Intermediate", desc: "Architecture and best practices.", count: course.questionCounts.intermediate },
            { level: SessionInputLevel.advanced,     title: "Advanced",     desc: "Performance and complex scenarios.", count: course.questionCounts.advanced },
          ] as const).map(({ level, title, desc, count }) => (
            <LevelButton
              key={level}
              title={title}
              desc={desc}
              count={count}
              accent={accent}
              loading={loading}
              onClick={() => onStart(level)}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function BackButton({ onClick }: { onClick: () => void }) {
  const [h, setH] = useState(false);
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setH(true)}
      onMouseLeave={() => setH(false)}
      style={{
        display: "flex", alignItems: "center", gap: 8,
        background: "none", border: "none", cursor: "pointer",
        color: h ? "var(--cin-text)" : "var(--cin-dim)",
        fontFamily: "'JetBrains Mono',monospace", fontSize: 12,
        marginBottom: 32, padding: 0, transition: "color 0.2s",
      }}
    >
      <ArrowLeft size={14} />
      Back to courses
    </button>
  );
}

function LevelButton({
  title, desc, count, accent, loading, onClick,
}: {
  title: string; desc: string; count: number; accent: string; loading: boolean; onClick: () => void;
}) {
  const [h, setH] = useState(false);
  return (
    <button
      onClick={onClick}
      disabled={loading || count === 0}
      onMouseEnter={() => setH(true)}
      onMouseLeave={() => setH(false)}
      style={{
        width: "100%", textAlign: "left", padding: "20px 22px", borderRadius: 14,
        background: h ? `${accent}14` : "rgba(255,255,255,0.02)",
        border: `1px solid ${h ? `${accent}55` : "var(--cin-border)"}`,
        cursor: loading || count === 0 ? "not-allowed" : "pointer",
        display: "flex", alignItems: "center", justifyContent: "space-between",
        opacity: count === 0 ? 0.45 : 1, transition: "all 0.2s",
      }}
    >
      <div>
        <h3 style={{ fontFamily: "'Inter',sans-serif", fontSize: 17, fontWeight: 700, color: h ? "var(--cin-text)" : "var(--cin-dim)", marginBottom: 4, transition: "color 0.2s" }}>
          {title}
        </h3>
        <p style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 12, color: "var(--cin-faint)" }}>{desc}</p>
      </div>
      <div style={{ textAlign: "right", flexShrink: 0, marginLeft: 16 }}>
        <span style={{ display: "block", fontFamily: "'JetBrains Mono',monospace", fontSize: 22, fontWeight: 700, color: h ? accent : "var(--cin-text)", transition: "color 0.2s" }}>
          {count}
        </span>
        <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 10, color: "var(--cin-faint)", textTransform: "uppercase", letterSpacing: "0.06em" }}>
          Questions
        </span>
      </div>
    </button>
  );
}
