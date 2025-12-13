
import { CheckCircle2, LockKeyhole, BookOpen, Clock } from "lucide-react";
import { cn } from "@/lib/utils";

export interface LessonProps {
  id: string;
  title: string;
  description: string;
  duration: string;
  status: "locked" | "active" | "completed";
  xpReward: number;
  index: number;
}

const LessonCard = ({ title, description, duration, status, xpReward, index }: LessonProps) => {
  const isLocked = status === "locked";
  const isCompleted = status === "completed";
  
  return (
    <div className={cn(
      "group relative rounded-xl border p-5 transition-all",
      isLocked ? "bg-muted/50" : "bg-card hover:shadow-md",
      isCompleted && "border-finance-light/30 bg-finance-light/5"
    )}>
      <div className="absolute -left-3 -top-3 flex h-8 w-8 items-center justify-center rounded-full bg-finance text-white">
        {index}
      </div>
      
      <div className="flex justify-between">
        <div className="space-y-2">
          <h3 className={cn(
            "font-semibold line-clamp-1",
            isLocked && "text-muted-foreground"
          )}>
            {title}
          </h3>
          
          <p className={cn(
            "text-sm text-muted-foreground line-clamp-2", 
            isLocked && "text-muted-foreground/70"
          )}>
            {description}
          </p>
        </div>
        
        <div className="ml-4 flex-shrink-0">
          {isCompleted ? (
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-finance-success/20">
              <CheckCircle2 className="h-6 w-6 text-finance-success" />
            </div>
          ) : isLocked ? (
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted">
              <LockKeyhole className="h-6 w-6 text-muted-foreground" />
            </div>
          ) : (
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-finance-light/20">
              <BookOpen className="h-6 w-6 text-finance" />
            </div>
          )}
        </div>
      </div>
      
      <div className="mt-4 flex items-center justify-between">
        <div className="flex items-center text-xs text-muted-foreground">
          <Clock className="mr-1 h-3.5 w-3.5" />
          {duration}
        </div>
        
        <div className={cn(
          "rounded-full px-2.5 py-0.5 text-xs font-medium",
          isLocked ? "bg-muted text-muted-foreground" : 
            "bg-finance-light/20 text-finance-dark"
        )}>
          +{xpReward} XP
        </div>
      </div>
    </div>
  );
};

export default LessonCard;
