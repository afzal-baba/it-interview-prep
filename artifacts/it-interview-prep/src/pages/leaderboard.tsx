import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import {
  useListLeaderboard,
  useGetLeaderboardStats,
  useListCourses,
  useListCodelabLeaderboard,
  getListLeaderboardQueryKey,
  getGetLeaderboardStatsQueryKey,
  getListCodelabLeaderboardQueryKey,
} from "@workspace/api-client-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Trophy, Medal, Users, Target, Activity, Loader2, Timer, Zap, Swords, FlaskConical, Code2 } from "lucide-react";
import { cn } from "@/lib/utils";

type TabKind = "quiz" | "codelab";

/** Crown + title decoration for top-2 players, respecting self-reported gender */
function RoyalBadge({ rank, gender }: { rank: number; gender?: string | null }) {
  if (rank > 1) return null;

  const isKing = gender === "M" || (gender == null && rank === 0);
  const isFirst = rank === 0;

  const colorStyle = isFirst
    ? { bg: "linear-gradient(135deg, #f59e0b22, #eab30844)", border: "#f59e0b66", text: "#f59e0b" }
    : { bg: "linear-gradient(135deg, #a78bfa22, #c4b5fd44)", border: "#a78bfa66", text: "#a78bfa" };

  const label = isKing ? "👑 King" : "👸 Queen";
  const title = `${isKing ? "King" : "Queen"} — #${rank + 1} on the leaderboard`;

  return (
    <span
      title={title}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 4,
        background: colorStyle.bg,
        border: `1px solid ${colorStyle.border}`,
        borderRadius: 20,
        padding: "2px 8px",
        fontSize: 11,
        fontWeight: 800,
        color: colorStyle.text,
        letterSpacing: "0.03em",
        whiteSpace: "nowrap",
      }}
    >
      {label}
    </span>
  );
}

export default function Leaderboard() {
  const [, setLocation] = useLocation();
  const [activeTab, setActiveTab] = useState<TabKind>("quiz");
  const [courseFilter, setCourseFilter] = useState<number | null>(null);
  const [levelFilter, setLevelFilter] = useState<any>(null);
  const [timedFilter, setTimedFilter] = useState<boolean | null>(null);

  useEffect(() => {
    document.title = "Leaderboard — TechInterviewPrep";
  }, []);

  const { data: courses } = useListCourses();

  const { data: stats, isLoading: statsLoading } = useGetLeaderboardStats({
    query: { queryKey: getGetLeaderboardStatsQueryKey() },
  });

  const { data: leaderboard, isLoading: boardLoading } = useListLeaderboard(
    {
      courseId: courseFilter,
      level: levelFilter,
      timedMode: timedFilter,
      limit: 50,
    },
    {
      query: {
        queryKey: getListLeaderboardQueryKey({
          courseId: courseFilter,
          level: levelFilter,
          timedMode: timedFilter,
          limit: 50,
        }),
      },
    }
  );

  const { data: codelabBoard, isLoading: codelabLoading } = useListCodelabLeaderboard(
    { limit: 50 },
    {
      query: { queryKey: getListCodelabLeaderboardQueryKey({ limit: 50 }) },
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

      {/* Stats row (quiz tab only) */}
      {activeTab === "quiz" && !statsLoading && stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-12">
          <StatCard title="Total Attempts" value={stats.totalAttempts} icon={<Users className="w-5 h-5" />} />
          <StatCard title="Avg Score" value={`${Math.round(stats.avgPercentage)}%`} icon={<Activity className="w-5 h-5" />} />
          <StatCard title="Top Score" value={`${Math.round(stats.topScore)}`} icon={<Target className="w-5 h-5" />} />
          <StatCard title="Top Player" value={stats.topScorer || "N/A"} icon={<Trophy className="w-5 h-5" />} />
        </div>
      )}

      {/* Tab switcher */}
      <div className="flex items-center gap-2 mb-6 p-1 bg-secondary/40 rounded-2xl w-fit">
        <button
          onClick={() => setActiveTab("quiz")}
          className={cn(
            "flex items-center gap-2 h-10 px-5 rounded-xl text-sm font-bold transition-all",
            activeTab === "quiz"
              ? "text-primary shadow-sm border border-border/60"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          <Trophy size={15} /> Quiz Rankings
        </button>
        <button
          onClick={() => setActiveTab("codelab")}
          className={cn(
            "flex items-center gap-2 h-10 px-5 rounded-xl text-sm font-bold transition-all",
            activeTab === "codelab"
              ? "text-primary shadow-sm border border-border/60"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          <Code2 size={15} /> Code Lab
        </button>
      </div>

      {activeTab === "quiz" ? (
        <>
          {/* Filters */}
          <div className="flex flex-wrap items-center gap-4 mb-8 p-4 rounded-2xl border border-border/60" style={{ background: "var(--cin-surface)", backdropFilter: "blur(12px)" }}>
            <div className="text-sm font-bold text-muted-foreground mr-2">FILTERS:</div>

            <select
              className="h-10 px-4 rounded-xl border bg-background text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary"
              value={courseFilter || ""}
              onChange={(e) => setCourseFilter(e.target.value ? Number(e.target.value) : null)}
            >
              <option value="">All Courses</option>
              {courses?.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
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
                onClick={() => {
                  setCourseFilter(null);
                  setLevelFilter(null);
                  setTimedFilter(null);
                }}
              >
                Clear Filters
              </button>
            )}
          </div>

          {/* Quiz Leaderboard Table */}
          <Card className="shadow-lg overflow-hidden border-2">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm whitespace-nowrap">
                <thead className="bg-secondary/50 text-muted-foreground font-bold tracking-wider uppercase text-xs">
                  <tr>
                    <th className="px-6 py-4">Rank</th>
                    <th className="px-6 py-4">Player & Course</th>
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
                      <tr
                        key={entry.id}
                        className="hover:bg-muted/30 transition-colors"
                        style={
                          idx === 0
                            ? { background: "linear-gradient(90deg, rgba(245,158,11,0.08), transparent)" }
                            : idx === 1
                            ? { background: "linear-gradient(90deg, rgba(167,139,250,0.08), transparent)" }
                            : undefined
                        }
                      >
                        <td className="px-6 py-4 font-mono font-bold text-lg">
                          {idx === 0 && <Medal className="inline w-6 h-6 text-yellow-500 mr-2" />}
                          {idx === 1 && <Medal className="inline w-6 h-6 text-gray-400 mr-2" />}
                          {idx === 2 && <Medal className="inline w-6 h-6 text-amber-700 mr-2" />}
                          #{idx + 1}
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex flex-col gap-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-bold text-base leading-tight">{entry.playerName}</span>
                              <RoyalBadge rank={idx} gender={entry.gender} />
                            </div>
                            <span className="text-xs text-muted-foreground font-medium truncate max-w-[200px]">
                              📚 {entry.courseName}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4 capitalize">
                          <Badge
                            variant="outline"
                            className={cn(
                              entry.level === "beginner" && "bg-blue-50 text-blue-700 border-blue-200",
                              entry.level === "intermediate" && "bg-purple-50 text-purple-700 border-purple-200",
                              entry.level === "advanced" && "bg-rose-50 text-rose-700 border-rose-200"
                            )}
                          >
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
                          <span className={entry.percentage >= 85 ? "text-success" : ""}>
                            {Math.round(entry.percentage)}%
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex gap-1">
                            {entry.badges.map((b) => (
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
                            onClick={() =>
                              setLocation(`/race?opponent=${encodeURIComponent(entry.playerName)}`)
                            }
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
        </>
      ) : (
        /* Code Lab leaderboard */
        <>
          <div className="flex items-center gap-3 mb-6 p-4 rounded-2xl border border-border/60" style={{ background: "var(--cin-surface)", backdropFilter: "blur(12px)" }}>
            <FlaskConical className="w-5 h-5 text-primary" />
            <p className="text-sm text-muted-foreground">
              Rankings are based on self-assessed Code Lab challenge scores across all 40 technologies.
              Complete challenges at <button className="text-primary font-semibold hover:underline" onClick={() => setLocation("/lab")}>Code Lab</button> to appear here.
            </p>
          </div>

          <Card className="shadow-lg overflow-hidden border-2">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm whitespace-nowrap">
                <thead className="bg-secondary/50 text-muted-foreground font-bold tracking-wider uppercase text-xs">
                  <tr>
                    <th className="px-6 py-4">Rank</th>
                    <th className="px-6 py-4">Player</th>
                    <th className="px-6 py-4 text-right">Total Points</th>
                    <th className="px-6 py-4 text-right">Challenges Done</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {codelabLoading ? (
                    <tr>
                      <td colSpan={4} className="px-6 py-12 text-center">
                        <Loader2 className="w-8 h-8 text-primary animate-spin mx-auto mb-2" />
                        <p className="text-muted-foreground font-medium">Loading rankings...</p>
                      </td>
                    </tr>
                  ) : !codelabBoard?.length ? (
                    <tr>
                      <td colSpan={4} className="px-6 py-12 text-center text-muted-foreground">
                        No Code Lab scores yet. Be the first to complete a challenge!
                      </td>
                    </tr>
                  ) : (
                    codelabBoard.map((entry, idx) => (
                      <tr
                        key={entry.playerName}
                        className="hover:bg-muted/30 transition-colors"
                        style={
                          idx === 0
                            ? { background: "linear-gradient(90deg, rgba(245,158,11,0.08), transparent)" }
                            : idx === 1
                            ? { background: "linear-gradient(90deg, rgba(167,139,250,0.08), transparent)" }
                            : undefined
                        }
                      >
                        <td className="px-6 py-4 font-mono font-bold text-lg">
                          {idx === 0 && <Medal className="inline w-6 h-6 text-yellow-500 mr-2" />}
                          {idx === 1 && <Medal className="inline w-6 h-6 text-gray-400 mr-2" />}
                          {idx === 2 && <Medal className="inline w-6 h-6 text-amber-700 mr-2" />}
                          #{idx + 1}
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-bold text-base">{entry.playerName}</span>
                            <RoyalBadge rank={idx} gender={null} />
                          </div>
                        </td>
                        <td className="px-6 py-4 text-right font-mono font-bold text-lg text-primary">
                          {entry.totalPoints.toLocaleString()} pts
                        </td>
                        <td className="px-6 py-4 text-right">
                          <Badge variant="outline" className="font-mono">
                            {entry.challengesCompleted} / 40
                          </Badge>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </>
      )}
    </div>
  );
}

function StatCard({ title, value, icon }: any) {
  return (
    <Card className="border-border/60" style={{ background: "var(--cin-surface)", backdropFilter: "blur(12px)" }}>
      <CardContent className="p-6 flex flex-col justify-center items-center text-center">
        <div className="text-primary mb-2 p-3 bg-primary/10 rounded-full">{icon}</div>
        <div className="text-sm font-bold text-muted-foreground uppercase tracking-wider mb-1">{title}</div>
        <div className="text-2xl font-black font-mono text-foreground">{value}</div>
      </CardContent>
    </Card>
  );
}
