import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Trophy, Medal, Award, Coins } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { leaderboardApi } from "@/lib/api";

const metrics = [
  { value: "xp", label: "XP Points", icon: Trophy },
  { value: "coins", label: "Coins", icon: Coins }
] as const;

const LeaderboardPage = () => {
  const [metric, setMetric] = useState<"xp" | "coins">("xp");

  const { data, isLoading } = useQuery({
    queryKey: ["leaderboard", metric],
    queryFn: () => leaderboardApi.list(metric),
    keepPreviousData: true
  });

  const entries = data?.leaderboard ?? [];
  const currentUser = data?.currentUser;

  const topThree = entries.slice(0, 3);
  const others = entries.slice(3);

  return (
    <div className="pb-20 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Trophy className="h-6 w-6 text-finance-warning" />
          Leaderboard
        </h1>
        {currentUser && (
          <div className="text-sm text-muted-foreground">
            Your rank: <span className="font-semibold text-finance">{currentUser.rank}</span>
          </div>
        )}
      </div>

      <Card className="rounded-3xl shadow-lg overflow-hidden">
        <CardHeader className="bg-finance-light/20">
          <Tabs
            value={metric}
            onValueChange={(value) => setMetric(value as "xp" | "coins")}
            className="w-full"
          >
            <TabsList className="grid w-full grid-cols-2 rounded-xl bg-white p-1">
              {metrics.map((option) => (
                <TabsTrigger key={option.value} value={option.value} className="rounded-lg">
                  <option.icon className="h-4 w-4 mr-2" />
                  {option.label}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        </CardHeader>

        <CardContent className="p-6">
          {isLoading ? (
            <div className="text-center text-sm text-muted-foreground">Loading leaderboard...</div>
          ) : (
            <>
              <div className="flex flex-col md:flex-row md:items-end md:justify-center gap-6 mb-8">
                {topThree.map((entry, index) => {
                  const Icon = [Medal, Trophy, Award][index];
                  const highlight =
                    index === 0
                      ? "border-4 border-finance-accent shadow-xl"
                      : index === 1
                      ? "border-2 border-amber-400"
                      : "border-2 border-gray-200";
                  const sizeClass = index === 0 ? "h-24 w-24" : "h-20 w-20";
                  return (
                    <div
                      key={entry.id}
                      className={`flex flex-col items-center ${index === 0 ? "-mt-4" : ""}`}
                    >
                      <div className={`relative`}>
                        <Avatar className={`${sizeClass} ${highlight}`}>
                          <AvatarFallback className="bg-finance-light/20 text-finance">
                            {entry.name?.charAt(0)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="absolute -bottom-3 -right-3 bg-finance text-white rounded-full p-2 shadow-lg">
                          <Icon className="h-5 w-5" />
                        </div>
                      </div>
                      <p className="mt-3 font-semibold">{entry.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {metric === "xp" ? `${entry.xp} XP` : `${Math.round(entry.coins)} coins`}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Knowledge {entry.knowledgeIndex?.toFixed?.(1) ?? entry.knowledgeIndex}%
                      </p>
                    </div>
                  );
                })}
              </div>

              <div className="divide-y rounded-2xl border border-finance-light/30">
                {others.map((entry, index) => (
                  <div
                    key={entry.id}
                    className={`flex items-center p-4 ${entry.id === "you" ? "bg-finance-light/10" : ""}`}
                  >
                    <div className="w-10 font-semibold text-muted-foreground">#{index + 4}</div>
                    <Avatar className="h-10 w-10 mr-3">
                      <AvatarFallback className="bg-finance/10 text-finance">
                        {entry.name?.charAt(0)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <div className="font-medium">{entry.name}</div>
                      <div className="text-xs text-muted-foreground">
                        Streak: {entry.streakCount} days · Knowledge {entry.knowledgeIndex?.toFixed?.(1) ?? entry.knowledgeIndex}%
                      </div>
                    </div>
                    <div className="text-right font-semibold">
                      {metric === "xp" ? `${entry.xp} XP` : `${Math.round(entry.coins)} coins`}
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default LeaderboardPage;

