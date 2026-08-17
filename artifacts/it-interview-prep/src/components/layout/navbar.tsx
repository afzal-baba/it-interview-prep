import { Link, useLocation } from "wouter";
import { useEffect, useRef, useState } from "react";

function useOnlineCount() {
  const [count, setCount] = useState<number | null>(null);
  useEffect(() => {
    const base = import.meta.env.BASE_URL.replace(/\/$/, "");
    const fetchCount = () =>
      fetch(`${base}/api/online`)
        .then((r) => r.json())
        .then((d) => setCount(d.count))
        .catch(() => {});
    fetchCount();
    const interval = setInterval(fetchCount, 15_000);
    return () => clearInterval(interval);
  }, []);
  return count;
}

const LINKS = [
  { href: "/", label: "Courses" },
  { href: "/leaderboard", label: "Leaderboard" },
  { href: "/race", label: "Challenge" },
  { href: "/lab", label: "Code Lab" },
  { href: "/about", label: "About" },
];

function NavLink({
  href,
  label,
  location,
  onClick,
  mobile,
}: {
  href: string;
  label: string;
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
        {label}
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
      {label}
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

function OnlineBadge({ count }: { count: number }) {
  return (
    <div
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
      }}
    >
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
      {count} online
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
  const online = useOnlineCount();
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
          padding: "20px 56px",
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
          style={{ display: "flex", alignItems: "center", gap: 38 }}
        >
          {LINKS.map(({ href, label }) => (
            <NavLink key={href} href={href} label={label} location={location} />
          ))}
          {online !== null && <OnlineBadge count={online} />}
          <FeedbackButton />
        </div>

        {/* Mobile right side: online badge + hamburger */}
        <div className="cin-mobile-controls" style={{ display: "none", alignItems: "center", gap: 10 }}>
          {online !== null && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: 11,
                color: "var(--cin-dim)",
              }}
            >
              <span style={{ width: 6, height: 6, borderRadius: "50%", backgroundColor: "#22c55e", boxShadow: "0 0 8px #22c55e", display: "inline-block", flexShrink: 0 }} />
              {online}
            </div>
          )}
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
                location={location}
                onClick={() => setMenuOpen(false)}
                mobile
              />
            ))}
            {online !== null && (
              <div style={{ padding: "14px 24px", display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ width: 6, height: 6, borderRadius: "50%", backgroundColor: "#22c55e", boxShadow: "0 0 8px #22c55e", display: "inline-block" }} />
                <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 12, color: "var(--cin-dim)" }}>{online} online now</span>
              </div>
            )}
          </div>
        </>
      )}
    </>
  );
}
