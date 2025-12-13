import {
  localAppState,
  type LessonCompletionResult,
  type LessonSection,
  type LessonState,
  type PortfolioSnapshot,
  type QuestCompletionResult,
  type QuestState,
  type TradeExecutionResult
} from "./localAppState";
import { stockUniverseFallback } from "@/data/stockUniverseFallback";

const determineBaseUrl = () => {
  const envBase =
    import.meta.env.VITE_API_BASE ||
    (typeof process !== "undefined" ? process.env?.REACT_APP_API_BASE : undefined);

  if (envBase) {
    return envBase.replace(/\/$/, "");
  }

  if (typeof window !== "undefined") {
    const { hostname, origin } = window.location;
    const isLocalhost = ["localhost", "127.0.0.1", "::1"].includes(hostname);

    if (isLocalhost) {
      return "http://localhost:5000/api";
    }

    return `${origin.replace(/\/$/, "")}/api`;
  }

  return "http://localhost:5000/api";
};

const API_BASE = determineBaseUrl();

const fallbackLessonImage =
  "https://images.unsplash.com/photo-1521737604893-d14cc237f11d?auto=format&fit=crop&w=1200&q=60";

const mapDifficulty = (value: unknown): "beginner" | "intermediate" | "advanced" => {
  if (typeof value === "string") {
    const lower = value.toLowerCase();
    if (lower.includes("adv")) return "advanced";
    if (lower.includes("inter")) return "intermediate";
    return "beginner";
  }
  if (typeof value === "number") {
    if (value >= 3) return "advanced";
    if (value >= 2) return "intermediate";
    return "beginner";
  }
  return "beginner";
};

const normaliseSections = (
  raw: unknown,
  fallbackTitle: string,
  fallbackBody: string
): LessonSection[] | null => {
  if (raw) {
    try {
      const parsed = typeof raw === "string" ? JSON.parse(raw) : raw;
      if (Array.isArray(parsed)) {
        const sections = parsed
          .filter((item) => item && typeof item === "object")
          .map((item) => ({
            heading: String(item.heading ?? item.title ?? "Lesson section"),
            content: String(item.content ?? item.body ?? ""),
            bullets: Array.isArray(item.bullets)
              ? item.bullets.map((bullet) => String(bullet))
              : undefined,
            keyTakeaway: item.keyTakeaway ? String(item.keyTakeaway) : undefined,
            action: item.action ? String(item.action) : undefined,
            tip: item.tip ? String(item.tip) : undefined
          }))
          .filter((section) => section.heading.trim().length || section.content.trim().length);
        if (sections.length) {
          return sections;
        }
      }
    } catch (error) {
      console.warn("[lessonApi] Unable to parse remote lesson sections", error);
    }
  }

  if (!fallbackBody) {
    return null;
  }

  const paragraphs = fallbackBody
    .split(/\n{2,}/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);

  if (!paragraphs.length) {
    return null;
  }

  return paragraphs.map((paragraph, index) => ({
    heading: `${fallbackTitle} · Section ${index + 1}`,
    content: paragraph
  }));
};

export type QuoteData = {
  symbol: string;
  companyName: string;
  exchange?: string;
  currency?: string;
  price: number;
  previousClose: number;
  change: number;
  percentChange: number;
  open: number;
  high: number;
  low: number;
  volume?: number;
  timestamp: string;
  provider?: string;
  source?: string;
  delayed?: boolean;
};

const fetchJson = async <T>(url: string, options?: RequestInit): Promise<T> => {
  const response = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options?.headers ?? {})
    }
  });

  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({}));
    const error = new Error(errorBody.message || "Request failed");
    throw Object.assign(error, { status: response.status, details: errorBody });
  }

  const contentType = response.headers.get("content-type");
  if (contentType?.includes("application/json")) {
    return response.json() as Promise<T>;
  }
  return (await response.text()) as unknown as T;
};

const normaliseSymbol = (symbol: string) => symbol.trim().toUpperCase();

export const lessonApi = {
  async list(): Promise<{ lessons: LessonState[] }> {
    const localLessons = localAppState.getLessons();

    try {
      const response = await fetchJson<{ lessons: Array<Record<string, any>> }>(`${API_BASE}/lessons`);
      if (Array.isArray(response?.lessons) && response.lessons.length > 0) {
        const remoteLessons: LessonState[] = response.lessons.map((lesson, index) => {
          const fallback = localLessons.find((loc) => loc.slug === lesson.slug) ?? localLessons[index];
          const remoteBody = lesson.body ?? lesson.content ?? fallback?.body ?? "";
          const sections =
            normaliseSections(
              lesson.sections ?? lesson.content,
              lesson.title ?? fallback?.title ?? "Lesson",
              remoteBody
            ) ?? fallback?.sections ?? normaliseSections(null, lesson.title ?? fallback?.title ?? "Lesson", remoteBody);
          return {
            id: lesson.id ?? fallback?.id ?? index + 1,
            slug: lesson.slug ?? fallback?.slug ?? `lesson-${index + 1}`,
            title: lesson.title ?? fallback?.title ?? "Untitled lesson",
            description:
              lesson.description ?? fallback?.description ?? fallback?.body ?? fallback?.description ?? "",
            body: lesson.body ?? lesson.content ?? fallback?.body ?? "",
            sections: sections ?? undefined,
            xp: Number(lesson.xp ?? fallback?.xp ?? 10),
            difficulty: mapDifficulty(lesson.difficulty ?? fallback?.difficulty ?? "beginner"),
            category: lesson.category ?? fallback?.category ?? "Foundations",
            image: lesson.imageUrl ?? lesson.image ?? fallback?.image ?? fallbackLessonImage,
            completed: Boolean(lesson.completed ?? fallback?.completed ?? false),
            lastScore: fallback?.lastScore ?? null,
            bestScore: fallback?.bestScore ?? null,
            lastAttemptedAt: fallback?.lastAttemptedAt ?? null,
            totalAttempts: fallback?.totalAttempts ?? 0
          };
        });

        return { lessons: remoteLessons };
      }
    } catch (error) {
      console.warn("[lessonApi] remote lessons fetch failed, using local state", error);
    }

    return Promise.resolve({ lessons: localLessons });
  },
  async get(identifier: number | string): Promise<{
    lesson: {
      id: number;
      slug: string;
      title: string;
      description: string;
      body: string;
      xp: number;
      difficulty: "beginner" | "intermediate" | "advanced";
      category: string;
      image: string;
      quiz: {
        questions: Array<{ question: string; options: string[]; answer: number }>;
        passingPercent: number;
      } | null;
    };
  }> {
    const urlId = typeof identifier === "number" || /^\d+$/.test(String(identifier)) ? identifier : encodeURIComponent(String(identifier));
    const response = await fetchJson<{ lesson: any }>(`${API_BASE}/lessons/${urlId}`);
    if (!response.lesson) {
      throw new Error("Lesson not found");
    }
    const quiz = response.lesson.quiz;
    const remoteBody = response.lesson.body ?? response.lesson.content ?? "";
    const sections =
      normaliseSections(
        response.lesson.sections ?? response.lesson.content,
        response.lesson.title ?? "Lesson",
        remoteBody
      ) ?? undefined;
    let questions: Array<{ question: string; options: string[]; answer: number }> | null = null;
    if (quiz) {
      try {
        const raw = Array.isArray(quiz.questions) ? quiz.questions : JSON.parse(quiz.questions ?? "[]");
        questions = raw.map((item: any, index: number) => ({
          question: item.q ?? item.question ?? `Question ${index + 1}`,
          options: Array.isArray(item.options) ? item.options : [],
          answer: typeof item.answer === "number" ? item.answer : Number(item.correctAnswer ?? 0)
        }));
      } catch (error) {
        console.warn("[lessonApi] failed to parse quiz questions", error);
        questions = null;
      }
    }
    return {
      lesson: {
        id: response.lesson.id,
        slug: response.lesson.slug,
        title: response.lesson.title,
        description: response.lesson.description ?? "",
        body: response.lesson.body ?? response.lesson.content ?? "",
        xp: Number(response.lesson.xp ?? 0),
        difficulty: mapDifficulty(response.lesson.difficulty ?? "beginner"),
        category: response.lesson.category ?? "Foundations",
        image: response.lesson.imageUrl ?? fallbackLessonImage,
        sections,
        quiz: questions
          ? {
              questions,
              passingPercent: Number(quiz?.passingPercent ?? 70)
            }
          : null
      }
    };
  },
  async complete(
    lessonId: number,
    payload?: { score?: number; maxScore?: number; accuracy?: number }
  ): Promise<LessonCompletionResult> {
    const score = payload?.score ?? 0;
    const maxScore = payload?.maxScore ?? 1;

    try {
      await fetchJson(`${API_BASE}/lessons/${lessonId}/complete`, {
        method: "POST",
        body: JSON.stringify({
          score,
          maxScore
        })
      });
    } catch (error) {
      console.warn("[lessonApi] remote completion failed, falling back to local", error);
    }

    return localAppState.completeLesson(lessonId, { score, maxScore });
  }
};

export const questApi = {
  async list(): Promise<{ quests: QuestState[] }> {
    try {
      const response = await fetchJson<{ quests: Array<any> }>(`${API_BASE}/quests`);
      if (Array.isArray(response?.quests)) {
        return {
          quests: response.quests.map((quest) => ({
            id: quest.id,
            title: quest.title,
            description: quest.description,
            reward_xp: quest.rewardXp ?? quest.reward_xp,
            reward_coins: quest.rewardCoins ?? quest.reward_coins,
            target_metric: quest.targetMetric ?? quest.target_type,
            target_value: quest.targetValue ?? quest.target_value ?? 0,
            progress: quest.progress ?? 0,
            completed: Boolean(quest.completed),
            completedAt: quest.completedAt ?? null,
            target_type: quest.targetMetric ?? quest.target_type
          }))
        };
      }
    } catch (error) {
      console.warn("[questApi] remote quest load failed, falling back to local", error);
    }

    return Promise.resolve({ quests: localAppState.getQuests() });
  },
  async complete(questId: number): Promise<QuestCompletionResult> {
    try {
      const response = await fetchJson<{ quest?: { rewardXp?: number; rewardCoins?: number } }>(
        `${API_BASE}/quests/${questId}/complete`,
        { method: "POST" }
      );
      const result = localAppState.completeQuest(questId);
      return {
        ...result,
        rewardXp: response?.quest?.rewardXp ?? result.rewardXp,
        rewardCoins: response?.quest?.rewardCoins ?? result.rewardCoins
      };
    } catch (error) {
      console.warn("[questApi] remote quest completion failed, falling back to local", error);
    }

    return Promise.resolve(localAppState.completeQuest(questId));
  }
};

export const leaderboardApi = {
  async list(metric: "xp" | "coins" = "xp") {
    try {
      return await fetchJson<{
        leaderboard: Array<{ id: number; name: string; xp: number; coins: number; streak: number; knowledgeIndex: number; rank: number }>;
      }>(`${API_BASE}/leaderboard?metric=${encodeURIComponent(metric)}`);
    } catch (error) {
      console.warn("[leaderboardApi] remote leaderboard failed, falling back to local", error);
    }

    return Promise.resolve(localAppState.getLeaderboard(metric));
  }
};

export const newsApi = {
  list(limit?: number): Promise<{ news: ReturnType<typeof localAppState.getNews> }> {
    const news = localAppState.getNews();
    return Promise.resolve({ news: typeof limit === "number" ? news.slice(0, limit) : news });
  }
};

export const simulatorApi = {
  async stocks(): Promise<{
    stocks: Array<{ symbol: string; name: string }>;
  }> {
    try {
      const response = await fetchJson<{ stocks: Array<{ symbol: string; name: string }> }>(
        `${API_BASE}/sim/stocks`
      );
      if (Array.isArray(response?.stocks) && response.stocks.length > 0) {
        return {
          stocks: response.stocks.map((entry) => ({
            symbol: entry.symbol?.replace(/\.NS$/i, "").trim() || entry.symbol,
            name: entry.name
          }))
        };
      }
    } catch (error) {
      console.warn("[simulatorApi] stock list fallback", error);
    }

    return {
      stocks: stockUniverseFallback
    };
  },

  async history(
    symbol: string,
    options?: { interval?: string; start?: string; end?: string }
  ): Promise<{
    symbol: string;
    interval: string;
    startDate: string;
    endDate: string;
    points: Array<{ date: string; close: number; open?: number; high?: number; low?: number; volume?: number }>;
  }> {
    const normalised = normaliseSymbol(symbol);
    if (!normalised) {
      throw new Error("Symbol is required");
    }
    const params = new URLSearchParams({ symbol: normalised });
    if (options?.interval) params.set("interval", options.interval);
    if (options?.start) params.set("start", options.start);
    if (options?.end) params.set("end", options.end);
    return fetchJson(`${API_BASE}/history?${params.toString()}`);
  },

  account(): Promise<{ account: { cashBalance: number; invested: number; trades: number }; positions: PortfolioSnapshot["holdings"] }> {
    const portfolio = localAppState.getPortfolio();
    return Promise.resolve({
      account: {
        cashBalance: portfolio.cash,
        invested: portfolio.invested,
        trades: portfolio.trades
      },
      positions: portfolio.holdings
    });
  },

  async quote(symbol: string): Promise<{ quote: QuoteData }> {
    const normalised = normaliseSymbol(symbol);
    if (!normalised) {
      throw new Error("Symbol is required");
    }
    const data = await fetchJson<{ quote: QuoteData }>(
      `${API_BASE}/sim/quote?symbol=${encodeURIComponent(normalised)}`
    );
    return data;
  },

  async scenario(symbol: string, scenarioId?: string) {
    const normalised = normaliseSymbol(symbol);
    if (!normalised) {
      throw new Error("Symbol is required");
    }
    const params = new URLSearchParams({ symbol: normalised });
    if (scenarioId) {
      params.set("scenario", scenarioId);
    }
    return fetchJson(`${API_BASE}/sim/scenario?${params.toString()}`);
  },

  async trade(
    payload: { symbol: string; side: "buy" | "sell"; quantity: number }
  ): Promise<
    TradeExecutionResult & {
      message: string;
      account: { cashBalance: number; invested: number; trades: number };
      positions: PortfolioSnapshot["holdings"];
      quote: any;
      mascotEvent: { type: string; amount?: number };
    }
  > {
    const symbol = normaliseSymbol(payload.symbol);
    if (!symbol) {
      throw new Error("Symbol is required");
    }

    const preTradePortfolio = localAppState.getPortfolio();
    const existingHolding = preTradePortfolio.holdings.find(
      (holding) => holding.symbol === symbol
    );

    const { quote } = await this.quote(symbol);
    const price = Number(quote?.price ?? 0);
    if (!Number.isFinite(price) || price <= 0) {
      throw new Error("Unable to determine live price for trade");
    }

    const tradeResult = localAppState.executeTrade(symbol, payload.side, payload.quantity, price);
    const invested = tradeResult.invested;
    const mascotEvent =
      payload.side === "sell" && existingHolding
        ? (() => {
            const pnl = (price - existingHolding.avgPrice) * payload.quantity;
            return {
              type: pnl >= 0 ? "trade_success" : "trade_loss",
              amount: Number(pnl.toFixed(2))
            };
          })()
        : { type: "trade_executed" };

    return {
      message: "Trade executed",
      side: payload.side,
      symbol,
      quantity: payload.quantity,
      price,
      notional: tradeResult.notional,
      account: {
        cashBalance: tradeResult.cash,
        invested,
        trades: tradeResult.trades
      },
      positions: tradeResult.holdings,
      quote,
      mascotEvent
    };
  }
};

export type TimeTravelSession = {
  id: number;
  crisis_id?: string | null;
  start_date: string;
  end_date: string;
  current_date: string;
  initial_cash: number;
};

export type TimeTravelPortfolio = {
  asOf: string;
  cash: number;
  holdingsValue: number;
  totalValue: number;
  pnl: number;
  holdings: Array<{
    symbol: string;
    quantity: number;
    avgPrice: number;
    currentPrice: number;
    currentValue: number;
    pnl: number;
  }>;
  trades: Array<{
    id: number;
    date: string;
    symbol: string;
    quantity: number;
    price: number;
    side: string;
  }>;
};

export type TimeTravelCrisisPreset = {
  id: string;
  title: string;
  description: string;
  startDate: string;
  endDate: string;
  eventDate?: string;
  entryDate?: string;
  difficulty?: string;
  image?: string;
};

export type TimeTravelEvent = {
  month: string;
  marketCondition: string;
};

export const timeTravelApi = {
  start(payload: {
    startDate?: string;
    endDate?: string;
    crisisId?: string | null;
    initialCash?: number;
    userId?: number | null;
  }) {
    const body = JSON.stringify(payload);
    return fetchJson<{ session: TimeTravelSession; portfolio: TimeTravelPortfolio }>(
      `${API_BASE}/time-travel/start`,
      {
        method: "POST",
        body
      }
    );
  },
  history(
    symbol: string,
    options?: { start?: string; end?: string; interval?: string; crisisId?: string }
  ) {
    const params = new URLSearchParams({
      symbol
    });
    if (options?.start) params.set("start", options.start);
    if (options?.end) params.set("end", options.end);
    if (options?.interval) params.set("interval", options.interval);
    if (options?.crisisId) params.set("crisisId", options.crisisId);
    return fetchJson<{
      symbol: string;
      interval: string;
      startDate: string;
      endDate: string;
      points: Array<{ date: string; close: number; open?: number; high?: number; low?: number; volume?: number }>;
      crisis?: TimeTravelCrisisPreset | null;
    }>(`${API_BASE}/time-travel/history?${params.toString()}`);
  },
  crises() {
    return fetchJson<{ crises: TimeTravelCrisisPreset[] }>(`${API_BASE}/time-travel/crises`);
  },
  events(crisisId: string) {
    const params = new URLSearchParams({ crisisId });
    return fetchJson<{ crisisId: string; events: TimeTravelEvent[] }>(
      `${API_BASE}/time-travel/events?${params.toString()}`
    );
  },
  portfolio(sessionId: number) {
    return fetchJson<{ session: TimeTravelSession; portfolio: TimeTravelPortfolio }>(
      `${API_BASE}/time-travel/portfolio/${sessionId}`
    );
  },
  trade(payload: { sessionId: number; date: string; symbol: string; quantity: number; type: "BUY" | "SELL" }) {
    return fetchJson<{ portfolio: TimeTravelPortfolio }>(`${API_BASE}/time-travel/trade`, {
      method: "POST",
      body: JSON.stringify({
        sessionId: payload.sessionId,
        date: payload.date,
        symbol: payload.symbol,
        quantity: payload.quantity,
        type: payload.type
      })
    });
  },
  nextDay(sessionId: number) {
    return fetchJson<{ session: TimeTravelSession; portfolio: TimeTravelPortfolio }>(
      `${API_BASE}/time-travel/next-day`,
      {
        method: "POST",
        body: JSON.stringify({ sessionId })
      }
    );
  },
  previousDay(sessionId: number) {
    return fetchJson<{ session: TimeTravelSession; portfolio: TimeTravelPortfolio }>(
      `${API_BASE}/time-travel/previous-day`,
      {
        method: "POST",
        body: JSON.stringify({ sessionId })
      }
    );
  },
  seek(sessionId: number, date: string) {
    return fetchJson<{ session: TimeTravelSession; portfolio: TimeTravelPortfolio }>(
      `${API_BASE}/time-travel/seek`,
      {
        method: "POST",
        body: JSON.stringify({ sessionId, date })
      }
    );
  },
  reset(sessionId: number) {
    return fetchJson<void>(`${API_BASE}/time-travel/reset`, {
      method: "POST",
      body: JSON.stringify({ sessionId })
    });
  }
};

export const profileApi = {
  async me(): Promise<{
    profile: {
      id: number;
      name: string;
      email: string;
      xp: number;
      coins: number;
      streak: number;
      knowledgeIndex: number;
      lessons: { attempts: number; completed: number };
      quests: { total: number; completed: number };
      positions: Array<{ symbol: string; shares: number; avgPrice: number }>;
    };
    recentTrades?: Array<{ symbol: string; side: string; quantity: number; price: number; executedAt: string }>;
  }> {
    return fetchJson(`${API_BASE}/profile`);
  }
};

export const API_BASE_URL = API_BASE;

