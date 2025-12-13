
import { TrendingUp, Star, Trophy } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import StockCard from '@/components/StockCard';
import { cn } from '@/lib/utils';

interface StockProgressProps {
  coursesCompleted: number;
  totalCourses: number;
  stockGrowth: number;
}

const StockProgress = ({ coursesCompleted, totalCourses, stockGrowth }: StockProgressProps) => {
  // Calculate completion percentage
  const completionPercentage = (coursesCompleted / totalCourses) * 100;
  
  // Mock stock data that improves as courses are completed
  const basePrice = 50;
  const currentPrice = basePrice * (1 + (stockGrowth / 100));
  const change = currentPrice - basePrice;
  const changePercent = (change / basePrice) * 100;
  
  // Calculate rewards based on progress
  const xpEarned = coursesCompleted * 150;
  const rankLevel = Math.floor(coursesCompleted / 2) + 1;
  
  return (
    <div className="bg-white rounded-xl border shadow-md p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-lg">Your Learning Portfolio</h3>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 text-xs bg-finance-light/20 text-finance-dark px-2 py-1 rounded-full">
            <Star className="h-3 w-3" />
            <span>{xpEarned} XP</span>
          </div>
          <div className="flex items-center gap-1 text-xs bg-finance-light/20 text-finance-dark px-2 py-1 rounded-full">
            <Trophy className="h-3 w-3" />
            <span>Rank {rankLevel}</span>
          </div>
        </div>
      </div>
      
      <div className="mb-6">
        <div className="flex justify-between items-center mb-2">
          <div className="text-sm font-medium">Courses Completed</div>
          <div className="text-sm text-muted-foreground">{completionPercentage.toFixed(0)}%</div>
        </div>
        <Progress value={completionPercentage} className="h-2" />
      </div>
      
      <div className="space-y-4">
        <div className="text-sm font-medium">Your Knowledge Stock</div>
        <StockCard 
          symbol="KNOW"
          name="Knowledge Index"
          price={currentPrice}
          change={change}
          changePercent={changePercent}
          owned={coursesCompleted}
          value={currentPrice * coursesCompleted}
        />
        
        <div className="px-4 py-3 bg-finance-light/10 rounded-lg border border-finance-light/20">
          <div className="flex items-center gap-2">
            <TrendingUp className={cn(
              "h-4 w-4",
              changePercent >= 0 ? "text-finance-success" : "text-finance-danger"
            )} />
            <span className="text-sm font-medium">
              Your knowledge value has increased by {changePercent.toFixed(1)}% since you started learning!
            </span>
          </div>
          <p className="text-xs text-muted-foreground mt-1 ml-6">
            Complete more courses to increase your portfolio value.
          </p>
        </div>
      </div>
    </div>
  );
};

export default StockProgress;
