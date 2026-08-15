import { useState, useMemo } from "react";
import { useLocation } from "wouter";
import { useListCourses, useCreateSession, SessionInputLevel, Course } from "@workspace/api-client-react";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { useQuizState } from "@/lib/quiz-context";
import * as Icons from "react-icons/si";
import { Timer, Zap, Search, X } from "lucide-react";

export default function Home() {
  const { data: courses, isLoading } = useListCourses();
  const [, setLocation] = useLocation();
  const { setSession, setTimedMode } = useQuizState();
  const createSession = useCreateSession();
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [timedModeEnabled, setTimedModeEnabled] = useState(false);
  const [search, setSearch] = useState("");

  const filteredCourses = useMemo(() => {
    if (!courses) return [];
    const q = search.trim().toLowerCase();
    if (!q) return courses;
    return courses.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
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

  if (isLoading) {
    return (
      <div className="w-full flex-1 flex items-center justify-center">
        <div className="animate-pulse flex flex-col items-center gap-4">
          <div className="h-12 w-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
          <p className="text-muted-foreground font-medium">Loading courses...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-5xl mx-auto py-12 px-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="text-center mb-12 space-y-4">
        <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-foreground">
          Ace Your Next Technical Interview
        </h1>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
          Choose a technology, select your difficulty, and answer realistic interview questions under pressure.
        </p>
      </div>

      {!selectedCourse ? (
        <>
          {/* Search bar */}
          <div className="relative max-w-md mx-auto mb-8">
            <Search
              size={18}
              className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none"
            />
            <Input
              placeholder="Search courses… e.g. Docker, Python, AWS"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-12 pl-10 pr-10 text-base rounded-xl"
            />
            {search && (
              <button
                onClick={() => setSearch("")}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
              >
                <X size={16} />
              </button>
            )}
          </div>

          {filteredCourses.length === 0 ? (
            <div className="text-center py-20 text-muted-foreground">
              <Search size={40} className="mx-auto mb-4 opacity-30" />
              <p className="text-lg font-medium">No courses match "{search}"</p>
              <button onClick={() => setSearch("")} className="mt-2 text-primary text-sm hover:underline">
                Clear search
              </button>
            </div>
          ) : (
            <>
              {search && (
                <p className="text-sm text-muted-foreground text-center mb-4">
                  {filteredCourses.length} course{filteredCourses.length !== 1 ? "s" : ""} found
                </p>
              )}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredCourses.map((course, i) => {
                  const IconComponent = (Icons as any)[course.icon] || Icons.SiCodecademy;

                  return (
                    <Card
                      key={course.id}
                      className="group cursor-pointer hover:border-primary hover:shadow-xl hover:-translate-y-1 transition-all duration-300"
                      onClick={() => setSelectedCourse(course)}
                      style={{ animationDelay: `${i * 60}ms` }}
                    >
                      <CardHeader>
                        <div className="flex justify-between items-start mb-2">
                          <div className="p-3 rounded-xl bg-secondary group-hover:bg-primary group-hover:text-white transition-colors">
                            <IconComponent size={28} />
                          </div>
                          <Badge variant="outline" className="font-mono bg-background">
                            {course.questionCounts.beginner +
                              course.questionCounts.intermediate +
                              course.questionCounts.advanced}{" "}
                            Qs
                          </Badge>
                        </div>
                        <CardTitle className="text-2xl mt-4">{course.name}</CardTitle>
                        <CardDescription className="text-base">{course.description}</CardDescription>
                      </CardHeader>
                    </Card>
                  );
                })}
              </div>
            </>
          )}
        </>
      ) : (
        <div className="max-w-2xl mx-auto animate-in zoom-in-95 duration-300">
          <Button
            variant="ghost"
            className="mb-6 -ml-4 text-muted-foreground"
            onClick={() => setSelectedCourse(null)}
          >
            ← Back to courses
          </Button>

          <div className="dark-panel rounded-3xl p-8 md:p-12 relative overflow-hidden">
            <div className="absolute top-0 right-0 p-12 opacity-10 pointer-events-none">
              {(() => {
                const IconComponent = (Icons as any)[selectedCourse.icon] || Icons.SiCodecademy;
                return <IconComponent size={200} />;
              })()}
            </div>

            <div className="relative z-10">
              <h2 className="text-3xl font-bold mb-2">{selectedCourse.name} Interview</h2>
              <p className="text-gray-400 mb-6 text-lg">Select your experience level to begin.</p>

              {/* Timed Mode Toggle */}
              <button
                onClick={() => setTimedModeEnabled((prev) => !prev)}
                className={`w-full mb-8 p-5 rounded-2xl border-2 transition-all duration-300 flex items-center justify-between group ${
                  timedModeEnabled
                    ? "border-orange-500/70 bg-orange-500/15 text-white"
                    : "border-white/10 bg-white/5 hover:bg-white/10 hover:border-white/20 text-white"
                }`}
              >
                <div className="flex items-center gap-4">
                  <div
                    className={`p-2.5 rounded-xl transition-colors ${timedModeEnabled ? "bg-orange-500/30 text-orange-400" : "bg-white/10 text-gray-400 group-hover:text-white"}`}
                  >
                    <Timer size={22} />
                  </div>
                  <div className="text-left">
                    <h3
                      className={`text-lg font-bold transition-colors ${timedModeEnabled ? "text-orange-400" : "text-white group-hover:text-primary"}`}
                    >
                      Timed Mode
                    </h3>
                    <p className="text-gray-400 text-sm mt-0.5">30s per question · Speed bonuses · High stakes</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {timedModeEnabled && (
                    <span className="flex items-center gap-1 text-xs font-bold text-orange-400 bg-orange-500/20 px-2.5 py-1 rounded-full border border-orange-500/30">
                      <Zap size={11} /> ON
                    </span>
                  )}
                  <div
                    className={`relative w-12 h-6 rounded-full transition-colors duration-300 ${timedModeEnabled ? "bg-orange-500" : "bg-white/20"}`}
                  >
                    <div
                      className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all duration-300 ${timedModeEnabled ? "left-6" : "left-0.5"}`}
                    />
                  </div>
                </div>
              </button>

              <div className="space-y-4">
                <LevelButton
                  level="beginner"
                  title="Beginner"
                  desc="Core concepts and syntax."
                  count={selectedCourse.questionCounts.beginner}
                  onClick={() => handleStart(SessionInputLevel.beginner)}
                  loading={createSession.isPending}
                />
                <LevelButton
                  level="intermediate"
                  title="Intermediate"
                  desc="Architecture, best practices, and standard APIs."
                  count={selectedCourse.questionCounts.intermediate}
                  onClick={() => handleStart(SessionInputLevel.intermediate)}
                  loading={createSession.isPending}
                />
                <LevelButton
                  level="advanced"
                  title="Advanced"
                  desc="Performance, internal mechanics, and complex scenarios."
                  count={selectedCourse.questionCounts.advanced}
                  onClick={() => handleStart(SessionInputLevel.advanced)}
                  loading={createSession.isPending}
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function LevelButton({ level, title, desc, count, onClick, loading }: any) {
  return (
    <button
      onClick={onClick}
      disabled={loading || count === 0}
      className="w-full text-left p-6 rounded-2xl border-2 border-white/10 bg-white/5 hover:bg-white/10 hover:border-primary/50 transition-all group flex items-center justify-between disabled:opacity-50 disabled:cursor-not-allowed"
    >
      <div>
        <h3 className="text-xl font-bold text-white group-hover:text-primary transition-colors">{title}</h3>
        <p className="text-gray-400 text-sm mt-1">{desc}</p>
      </div>
      <div className="text-right">
        <span className="block text-2xl font-mono font-bold text-white">{count}</span>
        <span className="text-xs text-gray-500 font-mono uppercase tracking-wider">Questions</span>
      </div>
    </button>
  );
}
