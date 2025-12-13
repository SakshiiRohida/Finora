import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

type HoldingView = {
  symbol: string;
  quantity: number;
  avgPrice: number;
  currentPrice: number;
  currentValue: number;
  pnl: number;
};

type TimelinePortfolioProps = {
  symbol: string;
  cash: number;
  holdings: HoldingView[];
  holdingsValue: number;
  totalValue: number;
  pnl: number;
  onReset: () => void;
  currentDate?: string;
};

const toCurrency = (value: number) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(value);

const TimelinePortfolio = ({
  cash,
  holdings,
  holdingsValue,
  totalValue,
  pnl,
  onReset,
  currentDate,
  symbol
}: TimelinePortfolioProps) => (
  <Card className="w-full lg:max-w-sm self-start">
    <CardHeader className="space-y-2">
      <CardTitle>Timeline Portfolio</CardTitle>
      <CardDescription>
        Virtual cash starts at ₹100,000. All trades are executed on the selected historical date.
      </CardDescription>
    </CardHeader>
    <CardContent className="space-y-5">
      <div className="grid grid-cols-2 gap-3 text-sm">
        <div>
          <p className="text-xs text-muted-foreground uppercase tracking-wide">Cash balance</p>
          <p className="text-lg font-semibold mt-1">{toCurrency(cash)}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground uppercase tracking-wide">Holdings value</p>
          <p className="text-lg font-semibold mt-1">{toCurrency(holdingsValue)}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground uppercase tracking-wide">Total portfolio</p>
          <p className="text-lg font-semibold mt-1">{toCurrency(totalValue)}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground uppercase tracking-wide">Return</p>
          <p className={`text-lg font-semibold mt-1 ${pnl >= 0 ? "text-finance-success" : "text-finance-danger"}`}>
            {pnl >= 0 ? "+" : "-"}
            {toCurrency(Math.abs(pnl))}
          </p>
        </div>
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between text-xs text-muted-foreground uppercase tracking-wide">
          <span>Open positions</span>
          <span>{holdings.length} holdings</span>
        </div>

        {holdings.length === 0 ? (
          <div className="text-muted-foreground text-sm bg-finance-light/20 rounded-xl p-4">
            No timeline positions yet. Execute a buy on the selected date to open your first trade.
          </div>
        ) : (
          <div className="space-y-3">
            {holdings.map((holding) => (
              <div
                key={holding.symbol}
                className="rounded-xl border border-finance-light/40 p-3 bg-white shadow-sm"
              >
                <div className="flex items-center justify-between text-sm font-semibold">
                  <span>{holding.symbol}</span>
                  <span>{holding.quantity.toFixed(2)} shares</span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground mt-2">
                  <div>
                    Avg price: <strong>₹{holding.avgPrice.toFixed(2)}</strong>
                  </div>
                  <div>
                    Current: <strong>₹{holding.currentPrice.toFixed(2)}</strong>
                  </div>
                  <div>
                    Value: <strong>{toCurrency(holding.currentValue)}</strong>
                  </div>
                  <div className={holding.pnl >= 0 ? "text-finance-success" : "text-finance-danger"}>
                    P/L: {toCurrency(holding.pnl)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="text-xs text-muted-foreground">
        <p>
          Trades are bound to <strong>{currentDate ?? "the selected date"}</strong>. Change the date using the
          timeline slider to simulate how your {symbol} position behaves through time.
        </p>
      </div>

      <Button variant="outline" onClick={onReset} className="w-full">
        Reset timeline portfolio
      </Button>
    </CardContent>
  </Card>
);

export default TimelinePortfolio;

