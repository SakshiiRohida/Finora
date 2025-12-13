import { useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { BookOpen, TrendingUp, Award, Trophy, Sparkles, Brain, Coins, Flame } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useAppState } from "@/contexts/AppStateContext";
import { leaderboardApi, lessonApi, questApi } from "@/lib/api";
import { useMainLayoutContext } from "@/layouts/MainLayout";
import type { LessonState, QuestState, LeaderboardEntry } from "@/lib/localAppState";
import { SharkIcon } from "@/components/ui/shark-icon";

const HomePage = () => {
  const { profile } = useAppState();
  const { updateMascot } = useMainLayoutContext();

  const { data: lessonsData } = useQuery({
    queryKey: ["lessons"],
    queryFn: () => lessonApi.list()
  });

  const { data: questsData } = useQuery({
    queryKey: ["quests", "home"],
    queryFn: () => questApi.list()
  });

  const { data: leaderboardData } = useQuery({
    queryKey: ["leaderboard", "preview"],
    queryFn: () => leaderboardApi.list("xp")
  });

  const lessons = useMemo<LessonState[]>(
    () => lessonsData?.lessons ?? [],
    [lessonsData]
  );
  const quests = useMemo<QuestState[]>(
    () => questsData?.quests ?? [],
    [questsData]
  );
  const leaderboard = useMemo<LeaderboardEntry[]>(
    () => leaderboardData?.leaderboard ?? [],
    [leaderboardData]
  );

  const featuredLessons = useMemo(() => lessons.slice(0, 2), [lessons]);

  const nextLesson = useMemo(
    () => lessons.find((lesson) => !lesson.completed) ?? lessons[0],
    [lessons]
  );

  const activeQuest = useMemo(
    () => quests.find((quest) => !quest.completed) ?? quests[0],
    [quests]
  );

  useEffect(() => {
    if (!profile) return;
    if (profile.streakCount >= 5) {
      updateMascot({
        mood: "celebrate",
        message: `🔥 ${profile.streakCount}-day streak in progress! Keep the momentum going.`
      });
    } else {
      updateMascot({
        mood: "encourage",
        message: "Spend 5 minutes on a lesson to grow your streak today."
      });
    }
  }, [updateMascot, profile]);

  const activities = [
    {
      title: "Continue Learning",
      description: nextLesson ? nextLesson.title : "Explore foundational lessons",
      path: "/learn",
      icon: BookOpen,
      color: "bg-finance-light/10 text-finance-accent"
    },
    {
      title: "Simulator",
      description: "Practice trading with your earned coins",
      path: "/simulator",
      icon: TrendingUp,
      color: "bg-finance-warning/10 text-finance-warning"
    },
    {
      title: "Daily Quest",
      description: activeQuest ? activeQuest.title : "New quests unlock daily",
      path: "/quests",
      icon: Award,
      color: "bg-finance-success/10 text-finance-success"
    }
  ];

  const progressCards = [
    {
      label: "Knowledge Index",
      value: `${profile?.knowledgeIndex.toFixed(1) ?? "0.0"}%`,
      icon: Brain,
      accent: "text-sky-600",
      background: "bg-sky-100/60"
    },
    {
      label: "Total XP",
      value: `${profile?.xp ?? 0}`,
      icon: Award,
      accent: "text-emerald-600",
      background: "bg-emerald-100/60"
    },
    {
      label: "Coin Balance",
      value: `${Math.round(profile?.coins ?? 0)}`,
      icon: Coins,
      accent: "text-amber-600",
      background: "bg-amber-100/60"
    },
    {
      label: "Daily Streak",
      value: `${profile?.streakCount ?? 0} days`,
      icon: Flame,
      accent: "text-finance",
      background: "bg-finance-light/20"
    }
  ];

  return (
    <div className="space-y-8 pb-20">
      <Card className="rounded-2xl shadow-lg overflow-hidden border-0">
        <CardContent className="p-0">
          <div className="bg-gradient-to-r from-finance to-finance-accent p-6 text-white">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div className="flex-1 space-y-3">
                <div className="flex items-center gap-2 mb-2 text-sm font-semibold uppercase tracking-wide">
                  <Sparkles className="h-4 w-4" />
                  <span>Today's Objective</span>
                </div>
                <h2 className="text-2xl font-bold mb-2">
                  Complete {nextLesson ? `"${nextLesson.title}"` : "any lesson"} to keep your streak alive
                </h2>
                <Button size="lg" className="bg-white text-finance-dark hover:bg-white/90 rounded-xl shadow-duolingo" asChild>
                  <Link to="/learn">Start Learning</Link>
                </Button>
              </div>
              <div className="flex-1 flex justify-end">
                <div className="flex flex-col items-center justify-center text-white text-sm font-semibold gap-2">
                  <div className="p-6 rounded-full bg-white/10 border border-white/40 shadow-xl">
                    <SharkIcon className="h-16 w-16 text-white" />
                  </div>
                  <span className="uppercase tracking-wide">Coach Finny</span>
                </div>
              </div>
              <div className="hidden md:flex md:flex-col gap-2 text-sm text-white/80">
                <span>Progress check-in</span>
                <p>
                  Lessons completed:{" "}
                  <strong>{lessons.filter((lesson: any) => lesson.completed).length}</strong> / {lessons.length}
                </p>
                {activeQuest && (
                  <p>
                    Active quest: <strong>{activeQuest.title}</strong>
                  </p>
                )}
              </div>
            </div>
          </div>
          <div className="p-4 bg-white">
            <h3 className="font-bold text-sm mb-3">This week's streak overview</h3>
            <div className="flex space-x-2 justify-between">
              {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((day) => (
                <div
                  key={day}
                  className="w-10 h-10 rounded-full flex items-center justify-center border-2 border-finance-light/40 bg-white text-sm font-medium"
                >
                  {day.charAt(0)}
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      <div>
        <h2 className="text-xl font-bold mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {activities.map((activity) => (
            <Link key={activity.title} to={activity.path}>
              <Card className="duolingo-card h-full shadow-duolingo hover:-translate-y-1 transition-all duration-200">
                <CardContent className="p-4">
                  <div className="flex flex-col h-full">
                    <div className={`p-3 rounded-xl ${activity.color} mb-3 self-start`}>
                      <activity.icon className="h-6 w-6" />
                    </div>
                    <h3 className="font-bold">{activity.title}</h3>
                    <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                      {activity.description}
                    </p>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </div>

      <div>
        <h2 className="text-xl font-bold mb-4">Your Progress</h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {progressCards.map((card) => (
            <Card key={card.label} className={`rounded-2xl border-0 shadow-lg ${card.background}`}>
              <CardContent className="p-4">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <card.icon className={`h-4 w-4 ${card.accent}`} />
                  <span>{card.label}</span>
                </div>
                <p className="text-2xl font-semibold mt-2">{card.value}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold">Featured Lessons</h2>
          <Link to="/learn" className="text-finance font-semibold text-sm hover:underline">
            View all lessons
          </Link>
        </div>
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2">
          {featuredLessons.map((lesson) => (
            <Card
              key={lesson.id}
              className="rounded-2xl border border-finance-light/30 hover:border-finance-light transition-all"
            >
              <CardContent className="p-5 space-y-3">
                <Badge variant="secondary" className="uppercase text-xs tracking-wide">
                  {lesson.category}
                </Badge>
                <h3 className="text-lg font-semibold">{lesson.title}</h3>
                <p className="text-sm text-muted-foreground line-clamp-3">
                  {lesson.description ?? lesson.body}
                </p>
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>
                    XP reward: <strong>{lesson.xp}</strong>
                  </span>
                  <span>
                    Difficulty: <strong className="capitalize">{lesson.difficulty}</strong>
                  </span>
                </div>
                <Button size="sm" asChild>
                  <Link to={`/learn/${lesson.slug}`}>Start lesson</Link>
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      <Card className="rounded-2xl shadow-lg overflow-hidden border-0">
        <CardContent className="p-6">
          <div className="flex justify-between items-center mb-4">
            <div className="flex items-center gap-2">
              <Trophy className="h-5 w-5 text-finance-warning" />
              <h2 className="text-xl font-bold">Leaderboard</h2>
            </div>
            <Link to="/leaderboard" className="text-finance font-semibold text-sm hover:underline">
              View full ranking
            </Link>
          </div>
          <div className="space-y-3">
            {leaderboard.slice(0, 3).map((entry, index: number) => (
              <div key={entry.id} className="flex items-center p-2 rounded-xl hover:bg-gray-50">
                <div className="w-8 font-bold text-lg">#{index + 1}</div>
                <div className="w-8 h-8 rounded-full bg-finance-light/10 text-finance flex items-center justify-center mr-3">
                  {entry.name?.charAt(0) ?? "?"}
                </div>
                <div className="flex-1">
                  <div className="font-medium">{entry.name}</div>
                  <p className="text-xs text-muted-foreground">
                    Knowledge {(entry.knowledgeIndex ?? 0).toFixed(1)}%
                  </p>
                </div>
                <div className="font-bold text-finance">{entry.xp} XP</div>
              </div>
            ))}
          </div>
          <Button variant="outline" className="w-full mt-4 rounded-xl" asChild>
            <Link to="/leaderboard">
              <Trophy className="h-4 w-4 mr-2 text-finance-warning" />
              See your ranking
            </Link>
          </Button>
        </CardContent>
      </Card>

      <Card className="rounded-2xl bg-gray-50 border-dashed">
        <CardContent className="p-6">
          <div className="flex items-center mb-2">
            <Badge className="bg-finance-light/20 text-finance-accent border-0">Coming Soon</Badge>
          </div>
          <h3 className="font-bold text-lg mb-1">Squad Challenges</h3>
          <p className="text-muted-foreground text-sm">
            Team up with fellow learners, take weekly missions, and compete for bonus coins.
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default HomePage;

