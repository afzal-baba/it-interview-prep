import { useState } from "react";
import { Bot, Send, X, Sparkles } from "lucide-react";

type GuideMessage = { role: "user" | "assistant"; content: string };

const greeting: GuideMessage = {
  role: "assistant",
  content: "Not sure where to begin? Tell me your experience, target role, or a technology you want to learn and I’ll suggest a first step.",
};

export function GuideBot() {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<GuideMessage[]>([greeting]);
  const [sending, setSending] = useState(false);

  const send = async () => {
    const message = input.trim();
    if (!message || sending) return;
    const nextMessages = [...messages, { role: "user" as const, content: message }];
    setMessages(nextMessages);
    setInput("");
    setSending(true);
    try {
      const base = import.meta.env.BASE_URL.replace(/\/$/, "");
      const response = await fetch(`${base}/api/guide`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message, history: messages.slice(-8) }),
      });
      const data = await response.json() as { reply?: string };
      if (!response.ok) throw new Error("Guide unavailable");
      setMessages([...nextMessages, { role: "assistant", content: data.reply ?? "Try starting with a beginner course in a technology you use at work." }]);
    } catch {
      setMessages([...nextMessages, { role: "assistant", content: "I’m having trouble connecting right now. Browse the beginner courses and choose the technology closest to your current work." }]);
    } finally {
      setSending(false);
    }
  };

  return (
    <div style={{ position: "fixed", left: 24, bottom: 24, zIndex: 60, fontFamily: "'Inter', sans-serif" }}>
      {open && (
        <div
          style={{
            width: "min(360px, calc(100vw - 32px))",
            height: 440,
            marginBottom: 12,
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
            background: "rgba(10,15,42,0.97)",
            border: "1px solid var(--cin-border-strong)",
            borderRadius: 18,
            boxShadow: "0 18px 60px rgba(0,0,0,0.45), 0 0 28px rgba(91,227,216,0.08)",
            backdropFilter: "blur(18px)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "15px 16px", borderBottom: "1px solid var(--cin-border)" }}>
            <div style={{ width: 32, height: 32, display: "grid", placeItems: "center", borderRadius: 10, background: "rgba(91,227,216,0.12)", color: "var(--cin-cyan)" }}>
              <Sparkles size={16} />
            </div>
            <div style={{ flex: 1 }}>
              <strong style={{ display: "block", color: "var(--cin-text)", fontSize: 13 }}>Study guide</strong>
              <span style={{ color: "var(--cin-faint)", fontSize: 11 }}>Find your best starting point</span>
            </div>
            <button aria-label="Close study guide" onClick={() => setOpen(false)} style={{ border: 0, background: "transparent", color: "var(--cin-dim)", cursor: "pointer" }}>
              <X size={17} />
            </button>
          </div>
          <div style={{ flex: 1, overflowY: "auto", padding: 14, display: "flex", flexDirection: "column", gap: 10 }}>
            {messages.map((item, index) => (
              <div key={`${item.role}-${index}`} style={{ alignSelf: item.role === "user" ? "flex-end" : "flex-start", maxWidth: "88%", padding: "9px 11px", borderRadius: item.role === "user" ? "12px 12px 3px 12px" : "12px 12px 12px 3px", background: item.role === "user" ? "linear-gradient(135deg, var(--cin-violet), #5f78f0)" : "rgba(255,255,255,0.06)", color: "#fff", fontSize: 12.5, lineHeight: 1.5, whiteSpace: "pre-wrap" }}>
                {item.content}
              </div>
            ))}
            {sending && <div style={{ alignSelf: "flex-start", color: "var(--cin-cyan)", fontSize: 12, padding: "4px 8px" }}>Thinking…</div>}
          </div>
          <form onSubmit={(event) => { event.preventDefault(); void send(); }} style={{ display: "flex", gap: 8, padding: 12, borderTop: "1px solid var(--cin-border)" }}>
            <input value={input} onChange={(event) => setInput(event.target.value)} placeholder="What should I learn first?" aria-label="Ask the study guide" maxLength={600} style={{ minWidth: 0, flex: 1, padding: "10px 11px", borderRadius: 10, border: "1px solid var(--cin-border)", background: "rgba(255,255,255,0.04)", color: "var(--cin-text)", outline: "none", fontSize: 12 }} />
            <button type="submit" aria-label="Send message" disabled={!input.trim() || sending} style={{ width: 38, height: 38, padding: 0, display: "flex", alignItems: "center", justifyContent: "center", border: 0, borderRadius: 10, background: "var(--cin-cyan)", color: "#071019", cursor: input.trim() && !sending ? "pointer" : "not-allowed", opacity: input.trim() && !sending ? 1 : 0.45 }}>
              <Send size={15} />
            </button>
          </form>
        </div>
      )}
      <button onClick={() => setOpen((value) => !value)} aria-label={open ? "Close study guide" : "Open study guide"} aria-expanded={open} style={{ marginLeft: "auto", width: 52, height: 52, display: "grid", placeItems: "center", border: "1px solid rgba(91,227,216,0.5)", borderRadius: "50%", background: "linear-gradient(135deg, var(--cin-cyan), #5f78f0)", color: "#071019", cursor: "pointer", boxShadow: "0 8px 28px rgba(0,0,0,0.35), 0 0 24px rgba(91,227,216,0.25)" }}>
        {open ? <X size={20} /> : <Bot size={21} />}
      </button>
    </div>
  );
}