import { useState, useMemo, useEffect, useRef } from "react";
import { useLocation } from "wouter";
import {
  useListCourses,
  useCreateSession,
  getListCoursesQueryKey,
  SessionInputLevel,
  type Course,
} from "@workspace/api-client-react";
import { useQuizState } from "@/lib/quiz-context";
import { TOTAL_COURSES, TOTAL_QUESTIONS, TOTAL_QUESTIONS_DISPLAY, DIFFICULTY_TIERS } from "@/lib/platform-stats";
import * as SiIcons from "react-icons/si";
import { Search, X, ArrowLeft, Timer } from "lucide-react";

// ─── Category order ───────────────────────────────────────────────────────────
const CATEGORY_ORDER = [
  "Cloud",
  "Languages",
  "Frontend",
  "Mobile",
  "Backend",
  "Databases",
  "DevOps",
  "Data Engineering",
  "Observability",
  "Security",
  "Infrastructure",
  "Testing",
  "AI & ML",
  "Architecture",
  "APIs & Integration",
  "Messaging",
  "Enterprise",
  "CMS & Platforms",
  "General",
];

// ─── Accent colors ────────────────────────────────────────────────────────────
const SLUG_ACCENT: Record<string, string> = {
  // Cloud
  aws:             "#f0a35c",
  azure:           "#6fd3f0",
  gcp:             "#f0b84f",
  // Languages
  java:            "#f0b84f",
  python:          "#5be3d8",
  javascript:      "#f0b84f",
  typescript:      "#5be3d8",
  bash:            "#f0b84f",
  golang:          "#6fd3f0",
  dotnet:          "#8f7bf0",
  php:             "#8f7bf0",
  rust:            "#f0a35c",
  // Frontend
  react:           "#5be3d8",
  "vue-angular":   "#6fd3f0",
  graphql:         "#f0748a",
  // Backend
  nodejs:          "#6fd3f0",
  django:          "#5be3d8",
  "spring-boot":   "#f0b84f",
  fastapi:         "#5be3d8",
  nestjs:          "#f0748a",
  rails:           "#f0748a",
  // Databases
  sql:             "#8f7bf0",
  oracle:          "#f0748a",
  postgresql:      "#6fd3f0",
  mongodb:         "#6fd3f0",
  redis:           "#f0748a",
  mysql:           "#6fd3f0",
  // DevOps
  "docker-k8s":    "#5be3d8",
  git:             "#f0a35c",
  terraform:       "#8f7bf0",
  cicd:            "#f0a35c",
  ansible:         "#f0748a",
  // Data Engineering
  kafka:           "#f0748a",
  "data-warehouse":"#5be3d8",
  rabbitmq:        "#f0748a",
  spark:           "#f0b84f",
  airflow:         "#5be3d8",
  "data-viz":      "#5be3d8",
  // Observability
  sre:             "#5be3d8",
  elasticsearch:   "#f0a35c",
  "prometheus-grafana": "#f0a35c",
  splunk:          "#f0b84f",
  // Security
  cybersecurity:   "#f0748a",
  vault:           "#f0b84f",
  "active-directory": "#8f7bf0",
  // Infrastructure
  linux:           "#6fd3f0",
  networking:      "#6fd3f0",
  virtualization:  "#6fd3f0",
  powershell:      "#6fd3f0",
  // Testing
  "testing-qa":    "#8f7bf0",
  playwright:      "#8f7bf0",
  // AI & ML
  "machine-learning": "#f0b84f",
  "deep-learning": "#8f7bf0",
  "llm-apis":      "#f0b84f",
  // Enterprise
  sap:             "#8f7bf0",
  "jira-agile":    "#f0a35c",
  // Mobile (new)
  flutter:         "#5be3d8",
  "react-native":  "#6fd3f0",
  // Architecture (new)
  "system-design-architecture": "#8f7bf0",
  microservices:   "#5be3d8",
  // AI & ML extras (new)
  "generative-ai": "#f0b84f",
  mlops:           "#8f7bf0",
  langchain:       "#5be3d8",
  // DevOps extras (new)
  "kubernetes-advanced": "#5be3d8",
  argocd:          "#8f7bf0",
  // Data Engineering extras (new)
  dbt:             "#f0748a",
  databricks:      "#f0a35c",
  "apache-flink":  "#f0748a",
  // Databases extras (new)
  "vector-databases": "#8f7bf0",
  // Security extras (new)
  "cloud-security":  "#f0748a",
  "zero-trust":      "#f0748a",
  // Observability extras (new)
  opentelemetry:   "#5be3d8",
  // Languages extras (new)
  scala:           "#f0748a",
  // APIs extras (new)
  grpc:            "#5be3d8",
  // Frontend extras (new)
  svelte:          "#f0a35c",
  // Languages gap courses (new)
  "dotnet-csharp": "#8f7bf0",
  // CMS & Platforms (new)
  aem:             "#f0748a",
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
    const canvas = ref.current!;
    const context = canvas.getContext("2d");
    if (!context) return;
    const ctx: CanvasRenderingContext2D = context;

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    let raf: number;
    const LINK_DISTANCE = 140;
    const MOUSE_DISTANCE = 160;
    const MOUSE_PUSH_STRENGTH = 0.0018;
    const dpr = () => Math.min(window.devicePixelRatio || 1, 2);
    interface Node { x: number; y: number; vx: number; vy: number; r: number }
    let nodes: Node[] = [];
    let width = 0;
    let height = 0;
    let mouseX = -Infinity;
    let mouseY = -Infinity;

    function resize() {
      width = window.innerWidth;
      height = window.innerHeight;
      const pixelRatio = dpr();
      canvas.width = Math.floor(width * pixelRatio);
      canvas.height = Math.floor(height * pixelRatio);
      ctx.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);

      const count = Math.min(180, Math.floor((width * height) / 7000));
      nodes = Array.from({ length: count }, () => ({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * 0.7,
        vy: (Math.random() - 0.5) * 0.7,
        r: Math.random() * 1.4 + 0.8,
      }));
    }

    function draw() {
      ctx.clearRect(0, 0, width, height);
      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const dx = nodes[i].x - nodes[j].x, dy = nodes[i].y - nodes[j].y;
          const d = Math.sqrt(dx * dx + dy * dy);
          if (d < LINK_DISTANCE) {
            ctx.beginPath();
            ctx.strokeStyle = `rgba(79,216,176,${0.35 * (1 - d / LINK_DISTANCE)})`;
            ctx.lineWidth = 0.55;
            ctx.moveTo(nodes[i].x, nodes[i].y);
            ctx.lineTo(nodes[j].x, nodes[j].y);
            ctx.stroke();
          }
        }
      }
      for (const n of nodes) {
        const mouseDx = n.x - mouseX;
        const mouseDy = n.y - mouseY;
        const mouseDistance = Math.sqrt(mouseDx * mouseDx + mouseDy * mouseDy);
        if (mouseDistance > 0 && mouseDistance < MOUSE_DISTANCE) {
          const influence = 1 - mouseDistance / MOUSE_DISTANCE;
          n.x += (mouseDx / mouseDistance) * influence * MOUSE_PUSH_STRENGTH;
          n.y += (mouseDy / mouseDistance) * influence * MOUSE_PUSH_STRENGTH;
        }

        n.x += n.vx;
        n.y += n.vy;
        if (n.x < n.r) { n.x = n.r; n.vx = Math.abs(n.vx); }
        if (n.x > width - n.r) { n.x = width - n.r; n.vx = -Math.abs(n.vx); }
        if (n.y < n.r) { n.y = n.r; n.vy = Math.abs(n.vy); }
        if (n.y > height - n.r) { n.y = height - n.r; n.vy = -Math.abs(n.vy); }

        ctx.beginPath();
        ctx.arc(n.x, n.y, n.r, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(233,237,247,0.55)";
        ctx.fill();
      }
      raf = requestAnimationFrame(draw);
    }

    resize();
    draw();
    const onResize = () => resize();
    const onMouseMove = (event: MouseEvent) => {
      mouseX = event.clientX;
      mouseY = event.clientY;
    };
    const onMouseLeave = () => {
      mouseX = -Infinity;
      mouseY = -Infinity;
    };
    window.addEventListener("resize", onResize);
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseleave", onMouseLeave);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", onResize);
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseleave", onMouseLeave);
    };
  }, []);

  return (
    <canvas
      ref={ref}
      aria-hidden="true"
      style={{ position: "fixed", inset: 0, width: "100%", height: "100%", background: "#070b14", pointerEvents: "none", zIndex: 0 }}
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
          ctx.fillStyle = p.cyan ? `rgba(91,227,216,${a * 0.9})` : `rgba(143,123,240,${a * 0.9})`;
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
        background: "radial-gradient(circle, rgba(91,227,216,0.18), transparent 70%)",
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
        background: hovered ? "rgba(14,20,52,0.85)" : "var(--cin-surface)",
        backdropFilter: "blur(14px)",
        border: `1px solid ${hovered ? "transparent" : "var(--cin-border)"}`,
        padding: 28,
        borderRadius: 16,
        cursor: "pointer",
        overflow: "hidden",
        transform: hovered ? "translateY(-8px)" : "translateY(0)",
        boxShadow: hovered
          ? `0 25px 80px -20px rgba(0,0,0,0.75), inset 0 0 0 1px ${accent}50`
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

// ─── Category icon map ────────────────────────────────────────────────────────
const CATEGORY_ICON: Record<string, string> = {
  "Cloud":            "☁️",
  "Languages":        "{ }",
  "Frontend":         "◱",
  "Mobile":           "📱",
  "Backend":          "⚙",
  "Databases":        "🗄",
  "DevOps":           "♾",
  "Data Engineering": "⬡",
  "Observability":    "◎",
  "Security":         "🔒",
  "Infrastructure":   "🖥",
  "Testing":          "✓",
  "AI & ML":          "✦",
  "Architecture":     "◫",
  "Messaging":        "⇄",
  "Enterprise":          "◈",
  "CMS & Platforms":     "◧",
  "APIs & Integration":  "⇌",
  "General":             "●",
};

// ─── CoursesByCategory ────────────────────────────────────────────────────────
function CoursesByCategory({
  courses,
  onSelect,
}: {
  courses: Course[];
  onSelect: (c: Course) => void;
}) {
  // Build a stable slug→global-index map so accent colours are consistent
  const globalIdx = useMemo(() => {
    const map = new Map<string, number>();
    courses.forEach((c, i) => map.set(c.slug, i));
    return map;
  }, [courses]);

  // Group by category
  const grouped = useMemo(() => {
    const map = new Map<string, Course[]>();
    for (const c of courses) {
      const cat = c.category || "General";
      if (!map.has(cat)) map.set(cat, []);
      map.get(cat)!.push(c);
    }
    return map;
  }, [courses]);

  // Sort categories by canonical order
  const sortedCategories = useMemo(() => {
    const keys = Array.from(grouped.keys());
    return keys.sort((a, b) => {
      const ai = CATEGORY_ORDER.indexOf(a);
      const bi = CATEGORY_ORDER.indexOf(b);
      return (ai === -1 ? 999 : ai) - (bi === -1 ? 999 : bi);
    });
  }, [grouped]);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 56 }}>
      {sortedCategories.map((cat) => {
        const catCourses = grouped.get(cat)!;
        const emoji = CATEGORY_ICON[cat] ?? "●";
        return (
          <section key={cat}>
            {/* Category header */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                marginBottom: 24,
                paddingBottom: 16,
                borderBottom: "1px solid var(--cin-border)",
              }}
            >
              <span
                style={{
                  fontFamily: "'JetBrains Mono',monospace",
                  fontSize: 15,
                  lineHeight: 1,
                  color: "var(--cin-cyan)",
                  minWidth: 22,
                  textAlign: "center",
                }}
              >
                {emoji}
              </span>
              <h2
                style={{
                  fontFamily: "'Inter',sans-serif",
                  fontSize: 20,
                  fontWeight: 700,
                  letterSpacing: "-0.015em",
                  color: "var(--cin-text)",
                  flex: 1,
                }}
              >
                {cat}
              </h2>
              <span
                style={{
                  fontFamily: "'JetBrains Mono',monospace",
                  fontSize: 11.5,
                  color: "var(--cin-faint)",
                  border: "1px solid var(--cin-border)",
                  padding: "3px 10px",
                  borderRadius: 20,
                  flexShrink: 0,
                }}
              >
                {catCourses.length} {catCourses.length === 1 ? "course" : "courses"}
              </span>
            </div>
            {/* Grid */}
            <div className="cin-grid">
              {catCourses.map((course) => {
                const idx = globalIdx.get(course.slug) ?? 0;
                return (
                  <CourseCard
                    key={course.id}
                    course={course}
                    accent={getAccent(course, idx)}
                    idx={idx}
                    onClick={() => onSelect(course)}
                  />
                );
              })}
            </div>
          </section>
        );
      })}
    </div>
  );
}

// ─── Film grain data URI ──────────────────────────────────────────────────────
const GRAIN = `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='200'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E`;

// ─── Search box ───────────────────────────────────────────────────────────────
function SearchBox({ search, onSearch }: { search: string; onSearch: (v: string) => void }) {
  const [focused, setFocused] = useState(false);
  return (
    <div
      style={{
        display: "flex", alignItems: "center", gap: 12,
        background: "var(--cin-surface)", backdropFilter: "blur(14px)",
        border: focused
          ? "1.5px solid rgba(255,255,255,0.75)"
          : "1.5px solid rgba(255,255,255,0.22)",
        padding: "15px 20px", borderRadius: 14,
        boxShadow: focused
          ? "0 0 0 3px rgba(255,255,255,0.08), 0 20px 60px -20px rgba(0,0,0,0.65)"
          : "0 20px 60px -20px rgba(0,0,0,0.65)",
        transition: "border-color 0.2s, box-shadow 0.2s",
      }}
    >
      <Search size={16} style={{ color: focused ? "rgba(255,255,255,0.7)" : "var(--cin-faint)", flexShrink: 0, transition: "color 0.2s" }} />
      <input
        type="text"
        className="cin-search-input"
        placeholder="Search courses… e.g. Docker, React, Kafka, Vault"
        value={search}
        onChange={(e) => onSearch(e.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        style={{
          flex: 1, background: "transparent", border: "none", outline: "none",
          color: "var(--cin-text)", fontFamily: "'JetBrains Mono',monospace", fontSize: 13.5,
        }}
      />
      {search ? (
        <button
          onClick={() => onSearch("")}
          aria-label="Clear search"
          style={{ background: "none", border: "none", cursor: "pointer", color: "var(--cin-faint)", display: "flex", padding: 0, flexShrink: 0 }}
        >
          <X size={15} />
        </button>
      ) : (
        <kbd style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 11, color: "var(--cin-faint)", border: "1px solid var(--cin-border)", padding: "2px 7px", borderRadius: 5, flexShrink: 0 }}>/</kbd>
      )}
    </div>
  );
}

// ─── Home ─────────────────────────────────────────────────────────────────────
export default function Home() {
  const { data: courses, isLoading, isError, refetch } = useListCourses({
    query: {
      queryKey: getListCoursesQueryKey(),
      retry: 4,
      retryDelay: (n) => Math.min(1000 * 2 ** n, 10000),
    },
  });
  const [, setLocation] = useLocation();
  const { setSession, setTimedMode } = useQuizState();
  const createSession = useCreateSession();
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [timedModeEnabled, setTimedModeEnabled] = useState(false);
  const [search, setSearch] = useState("");

  // ── Challenge invite params ────────────────────────────────────────────────
  const [challengeParams] = useState(() => {
    const p = new URLSearchParams(typeof window !== "undefined" ? window.location.search : "");
    const c = p.get("c"); const l = p.get("l"); const from = p.get("from");
    if (!c || !l || !from) return null;
    return {
      courseId: Number(c),
      level: l,
      from: decodeURIComponent(from),
      courseName: p.get("cn") ? decodeURIComponent(p.get("cn")!) : null,
    };
  });

  // Auto-select the challenged course once courses load
  useEffect(() => {
    if (!challengeParams || !courses || selectedCourse) return;
    const found = courses.find((c) => c.id === challengeParams.courseId);
    if (found) setSelectedCourse(found);
  }, [courses, challengeParams, selectedCourse]);

  useEffect(() => {
    document.title = `TechInterviewPrep — ${TOTAL_QUESTIONS_DISPLAY} IT Interview Questions [Free]`;
  }, []);

  // ── Search alias expansion ────────────────────────────────────────────────
  // Maps common shorthands / alternate phrasings to terms that hit course data.
  const SEARCH_ALIASES: Record<string, string[]> = {
    "dot net": [".net", "c#", "csharp"],
    "dotnet": [".net", "c#", "csharp"],
    "c#": [".net", "csharp"],
    "k8s": ["kubernetes"],
    "kube": ["kubernetes"],
    "gke": ["kubernetes", "gcp"],
    "eks": ["kubernetes", "aws"],
    "node": ["node.js", "nodejs"],
    "js": ["javascript"],
    "ts": ["typescript"],
    "py": ["python"],
    "ml": ["machine learning"],
    "ai": ["machine learning"],
    "llm": ["machine learning"],
    "neural": ["deep learning"],
    "postgres": ["postgresql"],
    "pg": ["postgresql"],
    "mongo": ["mongodb"],
    "nosql": ["mongodb"],
    "elk": ["elasticsearch"],
    "kibana": ["elasticsearch"],
    "logstash": ["elasticsearch"],
    "rmq": ["rabbitmq"],
    "rabbit": ["rabbitmq"],
    "next": ["next.js"],
    "nextjs": ["next.js"],
    "nuxt": ["vue"],
    "angular": ["angular"],
    "cicd": ["ci/cd"],
    "devops": ["ci/cd"],
    "pipelines": ["ci/cd"],
    "github actions": ["ci/cd"],
    "jenkins": ["ci/cd"],
    "shell": ["bash"],
    "bash scripting": ["bash"],
    "zero trust": ["cybersecurity", "zero trust security"],
    "ztna": ["cybersecurity", "zero trust"],
    "hacking": ["cybersecurity"],
    "infosec": ["cybersecurity"],
    "penetration": ["cybersecurity"],
    "pentesting": ["cybersecurity"],
    "vault": ["hashicorp"],
    "terraform": ["iac", "infrastructure as code"],
    "iac": ["terraform"],
    "vmware": ["virtualization"],
    "vm": ["virtualization"],
    "virtual machine": ["virtualization"],
    "snowflake": ["data warehouse"],
    "bigquery": ["data warehouse"],
    "redshift": ["data warehouse"],
    "s3": ["aws"],
    "ec2": ["aws"],
    "lambda": ["aws"],
    "dynamodb": ["aws"],
    "jira": ["agile"],
    "scrum": ["agile"],
    "kanban": ["agile"],
    "spring": ["spring boot"],
    "hibernate": ["spring boot"],
    "selenium": ["testing"],
    "playwright": ["testing"],
    "cypress": ["testing"],
    "qa": ["testing"],
    "test automation": ["testing"],
    "graphql": ["graph"],
    "rest api": ["graphql", "api design"],
    "api": ["graphql", "api design"],
    "sre": ["observability"],
    "prometheus": ["observability"],
    "grafana": ["observability"],
    "monitoring": ["observability"],
    "tracing": ["observability"],
  };

  const filteredCourses = useMemo(() => {
    if (!courses) return [];
    const q = search.trim().toLowerCase();
    if (!q) return courses;
    // Expand the query with aliases so shorthands / alternate names still match
    const extraTerms = SEARCH_ALIASES[q] ?? [];
    const allTerms = [q, ...extraTerms];
    return courses.filter((c) => {
      const name = c.name.toLowerCase();
      const slug = c.slug.toLowerCase();
      const desc = (c.description ?? "").toLowerCase();
      return allTerms.some(
        (term) => name.includes(term) || slug.includes(term) || desc.includes(term),
      );
    });
  }, [courses, search]);

  // ── Search logging (fire-and-forget, debounced 1.5s) ──────────────────────
  useEffect(() => {
    const q = search.trim();
    if (q.length < 2) return; // ignore very short queries
    const timer = setTimeout(() => {
      const base = import.meta.env.BASE_URL.replace(/\/$/, "");
      fetch(`${base}/api/search-log`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: q, resultCount: filteredCourses.length }),
      }).catch(() => {}); // silent — never break the UI
    }, 1500);
    return () => clearTimeout(timer);
  }, [search, filteredCourses.length]);

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

      {/* Aurora streaks */}
      <div style={{ position: "fixed", inset: 0, pointerEvents: "none", zIndex: 0, overflow: "hidden" }}>
        {/* Green-teal aurora — top left */}
        <div style={{
          position: "absolute", top: -260, left: "-15%", width: "70%", height: 520,
          background: "linear-gradient(160deg, rgba(0,220,160,0.22) 0%, rgba(0,190,220,0.12) 55%, transparent 100%)",
          filter: "blur(90px)", borderRadius: "50%",
          animation: "cin-aurora-1 14s ease-in-out infinite",
          transformOrigin: "center top",
        }} />
        {/* Violet aurora — top right */}
        <div style={{
          position: "absolute", top: -300, right: "-12%", width: "62%", height: 560,
          background: "linear-gradient(200deg, rgba(130,60,255,0.22) 0%, rgba(170,100,255,0.12) 50%, transparent 100%)",
          filter: "blur(110px)", borderRadius: "50%",
          animation: "cin-aurora-2 17s ease-in-out infinite",
          transformOrigin: "center top",
        }} />
        {/* Soft center glow */}
        <div style={{
          position: "absolute", top: -180, left: "18%", width: "55%", height: 380,
          background: "linear-gradient(180deg, rgba(0,240,200,0.10) 0%, transparent 80%)",
          filter: "blur(70px)", borderRadius: "50%",
          animation: "cin-aurora-3 20s ease-in-out infinite",
          transformOrigin: "center top",
        }} />
        {/* Deep bottom glow for depth */}
        <div style={{ position: "absolute", bottom: -260, left: "30%", width: 700, height: 500, borderRadius: "50%", background: "radial-gradient(circle, rgba(130,60,255,0.08), transparent 70%)", filter: "blur(110px)" }} />
      </div>

      {/* Vignette — dark edges */}
      <div style={{ position: "fixed", inset: 0, background: "radial-gradient(ellipse 1400px 900px at 50% 20%, transparent 40%, rgba(4,6,16,0.70) 100%)", pointerEvents: "none", zIndex: 3 }} />

      {/* Film grain */}
      <div style={{ position: "fixed", inset: 0, backgroundImage: `url("${GRAIN}")`, opacity: 0.04, mixBlendMode: "overlay", pointerEvents: "none", zIndex: 4 }} />

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
          <div className="cin-home-content" style={{ maxWidth: 1100, margin: "0 auto", padding: "96px 32px 80px" }}>

            {/* ── Challenge banner ── */}
            {challengeParams && (
              <div
                style={{
                  display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap",
                  background: "linear-gradient(135deg, rgba(95,120,240,0.12), rgba(91,227,216,0.12))",
                  border: "1px solid rgba(95,120,240,0.4)", borderRadius: 16,
                  padding: "16px 24px", marginBottom: 40,
                  animation: "cin-slideUp 0.5s ease-out both",
                }}
              >
                <div style={{ fontSize: 36 }}>🎯</div>
                <div style={{ flex: 1, minWidth: 200 }}>
                  <div style={{ fontWeight: 700, color: "var(--cin-text)", fontSize: 15 }}>
                    {challengeParams.from} challenged you!
                  </div>
                  <div style={{ color: "var(--cin-dim)", fontSize: 13, marginTop: 3 }}>
                    Beat their score on{" "}
                    <strong style={{ color: "var(--cin-cyan)" }}>
                      {challengeParams.courseName ?? "a quiz"}
                    </strong>{" "}
                    ({challengeParams.level} level)
                  </div>
                </div>
                <button
                  onClick={() => {
                    const found = courses?.find((c) => c.id === challengeParams.courseId);
                    if (found) setSelectedCourse(found);
                  }}
                  style={{
                    background: "linear-gradient(135deg, #5f78f0, #5be3d8)", color: "#fff",
                    border: "none", borderRadius: 10, padding: "10px 22px",
                    fontWeight: 700, fontSize: 13, cursor: "pointer", whiteSpace: "nowrap",
                    boxShadow: "0 4px 16px rgba(95,120,240,0.35)",
                  }}
                >
                  Accept Challenge 🎮
                </button>
              </div>
            )}

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
                <span style={{ display: "block", background: "linear-gradient(90deg, #ffffff 15%, var(--cin-cyan) 52%, var(--cin-violet) 85%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
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
                <SearchBox search={search} onSearch={setSearch} />
              </div>

              {/* Stats row */}
              <div
                className="cin-stats-row"
                style={{ display: "flex", gap: 48, flexWrap: "wrap", justifyContent: "center", marginTop: 52, animation: "cin-slideUp 0.7s ease-out 0.6s both" }}
              >
                {[
                  { val: String(TOTAL_COURSES), label: "Technologies" },
                  { val: TOTAL_QUESTIONS_DISPLAY, label: "Questions" },
                  { val: String(DIFFICULTY_TIERS + 1), label: "Badge Tiers" },
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
                {search.trim() ? "Search results" : "All courses"}
              </h2>
              <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 13, color: "var(--cin-faint)" }}>
                {filteredCourses.length} {filteredCourses.length === 1 ? "module" : "modules"} ·{" "}
                {(search.trim()
                  ? filteredCourses.reduce((s, c) => s + c.questionCounts.beginner + c.questionCounts.intermediate + c.questionCounts.advanced, 0)
                  : TOTAL_QUESTIONS
                ).toLocaleString()} questions
              </span>
            </div>

            {/* ── Grouped by category / empty state ── */}
            {filteredCourses.length === 0 ? (
              <div style={{ textAlign: "center", padding: "80px 0 60px" }}>
                <Search size={40} style={{ margin: "0 auto 20px", opacity: 0.25, display: "block", color: "var(--cin-cyan)" }} />
                <p style={{ fontSize: 20, fontWeight: 700, color: "var(--cin-text)", marginBottom: 8, letterSpacing: "-0.01em" }}>
                  No courses match &ldquo;{search}&rdquo;
                </p>
                <p style={{ fontSize: 14, color: "var(--cin-dim)", marginBottom: 28, maxWidth: 380, margin: "0 auto 28px" }}>
                  We don&apos;t have a course on that topic yet — but we&apos;re adding new ones regularly.
                </p>
                <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
                  <button
                    onClick={() => setSearch("")}
                    style={{
                      background: "rgba(255,255,255,0.06)",
                      border: "1px solid var(--cin-border)",
                      borderRadius: 10,
                      cursor: "pointer",
                      color: "var(--cin-text)",
                      fontFamily: "'Inter',sans-serif",
                      fontSize: 13,
                      fontWeight: 500,
                      padding: "9px 18px",
                    }}
                  >
                    Clear search
                  </button>
                  <a
                    href={`mailto:hello@mockinterviewprep.app?subject=Course request: ${encodeURIComponent(search)}&body=I searched for "${search}" and couldn't find it. Please add a course on this topic!`}
                    style={{
                      background: "var(--cin-cyan)",
                      border: "none",
                      borderRadius: 10,
                      cursor: "pointer",
                      color: "#05070f",
                      fontFamily: "'Inter',sans-serif",
                      fontSize: 13,
                      fontWeight: 700,
                      padding: "9px 18px",
                      textDecoration: "none",
                      display: "inline-block",
                    }}
                  >
                    Request this course →
                  </a>
                </div>
              </div>
            ) : (
              <CoursesByCategory
                courses={filteredCourses}
                onSelect={setSelectedCourse}
              />
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
    <div className="cin-level-outer" style={{ minHeight: "calc(100vh - 75px)", display: "flex", alignItems: "center", justifyContent: "center", padding: 32 }}>
      <div
        className="cin-level-card"
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
