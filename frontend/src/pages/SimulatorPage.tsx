import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { ArrowDown, ArrowUp, BarChart2, Coins, DollarSign, TrendingDown, TrendingUp, History } from "lucide-react";
import { simulatorApi, type QuoteData } from "@/lib/api";
import { useToast } from "@/components/ui/use-toast";
import { useMainLayoutContext } from "@/layouts/MainLayout";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent
} from "@/components/ui/chart";
import { LineChart, Line, XAxis, YAxis, CartesianGrid } from "recharts";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import type { PortfolioSnapshot } from "@/lib/localAppState";
import { stockUniverseFallback } from "@/data/stockUniverseFallback";

type HoldingMetrics = {
  symbol: string;
  quantity: number;
  avgPrice: number;
  currentPrice: number;
  investedValue: number;
  currentValue: number;
  gain: number;
  changePercent: number;
};

const SimulatorPage = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { updateMascot, refreshProfile } = useMainLayoutContext();

  const stockUniverseQuery = useQuery({
    queryKey: ["simulator", "stocks"],
    queryFn: () => simulatorApi.stocks()
  });

  const stockUniverse = useMemo(
    () => stockUniverseQuery.data?.stocks ?? stockUniverseFallback,
    [stockUniverseQuery.data?.stocks]
  );

  const initialSymbol = stockUniverse[0]?.symbol ?? "RELIANCE";

  const [symbolInput, setSymbolInput] = useState(initialSymbol);
  const [quantity, setQuantity] = useState("1");
  const [selectedSymbol, setSelectedSymbol] = useState<string>(initialSymbol);
  const [portfolioQuotes, setPortfolioQuotes] = useState<Record<string, QuoteData>>({});

  useEffect(() => {
    if (!stockUniverse.length) {
      return;
    }
    const symbols = stockUniverse.map((entry) => entry.symbol);
    const fallbackSymbol = stockUniverse[0].symbol;

    if (!symbols.includes(selectedSymbol)) {
      setSelectedSymbol(fallbackSymbol);
      setSymbolInput(fallbackSymbol);
    }

  }, [stockUniverse, selectedSymbol]);

  const accountQuery = useQuery({
    queryKey: ["simulator", "account"],
    queryFn: () => simulatorApi.account()
  });

  const simulatorData = accountQuery.data;
  const account = simulatorData?.account;
  const positions = useMemo<PortfolioSnapshot["holdings"]>(
    () => simulatorData?.positions ?? [],
    [simulatorData]
  );

  const selectedQuoteQuery = useQuery({
    queryKey: ["simulator", "quote", selectedSymbol],
    queryFn: () => simulatorApi.quote(selectedSymbol),
    enabled: Boolean(selectedSymbol)
  });

  useEffect(() => {
    if (!positions.length) {
      setPortfolioQuotes({});
      return;
    }

    let cancelled = false;
    const loadQuotes = async () => {
      const entries = await Promise.all(
        positions.map(async (position: PortfolioSnapshot["holdings"][number]) => {
          try {
            const { quote } = await simulatorApi.quote(position.symbol);
            return [position.symbol, quote] as const;
          } catch (error) {
            console.warn("[Simulator] quote fetch failed", error);
            return [position.symbol, null] as const;
          }
        })
      );

      if (!cancelled) {
        const record: Record<string, QuoteData> = {};
        entries.forEach(([symbol, quote]) => {
          if (quote) {
            record[symbol] = quote;
          }
        });
        setPortfolioQuotes(record);
      }
    };

    loadQuotes();
    return () => {
      cancelled = true;
    };
  }, [positions]);

  useEffect(() => {
    if (!selectedSymbol && positions.length) {
      setSelectedSymbol(positions[0].symbol);
      setSymbolInput(positions[0].symbol);
    }
  }, [positions, selectedSymbol]);

  const holdingsWithMetrics = useMemo(() => {
    return positions.map((position) => {
      const quote = portfolioQuotes[position.symbol];
      const currentPrice = Number(quote?.price ?? position.avgPrice);
      const currentValue = currentPrice * position.quantity;
      const investedValue = position.avgPrice * position.quantity;
      const gain = currentValue - investedValue;
      const changePercent =
        investedValue > 0 ? Number(((gain / investedValue) * 100).toFixed(2)) : 0;

      return {
        symbol: position.symbol,
        quantity: Number(position.quantity),
        avgPrice: Number(position.avgPrice),
        currentPrice: Number(currentPrice.toFixed(2)),
        investedValue: Number(investedValue.toFixed(2)),
        currentValue: Number(currentValue.toFixed(2)),
        gain: Number(gain.toFixed(2)),
        changePercent
      };
    });
  }, [positions, portfolioQuotes]);

  const totals = useMemo(() => {
    const investedAmount = holdingsWithMetrics.reduce(
      (sum, item) => sum + item.investedValue,
      0
    );
    const holdingsValue = holdingsWithMetrics.reduce(
      (sum, item) => sum + item.currentValue,
      0
    );
    const cash = Number(account?.cashBalance ?? 0);
    const portfolioValue = cash + holdingsValue;
    const unrealised = holdingsValue - investedAmount;

    return {
      investedAmount,
      holdingsValue,
      cash,
      portfolioValue,
      unrealised
    };
  }, [account?.cashBalance, holdingsWithMetrics]);

  const translateMascotEvent = (event: { type: string; amount?: number } | undefined) => {
    if (!event) {
      return { mood: "idle" as const, message: undefined };
    }
    switch (event.type) {
      case "trade_success":
        return {
          mood: "celebrate" as const,
          message: "Great trade! Finny approves your move."
        };
      case "trade_loss":
        return {
          mood: "concern" as const,
          message: "Losses happen. Review the lesson and bounce back!"
        };
      default:
        return {
          mood: "focus" as const,
          message: "Keep tracking the market and stay curious."
        };
    }
  };

  const tradeMutation = useMutation<
    Awaited<ReturnType<typeof simulatorApi.trade>>,
    Error,
    { symbol: string; side: "buy" | "sell"; quantity: number }
  >({
    mutationFn: (payload) => simulatorApi.trade(payload),
    onSuccess: async (response) => {
      toast({
        title: "Trade executed",
        description: `${response.quantity} shares of ${response.symbol} ${
          response.side === "buy" ? "bought" : "sold"
        } at ₹${response.price.toFixed(2)}`
      });
      updateMascot(translateMascotEvent(response.mascotEvent));
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["simulator", "account"] }),
        queryClient.invalidateQueries({ queryKey: ["leaderboard"] }),
        refreshProfile()
      ]);
    },
    onError: (error) => {
      toast({
        title: "Trade failed",
        description: error?.message || "Unable to execute trade right now.",
        variant: "destructive"
      });
    }
  });

  const handleSelectSymbol = (symbol: string) => {
    const normalised = symbol.toUpperCase();
    setSelectedSymbol(normalised);
    setSymbolInput(normalised);
  };

  const handleTrade = (side: "buy" | "sell") => {
    if (!symbolInput) {
      toast({
        title: "Enter a symbol",
        description: "Type an NSE ticker like RELIANCE.",
        variant: "destructive"
      });
      return;
    }
    const qty = Number(quantity);
    if (!Number.isFinite(qty) || qty <= 0) {
      toast({
        title: "Invalid quantity",
        description: "Quantity must be a positive number.",
        variant: "destructive"
      });
      return;
    }
    tradeMutation.mutate({
      symbol: symbolInput.trim().toUpperCase(),
      side,
      quantity: qty
    });
  };

  const quote = selectedQuoteQuery.data?.quote;

  return (
    <div className="space-y-10 pb-20">
      <div className="space-y-1">
        <h1 className="text-3xl font-bold">Stock Market Simulator</h1>
        <p className="text-muted-foreground">
          Practice trading NSE stocks using a risk-free ₹100,000 sandbox. Quotes are delayed by 15
          minutes.
        </p>
      </div>

      <Card className="border border-dashed border-finance-light/60 bg-finance-light/10">
        <CardContent className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-finance">
              <History className="h-5 w-5" />
              <span className="text-sm font-semibold uppercase tracking-wide">New Module</span>
            </div>
            <h2 className="text-xl font-semibold">Time Travel Trading Simulator</h2>
            <p className="text-sm text-muted-foreground max-w-2xl">
              Replay past market crises, move day-by-day, and execute historical buy/sell decisions with
              virtual cash. Perfect for stress-testing strategies before taking them live.
            </p>
          </div>
          <Button size="lg" asChild className="bg-finance text-white hover:bg-finance-dark">
            <Link to="/time-travel">Launch Time Travel</Link>
          </Button>
        </CardContent>
      </Card>

      <div className="grid gap-4 grid-cols-1 md:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex justify-between items-center">
              <div>
                <p className="text-sm text-muted-foreground">Cash Balance</p>
                <h3 className="text-2xl font-semibold">₹{totals.cash.toFixed(2)}</h3>
              </div>
              <div className="p-3 rounded-full bg-finance-light/30">
                <DollarSign className="h-5 w-5 text-finance" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex justify-between items-center">
              <div>
                <p className="text-sm text-muted-foreground">Invested Amount</p>
                <h3 className="text-2xl font-semibold">₹{totals.investedAmount.toFixed(2)}</h3>
              </div>
              <div className="p-3 rounded-full bg-finance-light/30">
                <BarChart2 className="h-5 w-5 text-finance" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex justify-between items-center">
              <div>
                <p className="text-sm text-muted-foreground">Portfolio Value</p>
                <h3 className="text-2xl font-semibold">₹{totals.portfolioValue.toFixed(2)}</h3>
              </div>
              <div className="p-3 rounded-full bg-finance-light/30">
                <LineChart className="h-5 w-5 text-finance" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex justify-between items-center">
              <div>
                <p className="text-sm text-muted-foreground">Unrealised P/L</p>
                <h3
                  className={`text-2xl font-semibold ${
                    totals.unrealised >= 0 ? "text-finance-success" : "text-finance-danger"
                  }`}
                >
                  ₹{totals.unrealised.toFixed(2)}
                </h3>
              </div>
              <div className="p-3 rounded-full bg-finance-light/30">
                {totals.unrealised >= 0 ? (
                  <TrendingUp className="h-5 w-5 text-finance-success" />
                ) : (
                  <TrendingDown className="h-5 w-5 text-finance-danger" />
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-8 grid-cols-1 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle>Place Trade</CardTitle>
            <CardDescription>Choose an NSE ticker and practice buying or selling shares.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Ticker (NSE)</label>
              <Input
                placeholder="RELIANCE"
                value={symbolInput}
                onChange={(event) => setSymbolInput(event.target.value.toUpperCase())}
                onBlur={() => setSelectedSymbol(symbolInput)}
              />
              <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                {stockUniverse.slice(0, 12).map((entry) => (
                  <button
                    key={entry.symbol}
                    className="px-2 py-1 rounded-md bg-finance-light/20 hover:bg-finance-light/40"
                    onClick={() => handleSelectSymbol(entry.symbol)}
                    title={entry.name}
                    type="button"
                  >
                    {entry.symbol}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Quantity</label>
              <Input
                type="number"
                min="1"
                value={quantity}
                onChange={(event) => setQuantity(event.target.value)}
              />
            </div>

            {quote && (
              <div className="rounded-lg border border-finance-light/50 p-3 bg-finance-light/10 space-y-2 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Current Price</span>
                  <span className="font-semibold">₹{Number(quote.price).toFixed(2)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Previous Close</span>
                  <span className="font-medium">₹{Number(quote.previousClose).toFixed(2)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">% Change</span>
                  <span
                    className={`font-semibold ${
                      quote.change >= 0 ? "text-finance-success" : "text-finance-danger"
                    }`}
                  >
                    {quote.change >= 0 ? "+" : ""}
                    {Number(quote.change).toFixed(2)} (
                    {quote.percentChange >= 0 ? "+" : ""}
                    {Number(quote.percentChange).toFixed(2)}%)
                  </span>
                </div>
                <div className="text-xs text-muted-foreground space-y-1 pt-1 border-t border-dashed border-finance-light/40">
                  <p>Last Updated: {new Date(quote.timestamp).toLocaleString()}</p>
                  <p>Source: {quote.source || "NSE (Delayed 15m)"}</p>
                </div>
              </div>
            )}

            <div className="flex gap-3">
              <Button
                className="flex-1 bg-finance-success hover:bg-finance-success/90"
                disabled={tradeMutation.isPending}
                onClick={() => handleTrade("buy")}
              >
                <ArrowUp className="h-4 w-4 mr-2" />
                Buy
              </Button>
              <Button
                className="flex-1 bg-finance-danger hover:bg-finance-danger/90"
                disabled={tradeMutation.isPending}
                onClick={() => handleTrade("sell")}
              >
                <ArrowDown className="h-4 w-4 mr-2" />
                Sell
              </Button>
            </div>

            <Alert className="bg-muted/50 border border-dashed">
              <AlertTitle className="text-sm font-medium">Earn more coins</AlertTitle>
              <AlertDescription className="text-xs">
                Lessons reward coins and XP. Grow your balance before trying advanced trades.
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader className="pb-0">
            <CardTitle>Portfolio & Quotes</CardTitle>
            <CardDescription>Monitor your holdings and track live market data.</CardDescription>
          </CardHeader>
          <CardContent className="pt-4 space-y-6">
            <Tabs defaultValue="portfolio">
              <TabsList className="mb-4">
                <TabsTrigger value="portfolio">My Portfolio</TabsTrigger>
                <TabsTrigger value="watchlist">Quote Lookup</TabsTrigger>
              </TabsList>

              <TabsContent value="portfolio" className="space-y-4">
                {holdingsWithMetrics.length === 0 ? (
                  <div className="text-sm text-muted-foreground text-center py-10">
                    No positions yet. Use the trade panel to start investing.
                  </div>
                ) : (
                  <div className="overflow-x-auto rounded-xl border border-finance-light/40">
                    <table className="min-w-full text-sm">
                      <thead className="bg-finance-light/10 text-xs uppercase tracking-wide text-muted-foreground">
                        <tr>
                          <th className="px-4 py-3 text-left">Symbol</th>
                          <th className="px-4 py-3 text-right">Qty</th>
                          <th className="px-4 py-3 text-right">Avg Price</th>
                          <th className="px-4 py-3 text-right">Current Price</th>
                          <th className="px-4 py-3 text-right">Invested</th>
                          <th className="px-4 py-3 text-right">Current Value</th>
                          <th className="px-4 py-3 text-right">Unrealised</th>
                        </tr>
                      </thead>
                      <tbody>
                        {holdingsWithMetrics.map((holding) => (
                          <tr
                            key={holding.symbol}
                            className="hover:bg-finance-light/10 cursor-pointer"
                            onClick={() => handleSelectSymbol(holding.symbol)}
                          >
                            <td className="px-4 py-3 font-medium">{holding.symbol}</td>
                            <td className="px-4 py-3 text-right">{holding.quantity.toFixed(2)}</td>
                            <td className="px-4 py-3 text-right">₹{holding.avgPrice.toFixed(2)}</td>
                            <td className="px-4 py-3 text-right">₹{holding.currentPrice.toFixed(2)}</td>
                            <td className="px-4 py-3 text-right">₹{holding.investedValue.toFixed(2)}</td>
                            <td className="px-4 py-3 text-right">₹{holding.currentValue.toFixed(2)}</td>
                            <td
                              className={`px-4 py-3 text-right ${
                                holding.gain >= 0 ? "text-finance-success" : "text-finance-danger"
                              }`}
                            >
                              ₹{holding.gain.toFixed(2)} ({holding.changePercent.toFixed(2)}%)
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="watchlist" className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Enter any NSE ticker to fetch delayed quotes. Examples: RELIANCE, HDFCBANK, INFY.
                </p>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
                  {stockUniverse.slice(0, 16).map((entry) => (
                    <button
                      key={entry.symbol}
                      onClick={() => handleSelectSymbol(entry.symbol)}
                      className="px-3 py-2 rounded-md border border-finance-light/40 hover:border-finance"
                      title={entry.name}
                      type="button"
                    >
                      {entry.symbol}
                    </button>
                  ))}
                </div>
                {quote && (
                  <div className="rounded-xl border border-finance-light/50 p-4 bg-finance-light/10 space-y-3">
                    <div className="flex justify-between items-center">
                      <div>
                        <h3 className="font-semibold text-lg">{quote.symbol}</h3>
                        <p className="text-xs text-muted-foreground">
                          {quote.companyName} · {quote.exchange}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-2xl font-bold">₹{Number(quote.price).toFixed(2)}</p>
                        <p
                          className={`text-sm font-semibold ${
                            quote.change >= 0 ? "text-finance-success" : "text-finance-danger"
                          }`}
                        >
                          {quote.change >= 0 ? "+" : ""}
                          {Number(quote.change).toFixed(2)} (
                          {quote.percentChange >= 0 ? "+" : ""}
                          {Number(quote.percentChange).toFixed(2)}%)
                        </p>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs text-muted-foreground">
                      <div>
                        <span className="block text-[11px] uppercase tracking-wide">Prev Close</span>
                        <span className="font-semibold text-finance-dark">
                          ₹{Number(quote.previousClose).toFixed(2)}
                        </span>
                      </div>
                      <div>
                        <span className="block text-[11px] uppercase tracking-wide">Open</span>
                        <span className="font-semibold text-finance-dark">
                          ₹{Number(quote.open).toFixed(2)}
                        </span>
                      </div>
                      <div>
                        <span className="block text-[11px] uppercase tracking-wide">Day High</span>
                        <span className="font-semibold text-finance-dark">
                          ₹{Number(quote.high).toFixed(2)}
                        </span>
                      </div>
                      <div>
                        <span className="block text-[11px] uppercase tracking-wide">Day Low</span>
                        <span className="font-semibold text-finance-dark">
                          ₹{Number(quote.low).toFixed(2)}
                        </span>
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      Current Price: ₹{Number(quote.price).toFixed(2)} · Last Updated:{" "}
                      {new Date(quote.timestamp).toLocaleString()}
                      <br />
                      Source: {quote.source || "NSE (Delayed 15m)"}
                    </p>
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>

    </div>
  );
};

export default SimulatorPage;
