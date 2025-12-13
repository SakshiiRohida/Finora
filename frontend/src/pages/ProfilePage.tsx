
import { useMemo } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { BookOpen, Award, TrendingUp, CheckCircle2, Clock, Sparkles } from "lucide-react";
import { useAppState } from "@/contexts/AppStateContext";
import { lessonApi, profileApi, questApi, simulatorApi } from "@/lib/api";
import type { LessonState, QuestState, PortfolioSnapshot } from "@/lib/localAppState";

const ProfilePage = () => {
  const { profile } = useAppState();

  const profileQuery = useQuery({
    queryKey: ["profile", "remote"],
    queryFn: () => profileApi.me()
  });

  const lessonsQuery = useQuery({
    queryKey: ["lessons", "profile"],
    queryFn: () => lessonApi.list()
  });

  const questsQuery = useQuery({
    queryKey: ["quests", "profile"],
    queryFn: () => questApi.list()
  });

  const accountQuery = useQuery({
    queryKey: ["simulator", "account", "profile"],
    queryFn: () => simulatorApi.account()
  });

  const lessonsData = lessonsQuery.data;
  const questsData = questsQuery.data;
  const simulatorData = accountQuery.data;

  const remoteProfile = profileQuery.data?.profile;
  const recentTrades = profileQuery.data?.recentTrades ?? [];

  const lessons = useMemo<LessonState[]>(() => lessonsData?.lessons ?? [], [lessonsData]);
  const completedLessons = useMemo(() => lessons.filter((lesson) => lesson.completed), [lessons]);
  const inProgressLessons = useMemo(() => lessons.filter((lesson) => !lesson.completed), [lessons]);

  const quests = useMemo<QuestState[]>(() => questsData?.quests ?? [], [questsData]);
  const activeQuests = quests.filter((quest) => !quest.completed);

  const account = simulatorData?.account;
  const positions: PortfolioSnapshot["holdings"] = simulatorData?.positions ?? [];
  const investedAmount = positions.reduce((sum, position) => sum + position.avgPrice * position.quantity, 0);

  const knowledgeIndex = remoteProfile?.knowledgeIndex ?? profile?.knowledgeIndex ?? 0;
  const xp = remoteProfile?.xp ?? profile?.xp ?? 0;
  const coins = remoteProfile?.coins ?? profile?.coins ?? 0;
  const streakCount = remoteProfile?.streak ?? profile?.streakCount ?? 0;
  const lessonsCompletedCount = remoteProfile?.lessons?.completed ?? completedLessons.length ?? 0;
  const lessonsTotalCount = remoteProfile?.lessons?.attempts ?? lessons.length ?? 0;
  const questsCompletedCount = remoteProfile?.quests?.completed ?? quests.filter((quest) => quest.completed).length ?? 0;
  const questsTotalCount = remoteProfile?.quests?.total ?? quests.length ?? 0;

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex items-center gap-4">
          <Avatar className="h-16 w-16">
            <AvatarFallback className="bg-finance text-white text-lg">
              {profile?.name?.charAt(0) ?? remoteProfile?.name?.charAt(0) ?? "G"}
            </AvatarFallback>
          </Avatar>
          <div>
            <h1 className="text-2xl font-bold">{profile?.name ?? remoteProfile?.name ?? "Guest Fin"}</h1>
            <p className="text-muted-foreground text-sm">
              Knowledge index {knowledgeIndex.toFixed(1)}% · Streak {streakCount} days
            </p>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3 w-full md:w-auto">
          <Card className="border-0 shadow-lg">
            <CardContent className="p-3 text-center">
              <p className="text-xs text-muted-foreground uppercase tracking-wide">Total XP</p>
              <p className="text-xl font-semibold">{xp}</p>
            </CardContent>
          </Card>
          <Card className="border-0 shadow-lg">
            <CardContent className="p-3 text-center">
              <p className="text-xs text-muted-foreground uppercase tracking-wide">Coins</p>
              <p className="text-xl font-semibold">{Math.round(coins)}</p>
            </CardContent>
          </Card>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Learning Summary</CardTitle>
            <CardDescription>
              You have completed {lessonsCompletedCount} of {lessonsTotalCount} lessons.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <div className="flex items-center justify-between text-xs text-muted-foreground mb-2">
                <span>Overall progress</span>
                <span>{lessonsTotalCount > 0 ? Math.round((lessonsCompletedCount / lessonsTotalCount) * 100) : 0}%</span>
              </div>
              <Progress value={lessonsTotalCount > 0 ? (lessonsCompletedCount / lessonsTotalCount) * 100 : 0} className="h-2" />
            </div>

            {completedLessons.length > 0 ? (
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-sm font-semibold">
                  <CheckCircle2 className="h-4 w-4 text-finance-success" />
                  Completed lessons
                </div>
                <div className="space-y-2">
                  {completedLessons.slice(0, 3).map((lesson) => (
                    <div key={lesson.id} className="rounded-lg border border-finance-light/40 p-3 flex items-start justify-between">
                      <div>
                        <h3 className="text-sm font-medium">{lesson.title}</h3>
                        <p className="text-xs text-muted-foreground">Highest score {lesson.bestScore?.toFixed?.(1) ?? "-"}%</p>
                      </div>
                      <Badge className="bg-finance-light/20 text-finance" variant="secondary">
                        {lesson.xp} XP
                      </Badge>
                    </div>
                  ))}
                  {completedLessons.length > 3 && (
                    <p className="text-xs text-muted-foreground">+{completedLessons.length - 3} more lessons completed</p>
                  )}
                </div>
              </div>
            ) : (
              <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
                Complete your first lesson to start collecting badges and streaks.
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Active Quests</CardTitle>
            <CardDescription>
              {questsCompletedCount} of {questsTotalCount} quests completed.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {activeQuests.length === 0 ? (
              <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
                No active quests. Finish a lesson or execute trades to unlock rewards.
              </div>
            ) : (
              activeQuests.map((quest) => {
                const progress = quest.target_value > 0 ? Math.min(100, Math.round((quest.progress / quest.target_value) * 100)) : 0;
                return (
                  <div key={quest.id} className="rounded-xl border border-finance-light/40 p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-semibold">{quest.title}</h3>
                        <p className="text-xs text-muted-foreground">{quest.description}</p>
                      </div>
                      <Badge className="bg-finance-light/20 text-finance" variant="secondary">
                        +{quest.reward_xp} XP / +{quest.reward_coins} coins
                      </Badge>
                    </div>
                    <div>
                      <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
                        <span>{progress}% complete</span>
                        <span>
                          {quest.progress}/{quest.target_value}
                        </span>
                      </div>
                      <Progress value={progress} className="h-2" />
                    </div>
                  </div>
                );
              })
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Lessons To Explore Next</CardTitle>
          <CardDescription>Finish these to earn more coins and XP.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {inProgressLessons.slice(0, 4).map((lesson) => (
            <div key={lesson.id} className="flex items-center justify-between rounded-lg border border-finance-light/40 p-4">
              <div>
                <h3 className="font-medium">{lesson.title}</h3>
                <p className="text-xs text-muted-foreground">{lesson.description ?? lesson.category}</p>
              </div>
              <Button variant="outline" size="sm" asChild>
                <Link to={`/learn/${lesson.slug}`}>
                  <BookOpen className="h-4 w-4 mr-2" />
                  Resume
                </Link>
              </Button>
            </div>
          ))}
          {inProgressLessons.length === 0 && (
            <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
              All lessons are complete. Head to the simulator or leaderboard to keep earning XP.
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Simulator Snapshot</CardTitle>
          <CardDescription>Track your virtual cash, invested amount, and total trades from the stock simulator.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-4">
          <Card className="border border-finance-light/40">
            <CardContent className="p-4 text-center">
              <p className="text-xs text-muted-foreground uppercase">Cash Balance</p>
              <p className="text-xl font-semibold">₹{Number(account?.cashBalance ?? 0).toFixed(2)}</p>
            </CardContent>
          </Card>
          <Card className="border border-finance-light/40">
            <CardContent className="p-4 text-center">
              <p className="text-xs text-muted-foreground uppercase">Invested</p>
              <p className="text-xl font-semibold">₹{investedAmount.toFixed(2)}</p>
            </CardContent>
          </Card>
          <Card className="border border-finance-light/40">
            <CardContent className="p-4 text-center">
              <p className="text-xs text-muted-foreground uppercase">Open Positions</p>
              <p className="text-xl font-semibold">{positions.length}</p>
            </CardContent>
          </Card>
          <Card className="border border-finance-light/40">
            <CardContent className="p-4 text-center">
              <p className="text-xs text-muted-foreground uppercase">Trades Executed</p>
              <p className="text-xl font-semibold">{account?.trades ?? 0}</p>
            </CardContent>
          </Card>
        </CardContent>
      </Card>

      <Card className="bg-finance-light/10 border-none shadow-none">
        <CardContent className="p-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-center gap-3">
            <Sparkles className="h-6 w-6 text-finance" />
            <div>
              <h3 className="text-lg font-semibold">Keep the streak alive</h3>
              <p className="text-sm text-muted-foreground">Complete one lesson or execute a trade every day to keep Finny cheering.</p>
            </div>
          </div>
          <Button asChild>
            <Link to="/simulator">
              <TrendingUp className="h-4 w-4 mr-2" />
              Launch simulator
            </Link>
          </Button>
        </CardContent>
      </Card>

      {recentTrades.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Recent Trades</CardTitle>
            <CardDescription>Latest timeline or simulator trades recorded for your profile.</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="bg-finance-light/20 text-xs uppercase tracking-wide text-muted-foreground">
                  <tr>
                    <th className="px-4 py-3 text-left">Symbol</th>
                    <th className="px-4 py-3 text-left">Side</th>
                    <th className="px-4 py-3 text-left">Quantity</th>
                    <th className="px-4 py-3 text-left">Price</th>
                    <th className="px-4 py-3 text-left">Executed</th>
                  </tr>
                </thead>
                <tbody>
                  {recentTrades.map((trade, index) => (
                    <tr key={`${trade.symbol}-${index}`} className="border-b border-finance-light/30">
                      <td className="px-4 py-3 font-semibold">{trade.symbol}</td>
                      <td className={`px-4 py-3 font-semibold ${trade.side === "BUY" ? "text-finance-success" : "text-finance-danger"}`}>
                        {trade.side}
                      </td>
                      <td className="px-4 py-3">{trade.quantity}</td>
                      <td className="px-4 py-3">₹{trade.price.toFixed(2)}</td>
                      <td className="px-4 py-3">{trade.executedAt}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default ProfilePage;
