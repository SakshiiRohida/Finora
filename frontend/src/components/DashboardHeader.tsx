import { Flame, Coins, Award, Trophy } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import SharkMascot, { SharkMood } from "@/components/SharkMascot";
import { cn } from "@/lib/utils";

interface DashboardHeaderProps {
  name: string;
  xp: number;
  coins: number;
  streak: number;
  knowledgeIndex: number;
  rank?: number | null;
  mascot?: {
    mood?: SharkMood;
    message?: string;
  };
}

const LEVEL_SLICE = 500;

const describeLevel = (xp: number) => {
  const level = Math.max(1, Math.floor(xp / LEVEL_SLICE) + 1);
  const progress = Math.min(100, (xp % LEVEL_SLICE) / LEVEL_SLICE * 100);
  return { level, progress };
};

const DashboardHeader = ({
  name,
  xp,
  coins,
  streak,
  knowledgeIndex,
  rank,
  mascot
}: DashboardHeaderProps) => {
  const { level, progress } = describeLevel(xp);

  return (
    <section className="bg-white rounded-3xl shadow-lg p-5 mb-6 border border-finance-light/20">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-finance-dark">Hi {name.split(" ")[0]}, ready to grow smarter?</h1>
          <p className="text-sm text-muted-foreground">Complete a lesson to maintain your streak.</p>
        </div>
        <SharkMascot mood={mascot?.mood} message={mascot?.message} />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mt-6">
        <div className="rounded-2xl bg-finance-light/10 p-4 text-center">
          <div className="flex items-center justify-center gap-2 text-finance">
            <Flame className="h-5 w-5" />
            <span className="text-sm font-semibold">Daily Streak</span>
          </div>
          <p className="text-2xl font-bold mt-2">{streak} days</p>
        </div>

        <div className="rounded-2xl bg-sky-100/60 p-4 text-center">
          <div className="flex items-center justify-center gap-2 text-sky-600">
            <Award className="h-5 w-5" />
            <span className="text-sm font-semibold">Knowledge Index</span>
          </div>
          <p className="text-2xl font-bold mt-2">{knowledgeIndex.toFixed(1)}%</p>
        </div>

        <div className="rounded-2xl bg-amber-100/50 p-4 text-center">
          <div className="flex items-center justify-center gap-2 text-amber-600">
            <Coins className="h-5 w-5" />
            <span className="text-sm font-semibold">Coin Balance</span>
          </div>
          <p className="text-2xl font-bold mt-2">{Math.round(coins)}</p>
        </div>

        <div className="rounded-2xl bg-finance-success/10 p-4 text-center">
          <div className="flex items-center justify-center gap-2 text-finance-success">
            <Award className="h-5 w-5" />
            <span className="text-sm font-semibold">Total XP</span>
          </div>
          <p className="text-2xl font-bold mt-2">{xp}</p>
        </div>

        <div
          className={cn(
            "rounded-2xl p-4 text-center",
            rank ? "bg-indigo-100/60 text-indigo-700" : "bg-muted/60 text-muted-foreground"
          )}
        >
          <div className="flex items-center justify-center gap-2">
            <Trophy className="h-5 w-5" />
            <span className="text-sm font-semibold">Leaderboard Rank</span>
          </div>
          <p className="text-2xl font-bold mt-2">{rank ? `#${rank}` : "Unranked"}</p>
        </div>
      </div>

      <div className="mt-6">
        <div className="flex justify-between items-center text-xs font-medium text-muted-foreground mb-2">
          <span>Level {level}</span>
          <span>{progress.toFixed(0)}%</span>
        </div>
        <Progress value={progress} className="h-2 rounded-full bg-gray-100" />
      </div>
    </section>
  );
};

export default DashboardHeader;

