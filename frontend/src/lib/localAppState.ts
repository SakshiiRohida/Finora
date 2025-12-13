type LessonDifficulty = "beginner" | "intermediate" | "advanced";

type LessonSection = {
  heading: string;
  content: string;
  bullets?: string[];
  keyTakeaway?: string;
  action?: string;
  tip?: string;
};

type LessonState = {
  id: number;
  slug: string;
  title: string;
  description: string;
  xp: number;
  difficulty: LessonDifficulty;
  category: string;
  image: string;
  body: string;
  sections?: LessonSection[];
  completed: boolean;
  lastScore: number | null;
  bestScore: number | null;
  lastAttemptedAt: string | null;
  totalAttempts: number;
};

type QuestMetric = "lessons_completed" | "weekly_lessons" | "trades_completed";

type QuestState = {
  id: number;
  title: string;
  description: string;
  reward_xp: number;
  reward_coins: number;
  target_value: number;
  target_metric: QuestMetric;
  progress: number;
  completed: boolean;
  completedAt: string | null;
};

type HoldingState = {
  symbol: string;
  quantity: number;
  avgPrice: number;
};

type PortfolioState = {
  cash: number;
  holdings: HoldingState[];
  trades: number;
  updatedAt: string | null;
};

type QuizSnapshot = {
  lessonId: number;
  scorePercent: number;
  completedAt: string;
};

type ProfileState = {
  id: number;
  name: string;
  xp: number;
  coins: number;
  streakCount: number;
  knowledgeIndex: number;
  lastStreakDate: string | null;
  lastQuizDate: string | null;
  quizHistory: QuizSnapshot[];
};

type LeaderboardEntry = {
  id: string;
  name: string;
  xp: number;
  coins: number;
  streakCount: number;
  knowledgeIndex: number;
};

type NewsItem = {
  id: string;
  title: string;
  description: string;
  publishedAt: string;
  source: string;
  imageUrl: string;
  url: string;
};

type AppState = {
  version: number;
  profile: ProfileState;
  lessons: LessonState[];
  quests: QuestState[];
  portfolio: PortfolioState;
  leaderboard: LeaderboardEntry[];
  news: NewsItem[];
};

type LessonCompletionPayload = {
  score: number;
  maxScore: number;
};

type LessonCompletionResult = {
  rewardXp: number;
  rewardCoins: number;
  passed: boolean;
  scorePercent: number;
  streakCount: number;
  knowledgeIndex: number;
  xpTotal: number;
  coinsTotal: number;
  mascotEvent: {
    type: "streak_milestone" | "lesson_passed" | "lesson_failed";
    streakCount?: number;
  };
};

type QuestCompletionResult = {
  rewardXp: number;
  rewardCoins: number;
  quest: QuestState;
  xpTotal: number;
  coinsTotal: number;
};

type PortfolioSnapshot = {
  cash: number;
  holdings: HoldingState[];
  trades: number;
  invested: number;
};

type TradeExecutionResult = {
  side: "buy" | "sell";
  symbol: string;
  quantity: number;
  price: number;
  notional: number;
  cash: number;
  holdings: HoldingState[];
  trades: number;
  invested: number;
};

const STORAGE_KEY = "sampaket_app_state_v1";
const STATE_VERSION = 2;
const STARTING_CASH = 100000;
const INVESTMENT_AMOUNT = 10000;

const isBrowser = typeof window !== "undefined";

const clone = <T>(value: T): T =>
  typeof structuredClone === "function"
    ? structuredClone(value)
    : JSON.parse(JSON.stringify(value));

const todayISO = () => new Date().toISOString().slice(0, 10);

const DEFAULT_LESSONS: Omit<
  LessonState,
  "completed" | "lastScore" | "bestScore" | "lastAttemptedAt" | "totalAttempts"
>[] = [
  {
    id: 1,
    slug: "bank-account-basics",
    title: "Basics of Banking",
    description: "Learn how bank accounts work and the types of accounts you can open.",
    xp: 10,
    difficulty: "beginner",
    category: "Banking",
    image: "https://images.unsplash.com/photo-1579621970795-87facc2f976d",
    body: "Understand the foundations of personal banking: how savings and current accounts differ, the documents you need to open an account, and smart habits to avoid hidden fees."
  },
  {
    id: 2,
    slug: "building-an-emergency-fund",
    title: "Building an Emergency Fund",
    description: "Protect yourself from surprises by setting aside the right safety net.",
    xp: 20,
    difficulty: "beginner",
    category: "Savings",
    image: "https://images.unsplash.com/photo-1520607162513-77705c0f0d4a",
    body: "Discover how much to save, where to park the money for instant access, and simple behaviour shifts that help you stay consistent while building your rainy-day fund."
  },
  {
    id: 3,
    slug: "introduction-to-mutual-funds",
    title: "Intro to Mutual Funds",
    description: "Explore diversified investing through mutual funds and SIPs.",
    xp: 30,
    difficulty: "intermediate",
    category: "Investing",
    image: "https://images.unsplash.com/photo-1559526324-593bc073d938",
    body: "Learn the different mutual fund categories, how SIPs smoothen volatility, fees you should watch, and beginner-friendly metrics to shortlist funds with confidence."
  },
  {
    id: 4,
    slug: "understanding-health-insurance",
    title: "Understanding Health Insurance",
    description: "Decode premiums, deductibles, and the cover you actually need.",
    xp: 25,
    difficulty: "intermediate",
    category: "Insurance",
    image: "https://images.unsplash.com/photo-1556740749-887f6717d7e4",
    body: "Break down common insurance jargon into plain language and learn how to compare policies, pick the right sum insured, and file claims without surprises."
  },
  {
    id: 5,
    slug: "stock-market-starter",
    title: "Stock Market Starter Pack",
    description: "Demystify how stock exchanges work and how to place your first order.",
    xp: 40,
    difficulty: "intermediate",
    category: "Stock Markets",
    image: "https://images.unsplash.com/photo-1518543578373-0f0a1561eeb5",
    body: "Understand trading vs investing, market orders vs limits, basic valuation ratios, and common mistakes first-time investors make when the markets turn choppy."
  },
  {
    id: 6,
    slug: "careers-in-fintech",
    title: "Careers in Fintech and Banking",
    description: "Chart your career path in finance, banking, or the fintech ecosystem.",
    xp: 35,
    difficulty: "advanced",
    category: "Careers",
    image: "https://images.unsplash.com/photo-1521737604893-d14cc237f11d",
    body: "Survey the fastest-growing roles in finance and fintech, the skills employers demand, and project ideas to build a portfolio that stands out."
  }
];

const DEFAULT_QUESTS: QuestState[] = [
  {
    id: 1,
    title: "Daily Warm-Up",
    description: "Complete one lesson today to keep your shark streak alive.",
    reward_xp: 25,
    reward_coins: 30,
    target_value: 1,
    target_metric: "lessons_completed",
    progress: 0,
    completed: false,
    completedAt: null
  },
  {
    id: 2,
    title: "Knowledge Sprint",
    description: "Pass three lessons this week to unlock a bonus reward.",
    reward_xp: 120,
    reward_coins: 120,
    target_value: 3,
    target_metric: "weekly_lessons",
    progress: 0,
    completed: false,
    completedAt: null
  },
  {
    id: 3,
    title: "Trader in Training",
    description: "Execute two simulator trades to prove your market instincts.",
    reward_xp: 80,
    reward_coins: 90,
    target_value: 2,
    target_metric: "trades_completed",
    progress: 0,
    completed: false,
    completedAt: null
  }
];

const DEFAULT_LEADERBOARD: LeaderboardEntry[] = [
  { id: "arjun", name: "Arjun M.", xp: 840, coins: 960, streakCount: 12, knowledgeIndex: 94 },
  { id: "isha", name: "Isha P.", xp: 720, coins: 820, streakCount: 9, knowledgeIndex: 88 },
  { id: "ravi", name: "Ravi S.", xp: 680, coins: 780, streakCount: 7, knowledgeIndex: 86 },
  { id: "kiara", name: "Kiara D.", xp: 610, coins: 690, streakCount: 5, knowledgeIndex: 82 }
];

const DEFAULT_NEWS: NewsItem[] = [
  {
    id: "n1",
    title: "RBI keeps repo rate steady, hints at liquidity tightening",
    description:
      "The Monetary Policy Committee left the benchmark repo rate unchanged for a seventh consecutive meeting but reiterated its focus on withdrawing accommodation to tame sticky core inflation.",
    publishedAt: new Date().toISOString(),
    source: "RBI Watch",
    imageUrl: "https://images.unsplash.com/photo-1520607162513-77705c0f0d4a",
    url: "https://www.rbi.org.in/"
  },
  {
    id: "n2",
    title: "Nifty slips from record highs amid profit booking in IT and banks",
    description:
      "Benchmark indices gave up early gains as investors booked profits in heavyweight IT and banking stocks ahead of key US inflation data. Broader markets outperformed with smallcaps closing higher.",
    publishedAt: new Date(Date.now() - 3600 * 1000).toISOString(),
    source: "Market Pulse",
    imageUrl: "https://images.unsplash.com/photo-1523289333742-be1143f6b766",
    url: "#"
  },
  {
    id: "n3",
    title: "Mutual fund SIP inflows hit fresh high of ₹22,000 crore",
    description:
      "Systematic investment plans continued to see robust participation with retail investors favouring diversified equity funds and passive strategies despite near-term volatility.",
    publishedAt: new Date(Date.now() - 2 * 3600 * 1000).toISOString(),
    source: "MF Desk",
    imageUrl: "https://images.unsplash.com/photo-1556740749-887f6717d7e4",
    url: "#"
  },
  {
    id: "n4",
    title: "Crude prices ease as OPEC signals higher supply",
    description:
      "Brent crude retreated below $80 per barrel after the producer group indicated it may gradually unwind production cuts later this year if demand stabilises.",
    publishedAt: new Date(Date.now() - 6 * 3600 * 1000).toISOString(),
    source: "Energy Now",
    imageUrl: "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4",
    url: "#"
  },
  {
    id: "n5",
    title: "Fintech hiring jumps 18% as BNPL and digital lending expand",
    description:
      "Demand for product managers, credit analysts, and data scientists increased sharply as fintech firms scale lending partnerships with banks and NBFCs.",
    publishedAt: new Date(Date.now() - 12 * 3600 * 1000).toISOString(),
    source: "Fintech Insider",
    imageUrl: "https://images.unsplash.com/photo-1521737604893-d14cc237f11d",
    url: "#"
  },
  {
    id: "n6",
    title: "Beginner investors flock to passive investing via index ETFs",
    description:
      "Low-cost index funds continue to attract first-time investors who prefer diversified exposure to benchmark indices with minimal active management risk.",
    publishedAt: new Date(Date.now() - 24 * 3600 * 1000).toISOString(),
    source: "Wealth Weekly",
    imageUrl: "https://images.unsplash.com/photo-1556740749-887f6717d7e4",
    url: "#"
  }
];

const createDefaultState = (): AppState => ({
  version: STATE_VERSION,
  profile: {
    id: 0,
    name: "Guest Fin",
    xp: 0,
    coins: 250,
    streakCount: 0,
    knowledgeIndex: 0,
    lastStreakDate: null,
    lastQuizDate: null,
    quizHistory: []
  },
  lessons: DEFAULT_LESSONS.map((lesson) => ({
    ...lesson,
    completed: false,
    lastScore: null,
    bestScore: null,
    lastAttemptedAt: null,
    totalAttempts: 0
  })),
  quests: clone(DEFAULT_QUESTS),
  portfolio: {
    cash: STARTING_CASH,
    holdings: [],
    trades: 0,
    updatedAt: null
  },
  leaderboard: clone(DEFAULT_LEADERBOARD),
  news: clone(DEFAULT_NEWS)
});

const saveState = (state: AppState) => {
  if (!isBrowser) {
    return;
  }
  const payload = JSON.stringify(state);
  window.localStorage.setItem(STORAGE_KEY, payload);
};

const loadState = (): AppState => {
  if (!isBrowser) {
    return createDefaultState();
  }
  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    const defaultState = createDefaultState();
    saveState(defaultState);
    return defaultState;
  }
  try {
    const parsed = JSON.parse(raw) as AppState;
    if (!parsed.version || parsed.version < STATE_VERSION) {
      const defaultState = createDefaultState();
      saveState(defaultState);
      return defaultState;
    }
    return parsed;
  } catch (error) {
    console.warn("[localAppState] Failed to parse stored state, resetting.", error);
    const defaultState = createDefaultState();
    saveState(defaultState);
    return defaultState;
  }
};

const syncLeaderboard = (state: AppState) => {
  const entry: LeaderboardEntry = {
    id: "you",
    name: state.profile.name || "You",
    xp: Math.round(state.profile.xp),
    coins: Math.round(state.profile.coins),
    streakCount: state.profile.streakCount,
    knowledgeIndex: Number(state.profile.knowledgeIndex.toFixed(1))
  };

  const existingIndex = state.leaderboard.findIndex((item) => item.id === entry.id);
  if (existingIndex >= 0) {
    state.leaderboard[existingIndex] = entry;
  } else {
    state.leaderboard.push(entry);
  }
};

const calculateKnowledgeIndex = (history: QuizSnapshot[]) => {
  if (history.length === 0) return 0;
  const total = history.reduce((sum, item) => sum + item.scorePercent, 0);
  return Number((total / history.length).toFixed(1));
};

const updateQuestProgress = (
  quests: QuestState[],
  metric: QuestMetric,
  amount = 1,
  passed = false
) => {
  quests.forEach((quest) => {
    if (quest.target_metric !== metric || quest.completed) {
      return;
    }
    if (metric === "lessons_completed" && !passed) {
      return;
    }
    quest.progress = Math.min(quest.target_value, quest.progress + amount);
  });
};

const getInvestedAmount = (holdings: HoldingState[]) =>
  holdings.reduce((sum, holding) => sum + holding.avgPrice * holding.quantity, 0);

const lessonCompletionMascotEvent = (
  passed: boolean,
  streakCount: number
): LessonCompletionResult["mascotEvent"] => {
  if (!passed) {
    return { type: "lesson_failed" };
  }
  if ([3, 5, 10, 20, 30].includes(streakCount)) {
    return { type: "streak_milestone", streakCount };
  }
  return { type: "lesson_passed" };
};

export const localAppState = {
  reset() {
    const state = createDefaultState();
    saveState(state);
    return clone(state);
  },

  getProfile() {
    const state = loadState();
    return clone(state.profile);
  },

  getLessons() {
    const state = loadState();
    return clone(state.lessons);
  },

  getQuests() {
    const state = loadState();
    return clone(state.quests);
  },

  getNews() {
    const state = loadState();
    return clone(state.news);
  },

  getPortfolio(): PortfolioSnapshot {
    const state = loadState();
    const invested = getInvestedAmount(state.portfolio.holdings);
    return {
      cash: state.portfolio.cash,
      holdings: clone(state.portfolio.holdings),
      trades: state.portfolio.trades,
      invested
    };
  },

  completeLesson(lessonId: number, payload: LessonCompletionPayload): LessonCompletionResult {
    const state = loadState();
    const updatedState = clone(state);
    const lesson = updatedState.lessons.find((item) => item.id === lessonId);
    if (!lesson) {
      throw new Error("Lesson not found");
    }

    const scorePercent = payload.maxScore > 0 ? (payload.score / payload.maxScore) * 100 : 0;
    const passed = scorePercent >= 70;
    const rewardXp = Math.round(lesson.xp * (scorePercent / 100));
    const rewardCoins = Math.round(Math.max(10, lesson.xp * 0.6) * (scorePercent / 100));

    lesson.lastScore = Number(scorePercent.toFixed(2));
    lesson.bestScore =
      typeof lesson.bestScore === "number"
        ? Math.max(lesson.bestScore, lesson.lastScore)
        : lesson.lastScore;
    lesson.totalAttempts += 1;
    lesson.lastAttemptedAt = new Date().toISOString();
    if (passed) {
      lesson.completed = true;
    }

    const today = todayISO();
    const profile = updatedState.profile;

    profile.xp += rewardXp;
    profile.coins += rewardCoins;
    profile.quizHistory.push({
      lessonId,
      scorePercent: Number(scorePercent.toFixed(2)),
      completedAt: today
    });
    if (profile.quizHistory.length > 50) {
      profile.quizHistory = profile.quizHistory.slice(-50);
    }
    profile.knowledgeIndex = calculateKnowledgeIndex(profile.quizHistory);
    profile.lastQuizDate = today;

    if (passed) {
      if (!profile.lastStreakDate) {
        profile.streakCount = 1;
      } else {
        const last = new Date(profile.lastStreakDate);
        const diffDays = Math.floor((new Date(today).getTime() - last.getTime()) / 86400000);
        if (diffDays === 0) {
          // already counted today
        } else if (diffDays === 1) {
          profile.streakCount += 1;
        } else {
          profile.streakCount = 1;
        }
      }
      profile.lastStreakDate = today;
    }

    updateQuestProgress(updatedState.quests, "lessons_completed", 1, passed);
    updateQuestProgress(updatedState.quests, "weekly_lessons", 1, passed);

    syncLeaderboard(updatedState);
    saveState(updatedState);

    if (isBrowser) {
      window.localStorage.setItem("finora:lastAccuracy", String(scorePercent / 100));
    }

    return {
      rewardXp,
      rewardCoins,
      passed,
      scorePercent: Number(scorePercent.toFixed(2)),
      streakCount: profile.streakCount,
      knowledgeIndex: profile.knowledgeIndex,
      xpTotal: profile.xp,
      coinsTotal: profile.coins,
      mascotEvent: lessonCompletionMascotEvent(passed, profile.streakCount)
    };
  },

  completeQuest(questId: number): QuestCompletionResult {
    const state = loadState();
    const updatedState = clone(state);
    const quest = updatedState.quests.find((item) => item.id === questId);
    if (!quest) {
      throw new Error("Quest not found");
    }
    if (quest.completed) {
      throw new Error("Quest already completed");
    }
    if (quest.progress < quest.target_value) {
      throw new Error("Quest target not reached yet");
    }

    quest.completed = true;
    quest.completedAt = new Date().toISOString();

    updatedState.profile.xp += quest.reward_xp;
    updatedState.profile.coins += quest.reward_coins;

    syncLeaderboard(updatedState);
    saveState(updatedState);

    return {
      rewardXp: quest.reward_xp,
      rewardCoins: quest.reward_coins,
      quest: clone(quest),
      xpTotal: updatedState.profile.xp,
      coinsTotal: updatedState.profile.coins
    };
  },

  executeTrade(
    symbol: string,
    side: "buy" | "sell",
    quantity: number,
    price: number
  ): TradeExecutionResult {
    const state = loadState();
    const updatedState = clone(state);
    const portfolio = updatedState.portfolio;
    const normalizedSymbol = symbol.toUpperCase();
    const notional = Number((price * quantity).toFixed(2));

    if (quantity <= 0 || !Number.isFinite(quantity)) {
      throw new Error("Quantity must be positive");
    }

    const holding = portfolio.holdings.find((item) => item.symbol === normalizedSymbol);

    if (side === "buy") {
      if (portfolio.cash < notional) {
        throw new Error("Insufficient virtual cash balance");
      }
      portfolio.cash = Number((portfolio.cash - notional).toFixed(2));
      if (holding) {
        const totalCost = holding.avgPrice * holding.quantity + notional;
        holding.quantity = Number((holding.quantity + quantity).toFixed(4));
        holding.avgPrice = Number((totalCost / holding.quantity).toFixed(2));
      } else {
        portfolio.holdings.push({
          symbol: normalizedSymbol,
          quantity: Number(quantity.toFixed(4)),
          avgPrice: Number(price.toFixed(2))
        });
      }
    } else {
      if (!holding || holding.quantity < quantity) {
        throw new Error("Not enough shares to sell");
      }
      const remaining = Number((holding.quantity - quantity).toFixed(4));
      portfolio.cash = Number((portfolio.cash + notional).toFixed(2));
      if (remaining <= 0.0001) {
        portfolio.holdings = portfolio.holdings.filter(
          (item) => item.symbol !== normalizedSymbol
        );
      } else {
        holding.quantity = remaining;
      }
    }

    portfolio.trades += 1;
    portfolio.updatedAt = new Date().toISOString();

    updateQuestProgress(updatedState.quests, "trades_completed");

    syncLeaderboard(updatedState);
    saveState(updatedState);

    return {
      side,
      symbol: normalizedSymbol,
      quantity,
      price: Number(price.toFixed(2)),
      notional,
      cash: portfolio.cash,
      holdings: clone(portfolio.holdings),
      trades: portfolio.trades,
      invested: getInvestedAmount(portfolio.holdings)
    };
  },

  getLeaderboard(metric: "xp" | "coins" = "xp") {
    const state = loadState();
    const updatedState = clone(state);
    syncLeaderboard(updatedState);

    const sorted = clone(updatedState.leaderboard).sort((a, b) =>
      metric === "xp" ? b.xp - a.xp : b.coins - a.coins
    );
    const rank = sorted.findIndex((entry) => entry.id === "you");

    // Persist synchronised leaderboard
    saveState(updatedState);

    return {
      leaderboard: sorted,
      currentUser: rank >= 0 ? { ...sorted[rank], rank: rank + 1 } : null
    };
  }
};

export type {
  AppState,
  LessonState,
  QuestState,
  PortfolioSnapshot,
  TradeExecutionResult,
  LessonCompletionResult,
  QuestCompletionResult,
  LessonSection
};


