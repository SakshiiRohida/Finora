
import { Progress } from "@/components/ui/progress";
import { Trophy, Star, Heart } from "lucide-react";
import { cn } from "@/lib/utils";

interface CourseProgressProps {
  progress: number;
  streakDays?: number;
  lives?: number;
  xp?: number;
}

const CourseProgress = ({ progress, streakDays = 0, lives = 5, xp = 0 }: CourseProgressProps) => {
  return (
    <div className="space-y-3">
      <div className="flex justify-between items-center">
        <div className="text-sm font-medium">Course Progress</div>
        <div className="text-sm text-muted-foreground">{progress}%</div>
      </div>
      
      <Progress value={progress} className="h-2" />
      
      <div className="flex justify-between mt-4">
        <div className="flex items-center gap-1.5">
          <div className="flex h-6 w-6 items-center justify-center rounded-full bg-finance-light/20">
            <Trophy className="h-3.5 w-3.5 text-finance-accent" />
          </div>
          <span className="text-xs font-medium">{xp} XP</span>
        </div>
        
        <div className="flex items-center gap-1.5">
          <div className="flex h-6 w-6 items-center justify-center rounded-full bg-finance-light/20">
            <Star className="h-3.5 w-3.5 text-finance-warning" />
          </div>
          <span className="text-xs font-medium">{streakDays} day streak</span>
        </div>
        
        <div className="flex items-center gap-1.5">
          <div className="flex gap-0.5">
            {Array.from({ length: 5 }).map((_, i) => (
              <Heart 
                key={i} 
                className={cn(
                  "h-4 w-4", 
                  i < lives ? "text-finance-danger" : "text-muted stroke-muted-foreground/30"
                )} 
                fill={i < lives ? "currentColor" : "none"}
              />
            ))}
          </div>
          <span className="text-xs font-medium">{lives} lives</span>
        </div>
      </div>
    </div>
  );
};

export default CourseProgress;
