import { Link, useLocation } from "wouter";
import { Terminal, Circle } from "lucide-react";
import { useEffect, useState } from "react";

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

export function Navbar() {
  const [location] = useLocation();
  const online = useOnlineCount();

  return (
    <nav className="sticky top-0 z-50 w-full border-b bg-background/80 backdrop-blur-md">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 group">
          <div className="bg-primary text-white p-2 rounded-lg group-hover:scale-110 transition-transform">
            <Terminal size={20} strokeWidth={2.5} />
          </div>
          <span className="font-bold text-lg tracking-tight">
            TechInterview<span className="text-primary">Prep</span>
          </span>
        </Link>

        <div className="flex items-center gap-6 text-sm font-semibold">
          <Link
            href="/"
            className={`transition-colors ${location === "/" ? "text-primary" : "text-muted-foreground hover:text-foreground"}`}
          >
            Courses
          </Link>
          <Link
            href="/leaderboard"
            className={`transition-colors ${location === "/leaderboard" ? "text-primary" : "text-muted-foreground hover:text-foreground"}`}
          >
            Leaderboard
          </Link>
          <Link
            href="/race"
            className={`transition-colors ${location === "/race" ? "text-primary" : "text-muted-foreground hover:text-foreground"}`}
          >
            Challenge
          </Link>
          <Link
            href="/about"
            className={`transition-colors ${location === "/about" ? "text-primary" : "text-muted-foreground hover:text-foreground"}`}
          >
            About
          </Link>

          {online !== null && (
            <span className="hidden sm:flex items-center gap-1.5 text-xs font-medium text-muted-foreground bg-muted px-3 py-1.5 rounded-full border">
              <Circle size={7} className="fill-green-500 text-green-500 animate-pulse" />
              {online} online
            </span>
          )}
        </div>
      </div>
    </nav>
  );
}
