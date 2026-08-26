import { Link, useLocation } from "wouter";
import { useEffect, useRef, useState } from "react";
import { ChevronDown, Globe2, Loader2, MessageCircle, Send, Swords, X } from "lucide-react";
import { useListCourses } from "@workspace/api-client-react";
import { useRaceSocket, type Level } from "@/lib/race-socket";

const LINKS = [
  { href: "/", label: "Courses" },
  { href: "/leaderboard", label: "Leaderboard" },
  { href: "/race", label: "Challenge" },
  { href: "/lab", label: "Code Lab" },
  { href: "/resume-builder", label: "Resume Builder", badge: "NEW FREE" },
  { href: "/community", label: "Community" },
  { href: "/about", label: "About" },
];

function NavLink({
  href,
  label,
  badge,
  location,
  onClick,
  mobile,
}: {
  href: string;
  label: string;
  badge?: string;
  location: string;
  onClick?: () => void;
  mobile?: boolean;
}) {
  const [hovered, setHovered] = useState(false);
  const active = location === href;

  if (mobile) {
    return (
      <Link
        href={href}
        onClick={onClick}
        style={{
          display: "block",
          fontFamily: "'Inter', sans-serif",
          fontSize: 17,
          fontWeight: active ? 700 : 500,
          color: active ? "var(--cin-cyan)" : "var(--cin-text)",
          textDecoration: "none",
          padding: "14px 24px",
          borderBottom: "1px solid var(--cin-border)",
          borderLeft: active ? "3px solid var(--cin-cyan)" : "3px solid transparent",
          background: active ? "rgba(91,227,216,0.06)" : "transparent",
          transition: "background 0.15s",
        }}
      >
        {label}{badge && <span style={{ marginLeft: 6, padding: "2px 4px", borderRadius: 4, background: "rgba(91,227,216,0.14)", color: "var(--cin-cyan)", fontSize: 8, fontWeight: 800, letterSpacing: "0.02em", verticalAlign: "middle" }}>{badge}</span>}
      </Link>
    );
  }

  return (
    <Link
      href={href}
      style={{
        fontFamily: "'Inter', sans-serif",
        fontSize: 14,
        fontWeight: 500,
        color: active || hovered ? "var(--cin-text)" : "var(--cin-dim)",
        textDecoration: "none",
        position: "relative",
        paddingBottom: 2,
        transition: "color 0.2s",
        whiteSpace: "nowrap",
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {label}{badge && <span style={{ marginLeft: 6, padding: "2px 4px", borderRadius: 4, background: "rgba(91,227,216,0.14)", color: "var(--cin-cyan)", fontSize: 8, fontWeight: 800, letterSpacing: "0.02em", verticalAlign: "middle" }}>{badge}</span>}
      {active && (
        <span
          style={{
            position: "absolute",
            bottom: -2,
            left: 0,
            right: 0,
            height: 2,
            borderRadius: 1,
            background: "linear-gradient(90deg, var(--cin-cyan), var(--cin-violet))",
          }}
        />
      )}
    </Link>
  );
}

function OnlineBadge() {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState("");
  const [name, setName] = useState(() => localStorage.getItem("race-player-name") ?? "");
  const [courseId, setCourseId] = useState<number | null>(null);
  const [level, setLevel] = useState<Level>("beginner");
  const [target, setTarget] = useState<string | null>(null);
  const socket = useRaceSocket();
  const { data: courses } = useListCourses();
  const [, navigate] = useLocation();
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (courses?.length && courseId === null) setCourseId(courses[0].id);
  }, [courses, courseId]);

  useEffect(() => {
    if (socket.connected && !socket.registered && name.trim().length >= 2) socket.register(name.trim());
  }, [socket.connected, socket.registered, name, socket]);

  useEffect(() => {
    if (socket.race) navigate("/race");
  }, [socket.race, navigate]);

  useEffect(() => {
    if (!open) return;
    const close = (event: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [open]);

  const submitName = () => {
    const next = name.trim();
    if (next.length < 2) return;
    localStorage.setItem("race-player-name", next);
    setName(next);
    socket.register(next);
  };
  const sendMessage = () => {
    const text = draft.trim();
    if (!text) return;
    socket.sendChat(text);
    setDraft("");
  };
  const incoming = socket.challenges.filter((challenge) =>
    challenge.fromName !== name && (challenge.targetName === null || challenge.targetName === name),
  );
  const others = socket.players.filter((player) => player.name !== name);
  const waiting = socket.myChallengeId !== null;
  return (
    <div style={{ position: "relative" }} ref={panelRef}>
      <button
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        aria-label="Show online players, chat, and challenges"
      style={{
        display: "flex",
        alignItems: "center",
        gap: 8,
        background: "var(--cin-surface)",
        backdropFilter: "blur(10px)",
        border: "1px solid var(--cin-border)",
        padding: "8px 15px",
        borderRadius: 20,
        fontFamily: "'JetBrains Mono', monospace",
        fontSize: 12,
        color: "var(--cin-dim)",
        animation: "cin-pulseSubtle 2.5s ease-in-out infinite",
        whiteSpace: "nowrap",
      }}>
      <Globe2 size={14} color="var(--cin-cyan)" />
      <span
        style={{
          width: 6,
          height: 6,
          borderRadius: "50%",
          backgroundColor: "#22c55e",
          boxShadow: "0 0 10px #22c55e",
          display: "inline-block",
          flexShrink: 0,
        }}
      />
      {socket.connected ? `${socket.players.length} online` : "reconnecting"}
      </button>
      {open && (
        <div style={{ position: "absolute", top: "calc(100% + 10px)", right: 0, width: 340, padding: 16, borderRadius: 14, background: "rgba(10,15,42,0.98)", border: "1px solid var(--cin-border-strong)", boxShadow: "0 16px 40px rgba(0,0,0,0.4)", zIndex: 70 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 5 }}>
            <div style={{ color: "var(--cin-text)", fontSize: 13, fontWeight: 700 }}>Live arena</div>
            <button onClick={() => setOpen(false)} aria-label="Close live arena" style={{ background: "none", border: 0, color: "var(--cin-dim)", cursor: "pointer" }}><X size={15} /></button>
          </div>
          <div style={{ color: "var(--cin-faint)", fontSize: 10, marginBottom: 12 }}>Anonymous display names · chat and quick challenges</div>
          {!socket.registered ? (
            <div style={{ display: "flex", gap: 6, marginBottom: 12 }}>
              <input value={name} onChange={(e) => setName(e.target.value)} onKeyDown={(e) => e.key === "Enter" && submitName()} placeholder="Choose a racer name" maxLength={30} style={{ flex: 1, minWidth: 0, borderRadius: 8, border: "1px solid var(--cin-border)", background: "rgba(255,255,255,.05)", color: "var(--cin-text)", padding: "8px 9px", fontSize: 11 }} />
              <button onClick={submitName} disabled={!socket.connected || name.trim().length < 2} style={{ border: 0, borderRadius: 8, background: "var(--cin-cyan)", color: "#071018", fontWeight: 800, fontSize: 11, padding: "0 10px", cursor: "pointer" }}>Join</button>
            </div>
          ) : (
            <>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 7 }}>
                <span style={{ color: "var(--cin-dim)", fontSize: 11 }}>{socket.players.length} online now</span>
                <button onClick={() => navigate("/race")} style={{ border: 0, background: "none", color: "var(--cin-cyan)", fontSize: 10, cursor: "pointer" }}>Open arena →</button>
              </div>
              <div style={{ maxHeight: 118, overflowY: "auto", borderTop: "1px solid var(--cin-border)", borderBottom: "1px solid var(--cin-border)", padding: "5px 0", marginBottom: 10 }}>
                {others.length === 0 ? <div style={{ color: "var(--cin-dim)", fontSize: 11, padding: "7px 0" }}>No other racers yet.</div> : others.map((player) => (
                  <div key={player.id} style={{ display: "flex", alignItems: "center", gap: 7, padding: "5px 0" }}>
                    <span style={{ width: 6, height: 6, borderRadius: "50%", background: player.inRace ? "var(--cin-amber)" : "#22c55e", flexShrink: 0 }} />
                    <span style={{ flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", color: "var(--cin-text)", fontSize: 11 }}>{player.name}{player.country ? ` · ${player.country}` : ""}</span>
                    <button disabled={player.inRace || waiting} onClick={() => setTarget(player.name)} style={{ border: "1px solid var(--cin-border)", borderRadius: 6, background: target === player.name ? "rgba(91,227,216,.12)" : "transparent", color: target === player.name ? "var(--cin-cyan)" : "var(--cin-dim)", fontSize: 9, padding: "3px 6px", cursor: player.inRace ? "not-allowed" : "pointer" }}>{player.inRace ? "Racing" : target === player.name ? "Selected" : "Challenge"}</button>
                  </div>
                ))}
              </div>
              {incoming.map((challenge) => (
                <div key={challenge.id} style={{ display: "flex", alignItems: "center", gap: 7, padding: "7px 8px", marginBottom: 8, borderRadius: 8, background: "rgba(240,184,79,.1)", border: "1px solid rgba(240,184,79,.25)" }}>
                  <Swords size={14} color="var(--cin-amber)" />
                  <span style={{ flex: 1, color: "var(--cin-text)", fontSize: 10 }}>{challenge.fromName} wants to race</span>
                  <button onClick={() => socket.acceptChallenge(challenge.id)} style={{ border: 0, borderRadius: 6, background: "var(--cin-amber)", color: "#171006", fontWeight: 800, fontSize: 9, padding: "5px 7px", cursor: "pointer" }}>Accept</button>
                </div>
              ))}
              <div style={{ display: "flex", gap: 6, marginBottom: 9 }}>
                <select value={courseId ?? ""} onChange={(e) => setCourseId(Number(e.target.value))} style={{ flex: 1, minWidth: 0, borderRadius: 7, border: "1px solid var(--cin-border)", background: "#0c1230", color: "var(--cin-dim)", fontSize: 10, padding: "6px 4px" }}>
                  {courses?.map((course) => <option key={course.id} value={course.id}>{course.name}</option>)}
                </select>
                <select value={level} onChange={(e) => setLevel(e.target.value as Level)} style={{ width: 92, borderRadius: 7, border: "1px solid var(--cin-border)", background: "#0c1230", color: "var(--cin-dim)", fontSize: 10, padding: "6px 4px" }}>
                  <option value="beginner">Beginner</option><option value="intermediate">Intermediate</option><option value="advanced">Advanced</option>
                </select>
              </div>
              <button disabled={courseId === null || waiting} onClick={() => socket.createChallenge(courseId as number, level, target)} style={{ width: "100%", border: 0, borderRadius: 8, background: waiting ? "rgba(255,255,255,.08)" : "linear-gradient(90deg, var(--cin-cyan), var(--cin-violet))", color: waiting ? "var(--cin-dim)" : "#071018", fontWeight: 800, fontSize: 11, padding: "8px", cursor: waiting ? "not-allowed" : "pointer", marginBottom: 10 }}>{waiting ? "Challenge waiting…" : target ? `Challenge ${target}` : "Find a random rival"}</button>
              {waiting && <button onClick={() => { socket.cancelChallenge(); setTarget(null); }} style={{ display: "block", margin: "-4px auto 9px", border: 0, background: "none", color: "var(--cin-rose)", fontSize: 10, cursor: "pointer" }}>Cancel challenge</button>}
              <div style={{ display: "flex", alignItems: "center", gap: 5, marginBottom: 5, color: "var(--cin-dim)", fontSize: 10 }}><MessageCircle size={13} /> Lobby chat</div>
              <div style={{ maxHeight: 92, overflowY: "auto", padding: "5px 0", borderTop: "1px solid var(--cin-border)", marginBottom: 7 }}>
                {socket.chatMessages.slice(-8).map((message, index) => <div key={`${message.at}-${index}`} style={{ fontSize: 10, color: "var(--cin-dim)", padding: "2px 0", overflowWrap: "anywhere" }}><strong style={{ color: message.fromName === name ? "var(--cin-cyan)" : "var(--cin-text)" }}>{message.fromName}:</strong> {message.text}</div>)}
              </div>
              <div style={{ display: "flex", gap: 6 }}>
                <input value={draft} onChange={(e) => setDraft(e.target.value)} onKeyDown={(e) => e.key === "Enter" && sendMessage()} placeholder="Say something…" maxLength={200} style={{ flex: 1, minWidth: 0, borderRadius: 7, border: "1px solid var(--cin-border)", background: "rgba(255,255,255,.05)", color: "var(--cin-text)", padding: "7px 8px", fontSize: 10 }} />
                <button onClick={sendMessage} disabled={!draft.trim()} aria-label="Send chat message" style={{ border: 0, borderRadius: 7, background: "rgba(91,227,216,.15)", color: "var(--cin-cyan)", width: 30, cursor: "pointer" }}><Send size={13} /></button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

const STARS = [1, 2, 3, 4, 5];

function FeedbackButton() {
  const [open, setOpen] = useState(false);
  const [hovered, setHovered] = useState(0);
  const [selected, setSelected] = useState(0);
  const [comment, setComment] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "done" | "error">("idle");
  const popoverRef = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const reset = () => {
    setSelected(0);
    setHovered(0);
    setComment("");
    setStatus("idle");
  };

  const submit = async () => {
    if (!selected) return;
    setStatus("sending");
    try {
      const base = import.meta.env.BASE_URL.replace(/\/$/, "");
      const res = await fetch(`${base}/api/feedback`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rating: selected, comment: comment.trim() || null }),
      });
      if (!res.ok) throw new Error("server error");
      setStatus("done");
      setTimeout(() => { setOpen(false); reset(); }, 1800);
    } catch {
      setStatus("error");
    }
  };

  const activeStars = hovered || selected;

  return (
    <div style={{ position: "relative" }} ref={popoverRef}>
      {/* Trigger button */}
      <button
        onClick={() => { setOpen((p) => !p); if (open) reset(); }}
        title="Rate this app"
        style={{
          display: "flex",
          alignItems: "center",
          gap: 6,
          background: "var(--cin-surface)",
          backdropFilter: "blur(10px)",
          border: "1px solid var(--cin-border)",
          padding: "8px 14px",
          borderRadius: 20,
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: 12,
          color: "var(--cin-dim)",
          cursor: "pointer",
          whiteSpace: "nowrap",
          transition: "border-color 0.2s, color 0.2s",
        }}
        onMouseEnter={(e) => {
          (e.currentTarget as HTMLElement).style.borderColor = "#f59e0b88";
          (e.currentTarget as HTMLElement).style.color = "#f59e0b";
        }}
        onMouseLeave={(e) => {
          (e.currentTarget as HTMLElement).style.borderColor = "var(--cin-border)";
          (e.currentTarget as HTMLElement).style.color = "var(--cin-dim)";
        }}
      >
        ⭐ Rate
      </button>

      {/* Popover */}
      {open && (
        <div
          style={{
            position: "absolute",
            top: "calc(100% + 10px)",
            right: 0,
            width: 280,
            background: "rgba(10,12,24,0.97)",
            backdropFilter: "blur(16px)",
            border: "1px solid var(--cin-border-strong)",
            borderRadius: 16,
            padding: 20,
            zIndex: 200,
            boxShadow: "0 8px 32px rgba(0,0,0,0.5)",
            animation: "cin-slideDown 0.18s ease-out both",
          }}
        >
          {status === "done" ? (
            <div style={{ textAlign: "center", padding: "12px 0" }}>
              <div style={{ fontSize: 32, marginBottom: 8 }}>🎉</div>
              <div style={{ fontFamily: "'Inter', sans-serif", fontWeight: 700, color: "var(--cin-text)", fontSize: 15 }}>
                Thanks for the feedback!
              </div>
            </div>
          ) : (
            <>
              <div style={{ fontFamily: "'Inter', sans-serif", fontWeight: 700, fontSize: 14, color: "var(--cin-text)", marginBottom: 4 }}>
                How are we doing?
              </div>
              <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 12, color: "var(--cin-dim)", marginBottom: 14 }}>
                Tap a star to rate your experience
              </div>

              {/* Stars */}
              <div style={{ display: "flex", gap: 6, justifyContent: "center", marginBottom: 14 }}>
                {STARS.map((s) => (
                  <button
                    key={s}
                    onClick={() => setSelected(s)}
                    onMouseEnter={() => setHovered(s)}
                    onMouseLeave={() => setHovered(0)}
                    style={{
                      background: "none",
                      border: "none",
                      cursor: "pointer",
                      fontSize: 28,
                      lineHeight: 1,
                      transform: s <= activeStars ? "scale(1.15)" : "scale(1)",
                      transition: "transform 0.12s, filter 0.12s",
                      filter: s <= activeStars ? "drop-shadow(0 0 6px #f59e0b)" : "grayscale(1) opacity(0.4)",
                      padding: 0,
                    }}
                    aria-label={`Rate ${s} star${s > 1 ? "s" : ""}`}
                  >
                    ⭐
                  </button>
                ))}
              </div>

              {/* Star label */}
              <div style={{ textAlign: "center", fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: "#f59e0b", minHeight: 16, marginBottom: 12 }}>
                {activeStars === 1 && "Needs work"}
                {activeStars === 2 && "Could be better"}
                {activeStars === 3 && "Pretty good"}
                {activeStars === 4 && "Love it!"}
                {activeStars === 5 && "Absolutely amazing! 🚀"}
              </div>

              {/* Comment box */}
              <textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Tell us more (optional)..."
                maxLength={500}
                rows={3}
                style={{
                  width: "100%",
                  background: "rgba(255,255,255,0.04)",
                  border: "1px solid var(--cin-border)",
                  borderRadius: 10,
                  padding: "8px 10px",
                  fontFamily: "'Inter', sans-serif",
                  fontSize: 12,
                  color: "var(--cin-text)",
                  resize: "none",
                  outline: "none",
                  marginBottom: 12,
                  boxSizing: "border-box",
                }}
              />

              {status === "error" && (
                <div style={{ fontSize: 11, color: "#f87171", marginBottom: 8, textAlign: "center" }}>
                  Something went wrong. Please try again.
                </div>
              )}

              <button
                onClick={submit}
                disabled={!selected || status === "sending"}
                style={{
                  width: "100%",
                  padding: "9px 0",
                  borderRadius: 10,
                  border: "none",
                  background: selected ? "linear-gradient(90deg, var(--cin-cyan), var(--cin-violet))" : "rgba(255,255,255,0.08)",
                  color: selected ? "#000" : "var(--cin-dim)",
                  fontFamily: "'Inter', sans-serif",
                  fontWeight: 700,
                  fontSize: 13,
                  cursor: selected ? "pointer" : "not-allowed",
                  transition: "opacity 0.2s",
                  opacity: status === "sending" ? 0.6 : 1,
                }}
              >
                {status === "sending" ? "Sending…" : "Submit Feedback"}
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}

export function Navbar() {
  const [location] = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);

  // Close menu on navigation
  useEffect(() => { setMenuOpen(false); }, [location]);

  // Prevent body scroll when menu is open
  useEffect(() => {
    document.body.style.overflow = menuOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [menuOpen]);

  return (
    <>
      <nav
        className="cin-nav-padding"
        style={{
          position: "sticky",
          top: 0,
          zIndex: 50,
          width: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
           padding: "18px 32px",
          backdropFilter: "blur(10px)",
          borderBottom: "1px solid var(--cin-border)",
          backgroundColor: "rgba(5,7,15,0.88)",
          animation: "cin-slideDown 0.7s ease-out 0.1s both",
        }}
      >
        {/* Logo */}
        <Link
          href="/"
          style={{ display: "flex", alignItems: "center", gap: 11, textDecoration: "none" }}
        >
          <div
            style={{
              width: 34,
              height: 34,
              borderRadius: 9,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              background: "linear-gradient(140deg, rgba(143,123,240,0.25), rgba(91,227,216,0.1))",
              border: "1px solid var(--cin-border-strong)",
              color: "var(--cin-cyan)",
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: 14,
              fontWeight: 800,
              animation: "cin-pulse 3s ease-in-out infinite",
              flexShrink: 0,
              userSelect: "none",
            }}
          >
            &gt;_
          </div>
          <span
            style={{
              fontFamily: "'Inter', sans-serif",
              fontSize: 16,
              fontWeight: 700,
              color: "var(--cin-text)",
              letterSpacing: "-0.015em",
            }}
          >
            TechInterview
            <span
              style={{
                background: "linear-gradient(90deg, var(--cin-cyan), var(--cin-violet))",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
              }}
            >
              Prep
            </span>
          </span>
        </Link>

        {/* Desktop nav links */}
        <div
          className="cin-nav-links"
           style={{ display: "flex", alignItems: "center", gap: 22, flexShrink: 0 }}
        >
          {LINKS.map(({ href, label, badge }) => (
            <NavLink key={href} href={href} label={label} badge={badge} location={location} />
          ))}
          <OnlineBadge />
          <FeedbackButton />
        </div>

        {/* Mobile right side: online badge + hamburger */}
        <div className="cin-mobile-controls" style={{ display: "none", alignItems: "center", gap: 10 }}>
          <OnlineBadge />
          <button
            onClick={() => setMenuOpen((p) => !p)}
            aria-label={menuOpen ? "Close menu" : "Open menu"}
            aria-expanded={menuOpen}
            style={{
              background: "none",
              border: "1px solid var(--cin-border)",
              borderRadius: 8,
              color: "var(--cin-text)",
              cursor: "pointer",
              width: 38,
              height: 38,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 18,
              transition: "border-color 0.2s, background 0.2s",
              flexShrink: 0,
            }}
          >
            {menuOpen ? "✕" : "☰"}
          </button>
        </div>
      </nav>

      {/* Mobile drawer */}
      {menuOpen && (
        <>
          {/* Backdrop */}
          <div
            onClick={() => setMenuOpen(false)}
            style={{
              position: "fixed",
              inset: 0,
              zIndex: 48,
              background: "rgba(5,7,15,0.55)",
              backdropFilter: "blur(2px)",
            }}
          />
          {/* Menu panel */}
          <div
            style={{
              position: "fixed",
              top: 0,
              left: 0,
              right: 0,
              zIndex: 49,
              background: "rgba(5,7,15,0.97)",
              backdropFilter: "blur(12px)",
              borderBottom: "1px solid var(--cin-border-strong)",
              paddingTop: 72, // below navbar
              paddingBottom: 24,
              animation: "cin-slideDown 0.2s ease-out both",
            }}
          >
            {LINKS.map(({ href, label }) => (
              <NavLink
                key={href}
                href={href}
                label={label}
                badge={LINKS.find((item) => item.href === href)?.badge}
                location={location}
                onClick={() => setMenuOpen(false)}
                mobile
              />
            ))}
            <div style={{ padding: "14px 24px", display: "flex", alignItems: "center", gap: 8, color: "var(--cin-dim)", fontSize: 12 }}>
              <span style={{ width: 6, height: 6, borderRadius: "50%", backgroundColor: "#22c55e", boxShadow: "0 0 8px #22c55e", display: "inline-block" }} />
              <OnlineBadge />
            </div>
          </div>
        </>
      )}
    </>
  );
}
