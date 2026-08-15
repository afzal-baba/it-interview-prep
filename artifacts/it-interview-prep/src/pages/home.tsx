import { useState } from "react";
import { useLocation } from "wouter";
import { useListCourses, useCreateSession, SessionInputLevel, Course } from "@workspace/api-client-react";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useQuizState } from "@/lib/quiz-context";
import * as Icons from "react-icons/si";

export default function Home() {
  const { data: courses, isLoading } = useListCourses();
  const [, setLocation] = useLocation();
  const { setSession } = useQuizState();
  const createSession = useCreateSession();
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  
  const handleStart = (level: SessionInputLevel) => {
    if (!selectedCourse) return;
    
    createSession.mutate(
      { data: { courseId: selectedCourse.id, level } },
      {
        onSuccess: (session) => {
          setSession(session);
          setLocation("/quiz");
        }
      }
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
      <div className="text-center mb-16 space-y-4">
        <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-foreground">
          Ace Your Next Technical Interview
        </h1>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
          Choose a technology, select your difficulty, and answer realistic interview questions under pressure.
        </p>
      </div>

      {!selectedCourse ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {courses?.map((course, i) => {
            // Dynamically get icon from react-icons/si
            // e.g. icon name "SiOracle", "SiPython"
            const IconComponent = (Icons as any)[course.icon] || Icons.SiCodecademy;
            
            return (
              <Card 
                key={course.id} 
                className="group cursor-pointer hover:border-primary hover:shadow-xl hover:-translate-y-1 transition-all duration-300"
                onClick={() => setSelectedCourse(course)}
                style={{ animationDelay: `${i * 100}ms` }}
              >
                <CardHeader>
                  <div className="flex justify-between items-start mb-2">
                    <div className="p-3 rounded-xl bg-secondary group-hover:bg-primary group-hover:text-white transition-colors">
                      <IconComponent size={28} />
                    </div>
                    <Badge variant="outline" className="font-mono bg-background">
                      {course.questionCounts.beginner + course.questionCounts.intermediate + course.questionCounts.advanced} Qs
                    </Badge>
                  </div>
                  <CardTitle className="text-2xl mt-4">{course.name}</CardTitle>
                  <CardDescription className="text-base">{course.description}</CardDescription>
                </CardHeader>
              </Card>
            );
          })}
        </div>
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
              <p className="text-gray-400 mb-10 text-lg">Select your experience level to begin.</p>
              
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
