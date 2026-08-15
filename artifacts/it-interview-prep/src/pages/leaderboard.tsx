import { useState } from "react";
import { useLocation } from "wouter";
import { useListLeaderboard, useGetLeaderboardStats, useListCourses, getListLeaderboardQueryKey, getGetLeaderboardStatsQueryKey } from "@workspace/api-client-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Trophy, Medal, Users, Target, Activity, Loader2, Timer, Zap, Swords } from "lucide-react";
import { cn } from "@/lib/utils";

export default function Leaderboard() {
  const [, setLocation] = useLocation();
  const [courseFilter, setCourseFilter] = useState<number | null>(null);
  const [levelFilter, setLevelFilter] = useState<any>(null);
  const [timedFilter, setTimedFilter] = useState<boolean | null>(null);

  const { data: courses } = useListCourses();
  
  const { data: stats, isLoading: statsLoading } = useGetLeaderboardStats({
    query: { queryKey: getGetLeaderboardStatsQueryKey() } // stats are global
  });

  const { data: leaderboard, isLoading: boardLoading } = useListLeaderboard(
    { 
      courseId: courseFilter,
      level: levelFilter,
      timedMode: timedFilter,
      limit: 50
    },
    {
      query: {
        queryKey: getListLeaderboardQueryKey({ courseId: courseFilter, level: levelFilter, timedMode: timedFilter, limit: 50 })
      }
    }
  );

  const hasFilters = courseFilter !== null || levelFilter !== null || timedFilter !== null;

  return (
    <div className="w-full max-w-6xl mx-auto py-12 px-4">
      <div className="text-center mb-12">
        <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight mb-4">Global Leaderboard</h1>
        <p className="text-xl text-muted-foreground max-w-2xl mx-auto mb-6">
          See how you stack up against other developers around the world.
        </p>
        <Button size="lg" className="rounded-xl" onClick={() => setLocation("/race")}>
          <Swords className="mr-2 h-5 w-5" /> Race a Random Opponent
        </Button>
      </div>

      {/* Stats row */}
      {!statsLoading && stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-12">
          <StatCard title="Total Attempts" value={stats.totalAttempts} icon={<Users className="w-5 h-5" />} />
          <StatCard title="Avg Score" value={`${Math.round(stats.avgPercentage)}%`} icon={<Activity className="w-5 h-5" />} />
          <StatCard title="Top Score" value={`${Math.round(stats.topScore)}`} icon={<Target className="w-5 h-5" />} />
          <StatCard title="Top Player" value={stats.topScorer || "N/A"} icon={<Trophy className="w-5 h-5" />} />
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-4 mb-8 p-4 bg-white rounded-2xl border shadow-sm">
        <div className="text-sm font-bold text-muted-foreground mr-2">FILTERS:</div>
        
        <select 
          className="h-10 px-4 rounded-xl border bg-background text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary"
          value={courseFilter || ""}
          onChange={(e) => setCourseFilter(e.target.value ? Number(e.target.value) : null)}
        >
          <option value="">All Courses</option>
          {courses?.map(c => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>

        <select 
          className="h-10 px-4 rounded-xl border bg-background text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary"
          value={levelFilter || ""}
          onChange={(e) => setLevelFilter(e.target.value || null)}
        >
          <option value="">All Levels</option>
          <option value="beginner">Beginner</option>
          <option value="intermediate">Intermediate</option>
          <option value="advanced">Advanced</option>
        </select>

        {/* Timed Mode filter buttons */}
        <div className="flex items-center gap-2 ml-1">
          <button
            onClick={() => setTimedFilter(null)}
            className={cn(
              "h-10 px-4 rounded-xl border text-sm font-medium transition-all",
              timedFilter === null
                ? "bg-primary text-white border-primary"
                : "bg-background border-border hover:border-primary/50"
            )}
          >
            All
          </button>
          <button
            onClick={() => setTimedFilter(false)}
            className={cn(
              "h-10 px-4 rounded-xl border text-sm font-medium transition-all",
              timedFilter === false
                ? "bg-primary text-white border-primary"
                : "bg-background border-border hover:border-primary/50"
            )}
          >
            Standard
          </button>
          <button
            onClick={() => setTimedFilter(true)}
            className={cn(
              "h-10 px-4 rounded-xl border text-sm font-medium transition-all flex items-center gap-1.5",
              timedFilter === true
                ? "bg-orange-500 text-white border-orange-500"
                : "bg-background border-border hover:border-orange-400/50 text-orange-600"
            )}
          >
            <Timer size={13} /> Timed
          </button>
        </div>
        
        {hasFilters && (
          <button 
            className="text-sm text-primary font-bold hover:underline"
            onClick={() => { setCourseFilter(null); setLevelFilter(null); setTimedFilter(null); }}
          >
            Clear Filters
          </button>
        )}
      </div>

      {/* Leaderboard Table */}
      <Card className="shadow-lg overflow-hidden border-2">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-secondary/50 text-muted-foreground font-bold tracking-wider uppercase text-xs">
              <tr>
                <th className="px-6 py-4">Rank</th>
                <th className="px-6 py-4">Player</th>
                <th className="px-6 py-4">Course</th>
                <th className="px-6 py-4">Level</th>
                <th className="px-6 py-4">Mode</th>
                <th className="px-6 py-4 text-right">Score</th>
                <th className="px-6 py-4">Badges</th>
                <th className="px-6 py-4"></th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {boardLoading ? (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center">
                    <Loader2 className="w-8 h-8 text-primary animate-spin mx-auto mb-2" />
                    <p className="text-muted-foreground font-medium">Loading rankings...</p>
                  </td>
                </tr>
              ) : leaderboard?.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center text-muted-foreground">
                    No entries found for these filters. Be the first!
                  </td>
                </tr>
              ) : (
                leaderboard?.map((entry, idx) => (
                  <tr key={entry.id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-6 py-4 font-mono font-bold text-lg">
                      {idx === 0 && <Medal className="inline w-6 h-6 text-yellow-500 mr-2" />}
                      {idx === 1 && <Medal className="inline w-6 h-6 text-gray-400 mr-2" />}
                      {idx === 2 && <Medal className="inline w-6 h-6 text-amber-700 mr-2" />}
                      #{idx + 1}
                    </td>
                    <td className="px-6 py-4 font-bold text-base">{entry.playerName}</td>
                    <td className="px-6 py-4">{entry.courseName}</td>
                    <td className="px-6 py-4 capitalize">
                      <Badge variant="outline" className={cn(
                        entry.level === 'beginner' && "bg-blue-50 text-blue-700 border-blue-200",
                        entry.level === 'intermediate' && "bg-purple-50 text-purple-700 border-purple-200",
                        entry.level === 'advanced' && "bg-rose-50 text-rose-700 border-rose-200",
                      )}>
                        {entry.level}
                      </Badge>
                    </td>
                    <td className="px-6 py-4">
                      {entry.timedMode ? (
                        <span className="flex items-center gap-1 text-xs font-bold text-orange-500 bg-orange-50 border border-orange-200 px-2 py-0.5 rounded-full w-fit">
                          <Timer size={10} /> Timed
                          {(entry.timeBonus ?? 0) > 0 && (
                            <span className="text-orange-400 ml-0.5 flex items-center gap-0.5">
                              <Zap size={9} />+{entry.timeBonus}
                            </span>
                          )}
                        </span>
                      ) : (
                        <span className="text-xs text-muted-foreground font-medium">Standard</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right font-mono font-bold text-lg">
                      <span className={entry.percentage >= 85 ? 'text-success' : ''}>
                        {Math.round(entry.percentage)}%
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex gap-1">
                        {entry.badges.map(b => (
                          <Badge key={b} className="bg-yellow-400 text-yellow-900 border-0 text-[10px] px-2 py-0.5">
                            {b}
                          </Badge>
                        ))}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <Button
                        size="sm"
                        variant="outline"
                        className="rounded-lg font-bold"
                        onClick={() => setLocation(`/race?opponent=${encodeURIComponent(entry.playerName)}`)}
                      >
                        <Swords className="mr-1.5 h-4 w-4" /> Challenge
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

function StatCard({ title, value, icon }: any) {
  return (
    <Card className="bg-white">
      <CardContent className="p-6 flex flex-col justify-center items-center text-center">
        <div className="text-primary mb-2 p-3 bg-primary/10 rounded-full">{icon}</div>
        <div className="text-sm font-bold text-muted-foreground uppercase tracking-wider mb-1">{title}</div>
        <div className="text-2xl font-black font-mono">{value}</div>
      </CardContent>
    </Card>
  );
}
