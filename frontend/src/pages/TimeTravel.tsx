import { useCallback, useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { ChevronLeft, ChevronRight, TrendingDown, TrendingUp } from "lucide-react";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { Line, LineChart, XAxis, YAxis, CartesianGrid, Scatter } from "recharts";
import {
  simulatorApi,
  timeTravelApi,
  type TimeTravelCrisisPreset,
  type TimeTravelEvent
} from "@/lib/api";
import { stockUniverseFallback } from "@/data/stockUniverseFallback";
import { useToast } from "@/components/ui/use-toast";
import HistoricalTradeModal from "@/components/HistoricalTradeModal";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";

const INITIAL_CASH = 100000;

const getMonthLabel = (month: string | undefined) => {
  if (!month) return "--";
  const date = new Date(`${month}-01T00:00:00Z`);
  if (Number.isNaN(date.getTime())) return month;
  return date.toLocaleDateString("en-IN", { month: "long", year: "numeric" });
};

const formatCurrency = (value: number, maximumFractionDigits = 0) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits,
    minimumFractionDigits: maximumFractionDigits
  }).format(Number.isFinite(value) ? value : 0);

const cacheKey = (crisisId: string, symbol: string) => `${crisisId || "default"}|${symbol.toUpperCase()}`;

const PORTFOLIO_STORAGE_KEY = "sampaket:time-travel:portfolio-v2";

const getStorageKey = (crisisId: string) => `${PORTFOLIO_STORAGE_KEY}:${crisisId || "default"}`;

const readTradesFromStorage = (crisisId: string): TradeRecord[] => {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(getStorageKey(crisisId));
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (trade) =>
        trade &&
        typeof trade.symbol === "string" &&
        typeof trade.month === "string" &&
        typeof trade.quantity === "number" &&
        typeof trade.price === "number" &&
        (trade.type === "BUY" || trade.type === "SELL")
    );
  } catch (error) {
    console.warn("[time-travel] failed to parse stored trades", error);
    return [];
  }
};

const writeTradesToStorage = (crisisId: string, trades: TradeRecord[]) => {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(getStorageKey(crisisId), JSON.stringify(trades));
  } catch (error) {
    console.warn("[time-travel] failed to persist trades", error);
  }
};

type HistoricalPoint = {
  date: string;
  close: number;
  open?: number;
  high?: number;
  low?: number;
  volume?: number;
};

type MonthlyPoint = {
  month: string;
  label: string;
  averageClose: number;
  averageOpen: number;
  high: number;
  low: number;
  volume: number;
};

type TradeRecord = {
  id: string;
  symbol: string;
  month: string;
  quantity: number;
  price: number;
  type: "BUY" | "SELL";
};

type HoldingSnapshot = {
  symbol: string;
  quantity: number;
  avgPrice: number;
};

const FALLBACK_EVENTS: Record<string, TimeTravelEvent[]> = {
  gfc_2008: [
    {
      month: "2007-08",
      marketCondition: "US housing market shows cracks; credit spreads widen."
    },
    {
      month: "2008-09",
      marketCondition: "Markets crash following Lehman Brothers collapse."
    },
    {
      month: "2009-03",
      marketCondition: "Coordinated stimulus sparks tentative rebound."
    }
  ],
  covid_2020: [
    {
      month: "2020-03",
      marketCondition: "Lockdowns trigger record volatility and panic selling."
    },
    {
      month: "2020-06",
      marketCondition: "Tech-led rally accelerates as remote work surges."
    },
    {
      month: "2021-03",
      marketCondition: "Reopening optimism broadens the rally."
    }
  ],
  inflation_2022: [
    {
      month: "2022-03",
      marketCondition: "Energy shock keeps inflation elevated."
    },
    {
      month: "2022-06",
      marketCondition: "Central banks hike aggressively to tame prices."
    },
    {
      month: "2022-12",
      marketCondition: "Inflation cools modestly; growth concerns linger."
    }
  ]
};

const FALLBACK_IMAGES: Record<string, string> = {
  gfc_2008: "/images/crisis/2008.svg",
  covid_2020: "/images/crisis/covid19.svg",
  inflation_2022: "/images/crisis/2022.svg"
};

const CRISIS_ALIASES: Record<string, string> = {
  "1": "gfc_2008",
  "01": "gfc_2008",
  "2008": "gfc_2008",
  gfc2008: "gfc_2008",
  "2": "covid_2020",
  "02": "covid_2020",
  covid: "covid_2020",
  covid19: "covid_2020",
  "covid-19": "covid_2020",
  "3": "inflation_2022",
  "03": "inflation_2022",
  inflation: "inflation_2022",
  energy: "inflation_2022"
};

const resolveCrisisKey = (id?: string | null) => {
  if (!id) return "";
  const trimmed = id.trim().toLowerCase();
  return CRISIS_ALIASES[trimmed] || trimmed;
};

const parseMonth = (input: string) => {
  const [year, month] = input.split("-").map(Number);
  if (!year || !month) return null;
  return new Date(year, month - 1, 1);
};

const resolveEventForMonth = (events: TimeTravelEvent[], targetMonth?: string) => {
  if (!events.length || !targetMonth) {
    return undefined;
  }
  const exact = events.find((event) => event.month === targetMonth);
  if (exact) return exact;

  const targetDate = parseMonth(targetMonth);
  if (!targetDate) {
    return events[events.length - 1];
  }

  let candidate: TimeTravelEvent | undefined;
  let candidateTime = -Infinity;

  events.forEach((event) => {
    const eventDate = parseMonth(event.month);
    if (!eventDate) return;
    const time = eventDate.getTime();
    if (time <= targetDate.getTime() && time > candidateTime) {
      candidate = event;
      candidateTime = time;
    }
  });

  return candidate ?? events[events.length - 1];
};

const aggregateMonthly = (points: HistoricalPoint[]): MonthlyPoint[] => {
  const buckets = new Map<
    string,
    { sumClose: number; sumOpen: number; high: number; low: number; volume: number; count: number }
  >();

  points.forEach((point) => {
    const month = point.date.slice(0, 7);
    if (!month) return;
    if (!buckets.has(month)) {
      buckets.set(month, {
        sumClose: 0,
        sumOpen: 0,
        high: typeof point.high === "number" ? point.high : point.close,
        low: typeof point.low === "number" ? point.low : point.close,
        volume: 0,
        count: 0
      });
    }
    const bucket = buckets.get(month)!;
    bucket.sumClose += point.close;
    bucket.sumOpen += typeof point.open === "number" ? point.open : point.close;
    bucket.high = Math.max(bucket.high, typeof point.high === "number" ? point.high : point.close);
    bucket.low = Math.min(bucket.low, typeof point.low === "number" ? point.low : point.close);
    bucket.volume += typeof point.volume === "number" ? point.volume : 0;
    bucket.count += 1;
  });

  return Array.from(buckets.entries())
    .sort(([a], [b]) => (a > b ? 1 : -1))
    .map(([month, bucket]) => ({
      month,
      label: getMonthLabel(month),
      averageClose: Number((bucket.sumClose / Math.max(bucket.count, 1)).toFixed(2)),
      averageOpen: Number((bucket.sumOpen / Math.max(bucket.count, 1)).toFixed(2)),
      high: Number(bucket.high.toFixed(2)),
      low: Number(bucket.low.toFixed(2)),
      volume: Math.round(bucket.volume)
    }));
};

const buildHoldings = (trades: TradeRecord[]): Map<string, HoldingSnapshot> => {
  const map = new Map<string, HoldingSnapshot>();
  trades.forEach((trade) => {
    const key = trade.symbol;
    const current = map.get(key) ?? { symbol: trade.symbol, quantity: 0, avgPrice: 0 };
    if (trade.type === "BUY") {
      const totalCost = current.avgPrice * current.quantity + trade.price * trade.quantity;
      const newQuantity = current.quantity + trade.quantity;
      current.quantity = Number(newQuantity.toFixed(4));
      current.avgPrice = Number((totalCost / Math.max(newQuantity, 1)).toFixed(2));
      map.set(key, current);
    } else {
      const newQuantity = current.quantity - trade.quantity;
      if (newQuantity <= 0) {
        map.delete(key);
      } else {
        current.quantity = Number(newQuantity.toFixed(4));
        map.set(key, current);
      }
    }
  });
  return map;
};

const TimeTravel = () => {
  const { toast } = useToast();
  const [selectedCrisis, setSelectedCrisis] = useState<string>("");
  const [selectedSymbol, setSelectedSymbol] = useState<string>("");
  const [historyCache, setHistoryCache] = useState<Record<string, MonthlyPoint[]>>({});
  const [selectedMonthIndex, setSelectedMonthIndex] = useState(0);
  const [isSymbolLoading, setIsSymbolLoading] = useState(false);
  const [trades, setTrades] = useState<TradeRecord[]>([]);
  const [modalState, setModalState] = useState<{ side: "BUY" | "SELL"; open: boolean }>({
    side: "BUY",
    open: false
  });

  const stocksQuery = useQuery({
    queryKey: ["time-travel", "stocks"],
    queryFn: () => simulatorApi.stocks()
  });

  const crisesQuery = useQuery({
    queryKey: ["time-travel", "crises"],
    queryFn: () => timeTravelApi.crises(),
    staleTime: 1000 * 60 * 60
  });

  const canonicalCrisisId = useMemo(
    () => resolveCrisisKey(selectedCrisis) || selectedCrisis,
    [selectedCrisis]
  );

  const eventsQuery = useQuery({
    queryKey: ["time-travel", "events", canonicalCrisisId],
    queryFn: () => timeTravelApi.events(canonicalCrisisId),
    enabled: Boolean(canonicalCrisisId),
    staleTime: 1000 * 60 * 10,
    retry: 1
  });

  const stockUniverse = useMemo(
    () => stocksQuery.data?.stocks ?? stockUniverseFallback,
    [stocksQuery.data?.stocks]
  );

  const crisisList: Array<
    TimeTravelCrisisPreset & { id: string; difficulty?: string; image?: string }
  > = useMemo(() => {
    const remote = crisesQuery.data?.crises ?? [];
    if (remote.length) {
      return remote.map((crisis, index) => ({
        ...crisis,
        id: (crisis.id || crisis.title || `crisis-${index}`).toString()
      }));
    }
    return [
      {
        id: "gfc_2008",
        title: "2008 Financial Crisis",
        description: "Triggered by the US housing collapse, markets suffered historic drawdowns.",
        startDate: "2007-01-01",
        endDate: "2009-12-31",
        eventDate: "2008-09-15",
        entryDate: "2007-01-01",
        difficulty: "Hard",
        image: FALLBACK_IMAGES.gfc_2008
      },
      {
        id: "covid_2020",
        title: "COVID-19 Market Crash",
        description: "Pandemic panic, stimulus waves, and a tech-led rebound.",
        startDate: "2019-01-01",
        endDate: "2021-06-30",
        eventDate: "2020-03-23",
        entryDate: "2019-12-01",
        difficulty: "Medium",
        image: FALLBACK_IMAGES.covid_2020
      },
      {
        id: "inflation_2022",
        title: "2022 Inflation & Energy Crisis",
        description: "Energy shocks and aggressive rate hikes fuel volatile markets.",
        startDate: "2021-09-01",
        endDate: "2023-03-31",
        eventDate: "2022-06-17",
        entryDate: "2021-09-01",
        difficulty: "Medium",
        image: FALLBACK_IMAGES.inflation_2022
      }
    ];
  }, [crisesQuery.data?.crises]);

  useEffect(() => {
    if (!selectedCrisis && crisisList.length) {
      setSelectedCrisis(crisisList[0].id);
    }
  }, [crisisList, selectedCrisis]);

  useEffect(() => {
    if (!selectedSymbol && stockUniverse.length) {
      setSelectedSymbol(
        stockUniverse[0].symbol.toUpperCase().endsWith(".NS")
          ? stockUniverse[0].symbol.toUpperCase()
          : `${stockUniverse[0].symbol.toUpperCase()}.NS`
      );
    }
  }, [stockUniverse, selectedSymbol]);

  useEffect(() => {
    if (!selectedCrisis) return;
    setTrades(readTradesFromStorage(selectedCrisis));
  }, [selectedCrisis]);

  useEffect(() => {
    if (!selectedCrisis) return;
    writeTradesToStorage(selectedCrisis, trades);
  }, [selectedCrisis, trades]);

  const fetchSymbolHistory = useCallback(
    async (symbol: string, crisisId: string) => {
      if (!symbol || !crisisId) return;
      const effectiveCrisisId = resolveCrisisKey(crisisId) || crisisId;
      const key = cacheKey(effectiveCrisisId, symbol);
      if (historyCache[key]) return;
      if (symbol === selectedSymbol) {
        setIsSymbolLoading(true);
      }
      try {
        const response = await timeTravelApi.history(symbol, {
          crisisId: effectiveCrisisId,
          interval: "1day"
        });
        const aggregated = aggregateMonthly(response.points ?? []);
        setHistoryCache((prev) => ({
          ...prev,
          [key]: aggregated
        }));
      } catch (error) {
        console.error("[time-travel] failed to load symbol history", error);
        toast({
          title: `Unable to load ${symbol}`,
          description:
            (error as any)?.details?.message ?? (error as Error)?.message ?? "Check market data credentials.",
          variant: "destructive"
        });
      } finally {
        if (symbol === selectedSymbol) {
          setIsSymbolLoading(false);
        }
      }
    },
    [historyCache, selectedSymbol, toast]
  );

  useEffect(() => {
    if (!selectedSymbol || !selectedCrisis) return;
    fetchSymbolHistory(selectedSymbol, selectedCrisis);
  }, [selectedSymbol, selectedCrisis, fetchSymbolHistory]);

  useEffect(() => {
    if (!selectedCrisis) return;
    const requiredSymbols = Array.from(new Set(trades.map((trade) => trade.symbol)));
    requiredSymbols.forEach((symbol) => fetchSymbolHistory(symbol, selectedCrisis));
  }, [trades, selectedCrisis, fetchSymbolHistory]);

  const monthlyData = useMemo(() => {
    if (!selectedSymbol || !canonicalCrisisId) return [] as MonthlyPoint[];
    return historyCache[cacheKey(canonicalCrisisId, selectedSymbol)] ?? [];
  }, [historyCache, canonicalCrisisId, selectedSymbol]);

  useEffect(() => {
    if (!monthlyData.length) {
      setSelectedMonthIndex(0);
      return;
    }
    setSelectedMonthIndex((prev) => Math.min(prev, Math.max(monthlyData.length - 1, 0)));
  }, [monthlyData.length]);

  const selectedMonthEntry = monthlyData[selectedMonthIndex];

  const holdingsMap = useMemo(() => buildHoldings(trades), [trades]);

  const getPriceForSymbol = useCallback(
    (symbol: string, month: string | undefined) => {
      if (!symbol || !canonicalCrisisId) return 0;
      const data = historyCache[cacheKey(canonicalCrisisId, symbol)] ?? [];
      if (!data.length) return 0;
      if (month) {
        const match = data.find((entry) => entry.month === month);
        if (match) return match.averageClose;
      }
      return data[data.length - 1]?.averageClose ?? 0;
    },
    [historyCache, canonicalCrisisId]
  );

  const holdingsArray = useMemo(() => Array.from(holdingsMap.values()), [holdingsMap]);

  const holdingsWithMarket = useMemo(
    () =>
      holdingsArray.map((holding) => {
        const currentPrice = getPriceForSymbol(holding.symbol, selectedMonthEntry?.month);
        const currentValue = Number((currentPrice * holding.quantity).toFixed(2));
        const invested = Number((holding.avgPrice * holding.quantity).toFixed(2));
        const profitAmount = Number((currentValue - invested).toFixed(2));
        const profitPercent = invested > 0 ? Number(((profitAmount / invested) * 100).toFixed(2)) : 0;
        return {
          ...holding,
          currentPrice,
          currentValue,
          profitAmount,
          profitPercent
        };
      }),
    [getPriceForSymbol, holdingsArray, selectedMonthEntry?.month]
  );

  const portfolioSnapshot = useMemo(() => {
    const buys = trades
      .filter((trade) => trade.type === "BUY")
      .reduce((sum, trade) => sum + trade.price * trade.quantity, 0);
    const sells = trades
      .filter((trade) => trade.type === "SELL")
      .reduce((sum, trade) => sum + trade.price * trade.quantity, 0);
    const cash = Number((INITIAL_CASH - buys + sells).toFixed(2));
    const holdingsValue = holdingsWithMarket.reduce((sum, holding) => sum + holding.currentValue, 0);
    const totalValue = Number((cash + holdingsValue).toFixed(2));
    const totalProfit = Number((totalValue - INITIAL_CASH).toFixed(2));
    const totalProfitPercent = Number(((totalProfit / INITIAL_CASH) * 100).toFixed(2));
    return { cash, holdingsValue, totalValue, totalProfit, totalProfitPercent };
  }, [trades, holdingsWithMarket]);

  const crisisMeta = useMemo(
    () => crisisList.find((crisis) => crisis.id === selectedCrisis) || null,
    [crisisList, selectedCrisis]
  );

  const monthlyEvents = useMemo(() => {
    if (!canonicalCrisisId) return [] as TimeTravelEvent[];
    const fallbackKey = resolveCrisisKey(canonicalCrisisId) || canonicalCrisisId;
    const dataset =
      eventsQuery.data?.events?.length === 0 && eventsQuery.isSuccess
        ? []
        : eventsQuery.data?.events || FALLBACK_EVENTS[fallbackKey] || [];
    return [...dataset].filter((event) => Boolean(event?.month)).sort((a, b) =>
      a.month > b.month ? 1 : a.month < b.month ? -1 : 0
    );
  }, [canonicalCrisisId, eventsQuery.data?.events, eventsQuery.isSuccess]);

  const currentEvent = useMemo(() => {
    if (!selectedMonthEntry) return undefined;
    return resolveEventForMonth(monthlyEvents, selectedMonthEntry.month);
  }, [monthlyEvents, selectedMonthEntry]);

  const progressPercentage = useMemo(() => {
    if (!monthlyData.length) return 0;
    if (monthlyData.length === 1) return 100;
    return (selectedMonthIndex / (monthlyData.length - 1)) * 100;
  }, [monthlyData.length, selectedMonthIndex]);

  const handleMonthChange = (delta: number) => {
    if (!monthlyData.length) return;
    setSelectedMonthIndex((index) => {
      const next = index + delta;
      if (next < 0) return 0;
      if (next >= monthlyData.length) return monthlyData.length - 1;
      return next;
    });
  };

  const handleResetTimeline = () => setSelectedMonthIndex(0);

  const handleTrade = useCallback(
    (side: "BUY" | "SELL", quantity: number) => {
      if (!selectedSymbol || !selectedMonthEntry) {
        toast({
          title: "Select a stock and month",
          description: "Choose a crisis, stock, and month before placing a trade.",
          variant: "destructive"
        });
        return;
      }
      if (quantity <= 0) {
        toast({
          title: "Quantity required",
          description: "Enter a quantity greater than zero.",
          variant: "destructive"
        });
        return;
      }
      if (side === "SELL") {
        const holding = holdingsMap.get(selectedSymbol);
        if (!holding || holding.quantity < quantity) {
          toast({
            title: "Not enough shares",
            description: "You cannot sell more than you currently hold for this stock.",
            variant: "destructive"
          });
          return;
        }
      }
      const trade: TradeRecord = {
        id: typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`,
        symbol: selectedSymbol,
        month: selectedMonthEntry.month,
        quantity,
        price: selectedMonthEntry.averageClose,
        type: side
      };
      setTrades((prev) => [...prev, trade]);
      toast({
        title: side === "BUY" ? "Position added" : "Position reduced",
        description:
          side === "BUY"
            ? `Bought ${quantity} ${selectedSymbol.replace(".NS", "")} at ${formatCurrency(
                selectedMonthEntry.averageClose,
                2
              )}`
            : `Sold ${quantity} ${selectedSymbol.replace(".NS", "")} at ${formatCurrency(
                selectedMonthEntry.averageClose,
                2
              )}`
      });
    },
    [holdingsMap, selectedMonthEntry, selectedSymbol, toast]
  );

  const displaySymbol = selectedSymbol.replace(/\.NS$/i, "");

  return (
    <div className="space-y-8 pb-24">
      <Card>
        <CardHeader>
          <CardTitle className="text-3xl">Time Travel Trading Simulator</CardTitle>
          <CardDescription>
            Relive historic market crises, place trades at monthly prices, and track profit or loss as you advance
            through time.
          </CardDescription>
        </CardHeader>
      </Card>

      <div className="grid gap-4 md:grid-cols-3">
        {crisisList.map((crisis) => {
          const isActive = crisis.id === selectedCrisis;
          const crisisKey = resolveCrisisKey(crisis.id);
          const imageSrc = crisis.image || FALLBACK_IMAGES[crisisKey] || FALLBACK_IMAGES.gfc_2008;
          return (
            <Card
              key={crisis.id}
              className={cn(
                "group cursor-pointer overflow-hidden transition-all border",
                isActive ? "border-finance shadow-lg" : "border-transparent hover:border-finance/40"
              )}
              onClick={() => {
                setSelectedCrisis(crisis.id);
                setHistoryCache({});
                setSelectedMonthIndex(0);
              }}
            >
              <div className="h-40 w-full overflow-hidden">
                <img
                  src={imageSrc}
                  alt={`${crisis.title} illustration`}
                  className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                  loading="lazy"
                />
              </div>
              <CardHeader className="space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <CardTitle className="text-base font-semibold leading-tight">{crisis.title}</CardTitle>
                  {crisis.difficulty ? (
                    <Badge variant="outline" className="text-xs uppercase tracking-wide">
                      {crisis.difficulty}
                    </Badge>
                  ) : null}
                </div>
                <CardDescription className="text-sm leading-relaxed">
                  {crisis.description || "Navigate the volatility of this historical period."}
                </CardDescription>
                <div className="text-xs text-muted-foreground">
                  {getMonthLabel(crisis.startDate.slice(0, 7))} → {getMonthLabel(crisis.endDate.slice(0, 7))}
                </div>
              </CardHeader>
            </Card>
          );
        })}
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="space-y-1">
              <div className="flex items-center gap-3">
                <CardTitle className="text-xl font-semibold">
                  {selectedMonthEntry ? selectedMonthEntry.label : "Select a crisis"}
                </CardTitle>
                {crisisMeta?.difficulty ? (
                  <Badge variant="outline" className="text-xs uppercase tracking-wide">
                    {crisisMeta.difficulty}
                  </Badge>
                ) : null}
              </div>
              <p className="text-sm text-muted-foreground">
                {selectedMonthEntry ? `${selectedMonthEntry.month} • ${selectedMonthIndex + 1} of ${monthlyData.length}` : "Timeline updates as you move through the crisis."}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" onClick={() => handleMonthChange(-1)} disabled={selectedMonthIndex === 0}>
                <ChevronLeft className="h-4 w-4" />
                Previous
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleMonthChange(1)}
                disabled={!monthlyData.length || selectedMonthIndex >= monthlyData.length - 1}
              >
                Next
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
              <Button variant="outline" size="sm" onClick={handleResetTimeline} disabled={!monthlyData.length || selectedMonthIndex === 0}>
                Reset
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="h-2 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden">
            <div
              className="h-full bg-finance transition-all duration-500"
              style={{ width: `${progressPercentage}%` }}
            />
          </div>
          <div className="grid gap-4 md:grid-cols-4 sm:grid-cols-2 text-sm">
            <div className="rounded-xl bg-finance-light/20 px-4 py-3">
              <p className="uppercase text-[11px] text-muted-foreground tracking-wide">Current Month</p>
              <p className="text-base font-semibold text-finance-dark">
                {selectedMonthEntry ? selectedMonthEntry.label : "—"}
              </p>
            </div>
            <div className="rounded-xl bg-finance-light/20 px-4 py-3">
              <p className="uppercase text-[11px] text-muted-foreground tracking-wide">Average Price</p>
              <p className="text-base font-semibold text-finance-dark">
                {selectedMonthEntry ? formatCurrency(selectedMonthEntry.averageClose) : "—"}
              </p>
            </div>
            <div className="rounded-xl bg-finance-light/20 px-4 py-3">
              <p className="uppercase text-[11px] text-muted-foreground tracking-wide">High / Low</p>
              <p className="text-base font-semibold text-finance-dark">
                {selectedMonthEntry
                  ? `${formatCurrency(selectedMonthEntry.high)} / ${formatCurrency(selectedMonthEntry.low)}`
                  : "—"}
              </p>
            </div>
            <div className="rounded-xl bg-finance-light/20 px-4 py-3">
              <p className="uppercase text-[11px] text-muted-foreground tracking-wide">Volume (est.)</p>
              <p className="text-base font-semibold text-finance-dark">
                {selectedMonthEntry?.volume ? selectedMonthEntry.volume.toLocaleString("en-IN") : "—"}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Market Condition</CardTitle>
          <CardDescription>
            Snapshot commentary for the selected month and crisis timeline.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div
            key={selectedMonthEntry?.month || "market-placeholder"}
            className="rounded-lg bg-finance-light/25 p-4 transition-all duration-500"
          >
            <p className="text-xs uppercase tracking-wide text-finance font-semibold">
              {selectedMonthEntry ? getMonthLabel(selectedMonthEntry.month) : "Select a month"}
            </p>
            <p className="mt-2 text-sm text-muted-foreground">
              <span className="font-semibold text-finance-dark">Market Condition:</span>{" "}
              {eventsQuery.isLoading
                ? "Loading market insight..."
                : currentEvent?.marketCondition ?? "Market tone mirrors the prior month without notable shifts."}
            </p>
          </div>
          {eventsQuery.isError ? (
            <p className="mt-3 text-xs text-amber-600">
              Market conditions unavailable. Try reloading or check the backend service.
            </p>
          ) : null}
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Position overview ({displaySymbol || "Select a stock"})</CardTitle>
            <CardDescription>Metrics for your active position in this stock.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex items-center justify-between">
              <span>Shares held</span>
              <span className="font-semibold">
                {holdingsMap.get(selectedSymbol)?.quantity?.toFixed(2) ?? "0.00"}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span>Average buy price</span>
              <span className="font-semibold">
                {holdingsMap.get(selectedSymbol)
                  ? formatCurrency(holdingsMap.get(selectedSymbol)!.avgPrice, 2)
                  : "—"}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span>Current price</span>
              <span className="font-semibold">
                {selectedMonthEntry ? formatCurrency(selectedMonthEntry.averageClose, 2) : "—"}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span>Unrealised P/L</span>
              <span
                className={cn(
                  "font-semibold",
                  portfolioSnapshot.totalProfit >= 0 ? "text-finance-success" : "text-finance-danger"
                )}
              >
                {holdingsMap.has(selectedSymbol)
                  ? `${formatCurrency(
                      (selectedMonthEntry?.averageClose ?? 0) * holdingsMap.get(selectedSymbol)!.quantity -
                        holdingsMap.get(selectedSymbol)!.avgPrice * holdingsMap.get(selectedSymbol)!.quantity,
                      2
                    )}`
                  : "—"}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Buy shares</CardTitle>
            <CardDescription>Use the selected month’s price to add to your position.</CardDescription>
          </CardHeader>
          <CardContent>
            <Select value={selectedSymbol} onValueChange={setSelectedSymbol}>
              <SelectTrigger className="mb-3">
                <SelectValue placeholder="Choose a stock" />
              </SelectTrigger>
              <SelectContent className="max-h-72">
                {stockUniverse.map((entry) => {
                  const value = entry.symbol.toUpperCase().endsWith(".NS")
                    ? entry.symbol.toUpperCase()
                    : `${entry.symbol.toUpperCase()}.NS`;
                  return (
                    <SelectItem key={value} value={value}>
                      {entry.symbol.toUpperCase()} · {entry.name}
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
            <Button
              disabled={!selectedMonthEntry}
              className="w-full justify-start gap-2"
              onClick={() => setModalState({ side: "BUY", open: true })}
            >
              <TrendingUp className="h-4 w-4" />
              Buy {displaySymbol || "stock"} in {selectedMonthEntry?.label ?? "selected month"}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Sell shares</CardTitle>
            <CardDescription>Take profits or cut losses based on the selected month.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              variant="outline"
              disabled={!selectedMonthEntry || !holdingsMap.get(selectedSymbol)}
              className="w-full justify-start gap-2"
              onClick={() => setModalState({ side: "SELL", open: true })}
            >
              <TrendingDown className="h-4 w-4" />
              Sell up to {holdingsMap.get(selectedSymbol)?.quantity?.toFixed(2) ?? "0.00"} shares
            </Button>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Portfolio snapshot</CardTitle>
          <CardDescription>Aggregate performance across all holdings for this crisis.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-xl border border-finance-light/50 p-4">
            <p className="uppercase text-[11px] text-muted-foreground tracking-wide">Cash available</p>
            <p className="text-lg font-semibold text-finance-dark">
              {formatCurrency(portfolioSnapshot.cash, 2)}
            </p>
          </div>
          <div className="rounded-xl border border-finance-light/50 p-4">
            <p className="uppercase text-[11px] text-muted-foreground tracking-wide">Holdings value</p>
            <p className="text-lg font-semibold text-finance-dark">
              {formatCurrency(portfolioSnapshot.holdingsValue, 2)}
            </p>
          </div>
          <div className="rounded-xl border border-finance-light/50 p-4">
            <p className="uppercase text-[11px] text-muted-foreground tracking-wide">Total portfolio</p>
            <p className="text-lg font-semibold text-finance-dark">
              {formatCurrency(portfolioSnapshot.totalValue, 2)}
            </p>
          </div>
          <div className="rounded-xl border border-finance-light/50 p-4">
            <p className="uppercase text-[11px] text-muted-foreground tracking-wide">Total P/L</p>
            <p
              className={cn(
                "text-lg font-semibold",
                portfolioSnapshot.totalProfit >= 0 ? "text-finance-success" : "text-finance-danger"
              )}
            >
              {formatCurrency(portfolioSnapshot.totalProfit, 2)} ({portfolioSnapshot.totalProfitPercent}% )
            </p>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <CardTitle>Price timeline</CardTitle>
              {isSymbolLoading ? <Badge variant="outline">Loading…</Badge> : null}
            </div>
            <CardDescription>
              View how {displaySymbol || "this stock"} trades throughout the crisis. Trade markers show your activity.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {monthlyData.length ? (
              <ChartContainer
                config={{
                  averageClose: {
                    label: "Average Close",
                    color: "hsl(var(--chart-1))"
                  }
                }}
                className="h-[320px]"
              >
                <LineChart data={monthlyData} width={900} height={320}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" tickFormatter={(value: string) => value.slice(0, 7)} minTickGap={32} />
                  <YAxis
                    stroke="#94a3b8"
                    tickFormatter={(value: number) => new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 }).format(value)}
                  />
                  <ChartTooltip
                    content={
                      <ChartTooltipContent
                        formatter={(value: number, _name, item) => [
                          formatCurrency(value, 2),
                          getMonthLabel((item?.payload as MonthlyPoint | undefined)?.month)
                        ]}
                      />
                    }
                  />
                  <Line type="monotone" dataKey="averageClose" stroke="var(--color-averageClose)" strokeWidth={2} dot={false} />
                  <Scatter
                    data={trades
                      .filter((trade) => trade.symbol === selectedSymbol)
                      .map((trade) => ({
                        month: trade.month,
                        averageClose: getPriceForSymbol(trade.symbol, trade.month),
                        side: trade.type
                      }))}
                    fill="var(--chart-2)"
                    shape={(props) => {
                      const { cx, cy, payload } = props as { cx?: number; cy?: number; payload?: { side: string } };
                      if (typeof cx !== "number" || typeof cy !== "number" || !payload) return null;
                      return (
                        <circle
                          cx={cx}
                          cy={cy}
                          r={6}
                          fill={payload.side === "BUY" ? "hsl(var(--success))" : "hsl(var(--destructive))"}
                          stroke="#ffffff"
                          strokeWidth={2}
                        />
                      );
                    }}
                  />
                </LineChart>
              </ChartContainer>
            ) : (
              <Alert>
                <AlertTitle>Select a crisis and stock</AlertTitle>
                <AlertDescription>
                  Choose a crisis and stock to load the corresponding historical price series.
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Holdings</CardTitle>
            <CardDescription>Click a row to focus the chart on that stock.</CardDescription>
          </CardHeader>
          <CardContent className="max-h-[320px] overflow-y-auto pr-2">
            {holdingsWithMarket.length ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Stock</TableHead>
                    <TableHead className="text-right">Qty</TableHead>
                    <TableHead className="text-right">Avg buy</TableHead>
                    <TableHead className="text-right">Current</TableHead>
                    <TableHead className="text-right">P/L %</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {holdingsWithMarket.map((holding) => (
                    <TableRow
                      key={holding.symbol}
                      className={cn("cursor-pointer", holding.symbol === selectedSymbol && "bg-finance-light/20")}
                      onClick={() => setSelectedSymbol(holding.symbol)}
                    >
                      <TableCell className="font-medium">{holding.symbol.replace(".NS", "")}</TableCell>
                      <TableCell className="text-right">{holding.quantity.toFixed(2)}</TableCell>
                      <TableCell className="text-right">{formatCurrency(holding.avgPrice, 2)}</TableCell>
                      <TableCell className="text-right">{formatCurrency(holding.currentPrice, 2)}</TableCell>
                      <TableCell
                        className={cn(
                          "text-right font-medium",
                          holding.profitPercent >= 0 ? "text-finance-success" : "text-finance-danger"
                        )}
                      >
                        {holding.profitPercent}%
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <p className="text-sm text-muted-foreground">
                No holdings yet. Use the buy panel to start building a crisis portfolio.
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Trade log</CardTitle>
          <CardDescription>Chronological record of your historical trades.</CardDescription>
        </CardHeader>
        <CardContent className="max-h-[280px] overflow-y-auto pr-2">
          {trades.length ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Month</TableHead>
                  <TableHead>Stock</TableHead>
                  <TableHead className="text-right">Side</TableHead>
                  <TableHead className="text-right">Quantity</TableHead>
                  <TableHead className="text-right">Price</TableHead>
                  <TableHead className="text-right">Notional</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {trades
                  .slice()
                  .reverse()
                  .map((trade) => (
                    <TableRow key={trade.id}>
                      <TableCell>{getMonthLabel(trade.month)}</TableCell>
                      <TableCell>{trade.symbol.replace(".NS", "")}</TableCell>
                      <TableCell className={cn("text-right font-semibold", trade.type === "BUY" ? "text-finance-success" : "text-finance-danger")}> 
                        {trade.type}
                      </TableCell>
                      <TableCell className="text-right">{trade.quantity.toFixed(2)}</TableCell>
                      <TableCell className="text-right">{formatCurrency(trade.price, 2)}</TableCell>
                      <TableCell className="text-right">{formatCurrency(trade.price * trade.quantity, 2)}</TableCell>
                    </TableRow>
                  ))}
              </TableBody>
            </Table>
          ) : (
            <p className="text-sm text-muted-foreground">
              Your trade log will appear here once you place buys or sells in the timeline.
            </p>
          )}
        </CardContent>
      </Card>

      <HistoricalTradeModal
        open={modalState.open}
        onClose={() => setModalState((prev) => ({ ...prev, open: false }))}
        side={modalState.side}
        symbol={displaySymbol}
        date={selectedMonthEntry?.label ?? ""}
        price={selectedMonthEntry?.averageClose ?? 0}
        maxQuantity={holdingsMap.get(selectedSymbol)?.quantity ?? 0}
        onSubmit={(quantity) => {
          setModalState((prev) => ({ ...prev, open: false }));
          handleTrade(modalState.side, quantity);
        }}
      />
    </div>
  );
};

export default TimeTravel;

