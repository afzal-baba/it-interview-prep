import { Link, useLocation } from "wouter";
import { Terminal } from "lucide-react";

export function Navbar() {
  const [location] = useLocation();

  return (
    <nav className="sticky top-0 z-50 w-full border-b bg-background/80 backdrop-blur-md">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 group">
          <div className="bg-primary text-white p-2 rounded-lg group-hover:scale-110 transition-transform">
            <Terminal size={20} strokeWidth={2.5} />
          </div>
          <span className="font-bold text-lg tracking-tight">TechInterview<span className="text-primary">Prep</span></span>
        </Link>
        <div className="flex items-center gap-6 text-sm font-semibold">
          <Link 
            href="/" 
            className={`transition-colors ${location === '/' ? 'text-primary' : 'text-muted-foreground hover:text-foreground'}`}
          >
            Courses
          </Link>
          <Link 
            href="/leaderboard" 
            className={`transition-colors ${location === '/leaderboard' ? 'text-primary' : 'text-muted-foreground hover:text-foreground'}`}
          >
            Leaderboard
          </Link>
        </div>
      </div>
    </nav>
  );
}
