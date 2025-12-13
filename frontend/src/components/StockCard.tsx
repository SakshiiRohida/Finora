
import { TrendingUp, TrendingDown } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface StockProps {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
  owned?: number;
  value?: number;
}

const StockCard = ({
  symbol,
  name,
  price,
  change,
  changePercent,
  owned,
  value
}: StockProps) => {
  const isPositive = change >= 0;
  
  return (
    <div className="bg-white rounded-xl border shadow-sm p-4 transition-all duration-300 hover:shadow-md">
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center">
            <h3 className="font-medium text-lg">{symbol}</h3>
            <span className="ml-2 text-xs text-muted-foreground">{name}</span>
          </div>
          
          {owned !== undefined && (
            <div className="mt-1 text-xs text-muted-foreground">
              Owned: <span className="font-medium">{owned} shares</span>
            </div>
          )}
        </div>
        
        <div className="text-right">
          <div className="text-lg font-medium">${price.toFixed(2)}</div>
          
          <div className={cn(
            "flex items-center justify-end gap-1 text-xs",
            isPositive ? "text-finance-success" : "text-finance-danger"
          )}>
            {isPositive ? (
              <TrendingUp className="h-3 w-3" />
            ) : (
              <TrendingDown className="h-3 w-3" />
            )}
            <span>${Math.abs(change).toFixed(2)}</span>
            <span>({Math.abs(changePercent).toFixed(2)}%)</span>
          </div>
          
          {value !== undefined && (
            <div className="mt-1 text-xs text-muted-foreground">
              Value: <span className="font-medium">${value.toFixed(2)}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default StockCard;
