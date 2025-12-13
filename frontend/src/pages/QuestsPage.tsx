
import { useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Award, Check, Coins, Target, Rocket } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { questApi } from "@/lib/api";
import { useToast } from "@/components/ui/use-toast";
import { useMainLayoutContext } from "@/layouts/MainLayout";
import type { QuestState } from "@/lib/localAppState";

const rarityColors: Record<string, string> = {
  common: "bg-gray-200 text-gray-700",
  uncommon: "bg-green-100 text-green-700",
  rare: "bg-blue-100 text-blue-700",
  epic: "bg-purple-100 text-purple-700",
  legendary: "bg-amber-100 text-amber-700"
};

const QuestsPage = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { updateMascot, refreshProfile } = useMainLayoutContext();

  const { data, isLoading } = useQuery({
    queryKey: ["quests"],
    queryFn: () => questApi.list()
  });

  const quests = useMemo<QuestState[]>(() => data?.quests ?? [], [data]);

  const completeMutation = useMutation<
    Awaited<ReturnType<typeof questApi.complete>>,
    Error,
    number
  >({
    mutationFn: (questId) => questApi.complete(questId),
    onSuccess: async (response) => {
      toast({
        title: "Quest completed!",
        description: `You earned ${response.rewardXp} XP and ${response.rewardCoins} coins.`,
      });
      updateMascot({
        mood: "celebrate",
        message: "Finny is doing a victory splash! Keep chasing those quests."
      });
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["quests"] }),
        queryClient.invalidateQueries({ queryKey: ["leaderboard"] }),
        refreshProfile()
      ]);
    },
    onError: (error) => {
      toast({
        title: "Unable to complete quest",
        description: error?.message || "Try again in a moment.",
        variant: "destructive"
      });
    }
  });

  const unlockedBadges = useMemo(() => {
    const completed = quests.filter((quest) => quest.completed);
    return [
      {
        id: "badge-1",
        name: "Quest Sprinter",
        description: "Completed your first quest",
        unlocked: completed.length > 0,
        rarity: "common"
      },
      {
        id: "badge-2",
        name: "Consistency Shark",
        description: "Completed 3 quests in a week",
        unlocked: completed.length >= 3,
        rarity: completed.length >= 3 ? "uncommon" : "rare"
      },
      {
        id: "badge-3",
        name: "Finny's Favorite",
        description: "Finish every quest currently available",
        unlocked: completed.length === quests.length && quests.length > 0,
        rarity: "epic"
      }
    ];
  }, [quests]);

  return (
    <div className="pb-20 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Award className="h-6 w-6 text-finance-accent" />
          Quests & Badges
        </h1>
      </div>

      <Tabs defaultValue="quests" className="w-full">
        <TabsList className="grid w-full grid-cols-2 mb-6 bg-finance-light/20 rounded-xl p-1">
          <TabsTrigger value="quests" className="rounded-lg">Active Quests</TabsTrigger>
          <TabsTrigger value="badges" className="rounded-lg">Badges</TabsTrigger>
        </TabsList>

        <TabsContent value="quests" className="space-y-4">
          {isLoading && <p className="text-sm text-muted-foreground">Loading quests...</p>}

          {!isLoading && quests.length === 0 && (
            <Card>
              <CardContent className="p-6 text-center space-y-2">
                <Target className="h-10 w-10 mx-auto text-finance" />
                <p className="text-sm text-muted-foreground">New quests will appear once you complete more lessons.</p>
              </CardContent>
            </Card>
          )}

          {quests.map((quest) => {
            const target = quest.target_value > 0 ? quest.target_value : 1;
            const progress = Math.min(100, Math.round((quest.progress / target) * 100));
            return (
              <Card key={quest.id} className="overflow-hidden rounded-2xl border border-finance-light/30">
                <CardContent className="p-4">
                  <div className="flex justify-between gap-4">
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center justify-between">
                        <h3 className="font-semibold text-lg">{quest.title}</h3>
                        <div className="flex items-center gap-2 text-sm font-semibold">
                          <span className="text-finance-accent">+{quest.reward_xp} XP</span>
                          <span className="text-finance-warning">+{quest.reward_coins} coins</span>
                        </div>
                      </div>
                      <p className="text-sm text-muted-foreground">{quest.description}</p>
                      <div className="space-y-1">
                        {quest.completed ? (
                          <div className="flex items-center text-finance-success text-sm font-medium gap-2">
                            <Check className="h-4 w-4" />
                            Completed
                          </div>
                        ) : (
                          <>
                            <div className="flex justify-between text-xs text-muted-foreground">
                              <span>
                                Progress {quest.progress}/{quest.target_value}
                              </span>
                              <span>{progress}%</span>
                            </div>
                            <Progress value={progress} className="h-2" />
                          </>
                        )}
                      </div>
                    </div>
                    <Button
                      className="self-center"
                      variant={quest.completed ? "outline" : "default"}
                      disabled={quest.completed || completeMutation.isPending}
                      onClick={() => completeMutation.mutate(quest.id)}
                    >
                      {quest.completed ? "Completed" : "Claim reward"}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </TabsContent>

        <TabsContent value="badges">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {unlockedBadges.map((badge) => (
              <Card key={badge.id} className="rounded-2xl border border-finance-light/40">
                <CardContent className="p-5 text-center space-y-3">
                  <div className="w-16 h-16 rounded-full bg-finance-light/20 flex items-center justify-center mx-auto">
                    <Rocket className="h-8 w-8 text-finance" />
                  </div>
                  <div>
                    <h3 className="font-semibold">{badge.name}</h3>
                    <p className="text-xs text-muted-foreground">{badge.description}</p>
                  </div>
                  <Badge className={rarityColors[badge.rarity] || rarityColors.common}>
                    {badge.unlocked ? "Unlocked" : "Locked"}
                  </Badge>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default QuestsPage;
