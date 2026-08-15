import { useState } from "react";
import { useListLeaderboard, useGetLeaderboardStats, useListCourses, getListLeaderboardQueryKey, getGetLeaderboardStatsQueryKey } from "@workspace/api-client-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Trophy, Medal, Users, Target, Activity, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

export default function Leaderboard() {
  const [courseFilter, setCourseFilter] = useState<number | null>(null);
  const [levelFilter, setLevelFilter] = useState<any>(null);

  const { data: courses } = useListCourses();
  
  const { data: stats, isLoading: statsLoading } = useGetLeaderboardStats({
    query: { queryKey: getGetLeaderboardStatsQueryKey() } // stats are global
  });

  const { data: leaderboard, isLoading: boardLoading } = useListLeaderboard(
    { 
      courseId: courseFilter,
      level: levelFilter,
      limit: 50
    },
    {
      query: {
        queryKey: getListLeaderboardQueryKey({ courseId: courseFilter, level: levelFilter, limit: 50 })
      }
    }
  );

  return (
    <div className="w-full max-w-6xl mx-auto py-12 px-4">
      <div className="text-center mb-12">
        <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight mb-4">Global Leaderboard</h1>
        <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
          See how you stack up against other developers around the world.
        </p>
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
        
        {(courseFilter || levelFilter) && (
          <button 
            className="text-sm text-primary font-bold hover:underline"
            onClick={() => { setCourseFilter(null); setLevelFilter(null); }}
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
                <th className="px-6 py-4 text-right">Score</th>
                <th className="px-6 py-4">Badges</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {boardLoading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center">
                    <Loader2 className="w-8 h-8 text-primary animate-spin mx-auto mb-2" />
                    <p className="text-muted-foreground font-medium">Loading rankings...</p>
                  </td>
                </tr>
              ) : leaderboard?.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-muted-foreground">
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
