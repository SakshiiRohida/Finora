const axios = require("axios");

const SUPPORTED_PROVIDERS = ["TWELVEDATA", "FINNHUB", "YAHOO"];
const QUOTE_CACHE_TTL = 1000 * 60 * 5; // 5 minutes
const HISTORICAL_CACHE_TTL = 1000 * 60 * 15; // 15 minutes
const SCENARIO_CACHE_TTL = 1000 * 60 * 60; // 60 minutes
const INVESTMENT_BASE = 10000; // ₹10,000 for scenario simulations

const YAHOO_HEADERS = {
  "User-Agent": "Mozilla/5.0 (compatible; FinoraBot/1.0; +https://github.com/)",
  Accept: "application/json",
  Connection: "keep-alive"
};

const toNumber = (value, fallback = undefined) => {
  const num = Number(value);
  if (Number.isFinite(num)) {
    return num;
  }
  return typeof fallback === "undefined" ? undefined : Number(fallback);
};

const quoteCache = new Map();
const historicalCache = new Map();
const scenarioCache = new Map();

const normalizeSymbol = (input) => {
  if (!input) return null;
  let symbol = input.toUpperCase().trim();
  if (!symbol.includes(".NS") && !symbol.includes(".BSE")) {
    symbol = `${symbol}.NS`;
  }
  return symbol;
};

const isCacheValid = (entry) => entry && entry.expiresAt > Date.now();

const setCache = (cache, key, value, ttl) => {
  cache.set(key, {
    value,
    expiresAt: Date.now() + ttl
  });
  return value;
};

const getCached = (cache, key) => {
  const entry = cache.get(key);
  if (isCacheValid(entry)) {
    return entry.value;
  }
  cache.delete(key);
  return null;
};

const mapQuoteResponse = (symbol, provider, data) => {
  const exchangeLabel = data.exchange || "NSE";
  const previousClose =
    Number(data.previous_close || data.prev_close || data.pc || data.close || 0) ||
    Number(data.close || 0);
  const rawPrice = Number(
    data.price ?? data.lastPrice ?? data.c ?? data.close ?? data.prev_close ?? previousClose
  );
  const isMarketOpen =
    typeof data.is_market_open === "boolean"
      ? data.is_market_open
      : typeof data.market_open === "boolean"
      ? data.market_open
      : null;
  const price = isMarketOpen === false && previousClose ? previousClose : rawPrice;
  const change = Number(
    typeof data.change !== "undefined"
      ? data.change
      : typeof data.d !== "undefined"
      ? data.d
      : price && previousClose
      ? price - previousClose
      : 0
  );
  const changePercent =
    typeof data.percent_change !== "undefined"
      ? Number(data.percent_change)
      : typeof data.dp !== "undefined"
      ? Number(data.dp)
      : previousClose
      ? Number(((change / previousClose) * 100).toFixed(2))
      : 0;

  return {
    symbol,
    companyName: data.name || data.companyName || symbol,
    exchange: exchangeLabel,
    currency: data.currency || "INR",
    price,
    previousClose,
    change,
    percentChange: changePercent,
    open: Number(data.open || data.o || 0),
    high: Number(data.high || data.h || 0),
    low: Number(data.low || data.l || 0),
    volume: Number(data.volume || data.v || 0),
    timestamp: data.datetime
      ? new Date(data.datetime).toISOString()
      : data.timestamp
      ? new Date(data.timestamp * 1000).toISOString()
      : new Date().toISOString(),
    provider,
    source: `${exchangeLabel} (Delayed 15m)`,
    delayed: true
  };
};

const fetchFromTwelveData = async (symbol) => {
  const apiKey = process.env.TWELVEDATA_API_KEY;
  if (!apiKey) {
    const error = new Error("TWELVEDATA_API_KEY is not configured");
    error.source = "configuration";
    throw error;
  }
  const url = `https://api.twelvedata.com/quote?symbol=${symbol}&apikey=${apiKey}`;
  const { data } = await axios.get(url);
  if (data && !data.code) {
    return mapQuoteResponse(symbol, "TWELVEDATA", data);
  }
  const error = new Error(data?.message || "Unknown TwelveData error");
  error.source = "twelvedata";
  throw error;
};

const fetchFromFinnhub = async (symbol) => {
  const apiKey = process.env.FINNHUB_KEY;
  if (!apiKey) {
    const error = new Error("FINNHUB_KEY is not configured");
    error.source = "configuration";
    throw error;
  }
  const sanitized = symbol.replace(".NS", "").replace(".BSE", "");
  const url = `https://finnhub.io/api/v1/quote?symbol=${sanitized}.NS&token=${apiKey}`;
  const { data } = await axios.get(url);
  if (data && typeof data.c !== "undefined") {
    return mapQuoteResponse(symbol, "FINNHUB", data);
  }
  const error = new Error("Invalid response from Finnhub");
  error.source = "finnhub";
  throw error;
};

const mapYahooSymbol = (symbol) => {
  if (symbol.endsWith(".BSE")) {
    return symbol.replace(".BSE", ".BO");
  }
  return symbol;
};

const fetchFromYahoo = async (symbol) => {
  const yahooSymbol = mapYahooSymbol(symbol);
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(
    yahooSymbol
  )}?interval=1d&range=1d&includePrePost=false&events=div%2Csplits`;

  const { data } = await axios.get(url, { headers: YAHOO_HEADERS });
  const result = data?.chart?.result?.[0];

  if (!result) {
    const message = data?.chart?.error?.description || "Invalid response from Yahoo Finance";
    const error = new Error(message);
    error.source = "yahoo";
    throw error;
  }

  const meta = result.meta || {};
  const quote = result.indicators?.quote?.[0] || {};

  const closeCandidate =
    quote.close && quote.close.length ? quote.close[quote.close.length - 1] : undefined;
  const openCandidate =
    quote.open && quote.open.length ? quote.open[quote.open.length - 1] : closeCandidate;
  const highCandidate =
    quote.high && quote.high.length ? quote.high[quote.high.length - 1] : closeCandidate;
  const lowCandidate =
    quote.low && quote.low.length ? quote.low[quote.low.length - 1] : closeCandidate;
  const volumeCandidate =
    quote.volume && quote.volume.length ? quote.volume[quote.volume.length - 1] : 0;

  const price = toNumber(meta.regularMarketPrice, closeCandidate);
  const previousClose = toNumber(meta.chartPreviousClose, closeCandidate);
  const open = toNumber(meta.regularMarketOpen, openCandidate);
  const high = toNumber(meta.regularMarketDayHigh, highCandidate);
  const low = toNumber(meta.regularMarketDayLow, lowCandidate);
  const volume = toNumber(meta.regularMarketVolume, volumeCandidate) || 0;
  const timestampSeconds = Number.isFinite(meta.regularMarketTime)
    ? meta.regularMarketTime
    : undefined;

  return mapQuoteResponse(symbol, "YAHOO", {
    name: meta.longName || meta.shortName || symbol,
    exchange: meta.fullExchangeName || meta.exchangeName || "NSE",
    currency: meta.currency || "INR",
    price,
    previous_close: previousClose,
    prev_close: previousClose,
    open,
    high,
    low,
    volume,
    timestamp: timestampSeconds,
    datetime: timestampSeconds ? new Date(timestampSeconds * 1000).toISOString() : undefined
  });
};

const getFallbackQuote = (symbol) => {
  const defaults = {
    "RELIANCE.NS": { price: 2450.5, change: 12.6, percentChange: 0.52 },
    "HDFCBANK.NS": { price: 1540.2, change: -8.4, percentChange: -0.54 },
    "INFY.NS": { price: 1402.8, change: 5.1, percentChange: 0.36 }
  };
  const base = defaults[symbol] || { price: 1200, change: 0, percentChange: 0 };
  const previousClose = Number((base.price - base.change).toFixed(2));
  return {
    symbol,
    companyName: symbol.replace(".NS", ""),
    exchange: "NSE",
    currency: "INR",
    price: base.price,
    previousClose,
    change: base.change,
    percentChange: base.percentChange,
    open: Number(previousClose.toFixed(2)),
    high: Number((base.price + 15).toFixed(2)),
    low: Number((base.price - 20).toFixed(2)),
    volume: 0,
    timestamp: new Date().toISOString(),
    provider: "fallback",
    source: "NSE (Delayed 15m · Fallback)",
    delayed: true,
    fallback: true
  };
};

const getQuote = async (rawSymbol) => {
  const provider = (process.env.MARKET_PROVIDER || "TWELVEDATA").toUpperCase();
  const symbol = normalizeSymbol(rawSymbol);
  if (!symbol) {
    const error = new Error("Symbol is required");
    error.source = "validation";
    throw error;
  }

  const cacheKey = `${provider}:${symbol}`;
  const cached = getCached(quoteCache, cacheKey);
  if (cached) {
    return cached;
  }

  try {
    if (!SUPPORTED_PROVIDERS.includes(provider)) {
      throw new Error(`Unsupported provider ${provider}`);
    }

    let quote;
    switch (provider) {
      case "FINNHUB":
        quote = await fetchFromFinnhub(symbol);
        break;
      case "YAHOO":
        quote = await fetchFromYahoo(symbol);
        break;
      case "TWELVEDATA":
      default:
        quote = await fetchFromTwelveData(symbol);
        break;
    }

    return setCache(quoteCache, cacheKey, quote, QUOTE_CACHE_TTL);
  } catch (error) {
    if (process.env.NODE_ENV !== "production") {
      console.warn(`[marketProvider] Falling back for ${symbol}: ${error.message}`);
    }
    if (provider !== "YAHOO") {
      try {
        const yahooQuote = await fetchFromYahoo(symbol);
        return setCache(quoteCache, `${"YAHOO"}:${symbol}`, yahooQuote, QUOTE_CACHE_TTL);
      } catch (yahooError) {
        if (process.env.NODE_ENV !== "production") {
          console.warn(`[marketProvider] Yahoo Finance quote fallback failed for ${symbol}: ${yahooError.message}`);
        }
      }
    }
    const fallback = getFallbackQuote(symbol);
    return setCache(quoteCache, cacheKey, fallback, QUOTE_CACHE_TTL);
  }
};

const SCENARIOS = {
  gfc_2008: {
    id: "gfc_2008",
    title: "2008 Global Financial Crisis",
    description: "Subprime mortgage collapse, Lehman Brothers bankruptcy, and a deep global recession.",
    difficulty: "Hard",
    image: "/images/crisis/2008.svg",
    startDate: "2007-01-01",
    eventDate: "2008-09-15",
    recoveryDate: "2009-12-31",
    entryDate: "2008-01-02",
    fallback: {
      metrics: {
        beforeCrash: { price: 3200, date: "2008-01-02" },
        crisisLow: { price: 1850, date: "2008-10-27" },
        recovery: { price: 2850, date: "2009-12-24" }
      }
    }
  },
  covid_2020: {
    id: "covid_2020",
    title: "2020 COVID Crash",
    description: "Global pandemic, nationwide lockdowns, and fastest bear market in history.",
    difficulty: "Medium",
    image: "/images/crisis/covid19.svg",
    startDate: "2019-01-01",
    eventDate: "2020-03-23",
    recoveryDate: "2021-03-31",
    entryDate: "2020-01-02",
    fallback: {
      metrics: {
        beforeCrash: { price: 1600, date: "2020-01-02" },
        crisisLow: { price: 1105, date: "2020-03-24" },
        recovery: { price: 1725, date: "2021-03-25" }
      }
    }
  },
  inflation_2022: {
    id: "inflation_2022",
    title: "2022 Inflation Shock",
    description: "High inflation, steep rate hikes, and global supply chain disruptions.",
    difficulty: "Medium",
    image: "/images/crisis/2022.svg",
    startDate: "2021-01-01",
    eventDate: "2022-06-17",
    recoveryDate: "2023-06-30",
    entryDate: "2021-12-31",
    fallback: {
      metrics: {
        beforeCrash: { price: 2450, date: "2021-12-31" },
        crisisLow: { price: 2050, date: "2022-06-17" },
        recovery: { price: 2555, date: "2023-06-30" }
      }
    }
  }
};

const hashSymbol = (symbol) => {
  return symbol.split("").reduce((acc, char, index) => acc + char.charCodeAt(0) * (index + 1), 0);
};

const generateSyntheticSeries = (symbol, { interval, startDate, endDate }) => {
  const start = new Date(startDate);
  const end = new Date(endDate);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || start > end) {
    return [];
  }

  const seed = hashSymbol(symbol);
  const stepDays =
    interval === "1week" ? 7 : interval === "1month" || interval === "1mo" ? 30 : 1;
  const totalDays = Math.max(1, Math.ceil((end - start) / (86400000 * stepDays)));

  let currentDate = new Date(start);
  const basePrice = 200 + (seed % 450);
  let previousClose = basePrice;
  const series = [];

  for (let i = 0; currentDate <= end && i <= totalDays + 2; i += 1) {
    const seasonal = Math.sin((i + seed % 31) / 9.5) * 3;
    const trend = (seed % 13) * 0.015;
    const shock =
      i > totalDays * 0.25 && i < totalDays * 0.45 ? -Math.abs(Math.sin(i / 3.5)) * 6 : 0;
    const drift = 1 + (seasonal + trend + shock) / 100;
    const close = Math.max(10, Number((previousClose * drift).toFixed(2)));
    const open = Number(((previousClose + close) / 2).toFixed(2));
    const high = Number((close * (1 + Math.abs(Math.sin(i + seed)) * 0.012)).toFixed(2));
    const low = Number((close * (1 - Math.abs(Math.cos(i + seed)) * 0.013)).toFixed(2));
    const volume = Math.max(
      50000,
      Math.round(150000 + Math.sin((i + seed) / 2.8) * 25000 + (seed % 1000) * 20)
    );

    series.push({
      date: new Date(currentDate).toISOString().slice(0, 10),
      open,
      high,
      low,
      close,
      volume
    });

    previousClose = close;
    currentDate.setDate(currentDate.getDate() + stepDays);
  }

  return series.sort((a, b) => (a.date > b.date ? 1 : -1));
};

const buildHistoricalUrl = (symbol, { interval, startDate, endDate }) => {
  const apiKey = process.env.TWELVEDATA_API_KEY;
  if (!apiKey) {
    return null;
  }

  return `https://api.twelvedata.com/time_series?symbol=${symbol}&interval=${interval}&start_date=${startDate}&end_date=${endDate}&order=ASC&apikey=${apiKey}`;
};

const intervalToYahoo = (interval) => {
  const map = {
    "1minute": "1m",
    "1min": "1m",
    "5minute": "5m",
    "5min": "5m",
    "15minute": "15m",
    "15min": "15m",
    "30minute": "30m",
    "30min": "30m",
    "1hour": "1h",
    "1hr": "1h",
    "4hour": "4h",
    "1day": "1d",
    "1d": "1d",
    "1week": "1wk",
    "1wk": "1wk",
    "1month": "1mo",
    "1mo": "1mo",
    "3month": "3mo",
    "3mo": "3mo"
  };

  return map[String(interval).toLowerCase()] || "1d";
};

const fetchHistoricalFromYahoo = async (symbol, { interval, startDate, endDate }) => {
  const yahooSymbol = mapYahooSymbol(symbol);
  const yahooInterval = intervalToYahoo(interval);

  const start = new Date(startDate);
  const end = new Date(endDate);

  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    throw new Error("Invalid date range for Yahoo Finance historical request");
  }

  const period1 = Math.floor(start.getTime() / 1000);
  // Add one day to ensure the end date is inclusive
  const period2 = Math.floor(end.getTime() / 1000) + 86400;

  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(
    yahooSymbol
  )}?period1=${period1}&period2=${period2}&interval=${yahooInterval}&includePrePost=false&events=div%2Csplits`;

  const { data } = await axios.get(url, { headers: YAHOO_HEADERS });
  const result = data?.chart?.result?.[0];

  if (!result) {
    const message = data?.chart?.error?.description || "Invalid historical response from Yahoo Finance";
    const error = new Error(message);
    error.source = "yahoo";
    throw error;
  }

  const timestamps = result.timestamp || [];
  const quote = result.indicators?.quote?.[0] || {};
  const closes = quote.close || [];
  const opens = quote.open || [];
  const highs = quote.high || [];
  const lows = quote.low || [];
  const volumes = quote.volume || [];

  const series = timestamps
    .map((ts, index) => {
      const close = closes[index];
      if (close === null || typeof close === "undefined") {
        return null;
      }
      return {
        date: new Date(ts * 1000).toISOString().slice(0, 10),
        close: Number(close),
        open: Number(opens[index] ?? close),
        high: Number(highs[index] ?? close),
        low: Number(lows[index] ?? close),
        volume: Number(volumes[index] ?? 0)
      };
    })
    .filter(Boolean);

  return series.length ? series.sort((a, b) => (a.date > b.date ? 1 : -1)) : null;
};

const mapTimeSeries = (data) => {
  if (data?.values?.length) {
    return data.values
      .map((item) => ({
        date: new Date(item.datetime).toISOString().slice(0, 10),
        close: Number(item.close),
        open: Number(item.open),
        high: Number(item.high),
        low: Number(item.low),
        volume: Number(item.volume ?? 0)
      }))
      .sort((a, b) => (a.date > b.date ? 1 : -1));
  }
  return null;
};

const fetchHistoricalSeries = async (
  rawSymbol,
  {
    interval = "1month",
    startDate = "2000-01-01",
    endDate = new Date().toISOString().slice(0, 10)
  } = {}
) => {
  const symbol = normalizeSymbol(rawSymbol);
  if (!symbol) {
    const error = new Error("Symbol is required");
    error.source = "validation";
    throw error;
  }

  const cacheKey = `${symbol}:${interval}:${startDate}:${endDate}`;
  const cached = getCached(historicalCache, cacheKey);
  if (cached) {
    return cached;
  }

  try {
    const url = buildHistoricalUrl(symbol, { interval, startDate, endDate });
    if (url) {
      const { data } = await axios.get(url);
      const series = mapTimeSeries(data);
      if (series && series.length) {
        return setCache(historicalCache, cacheKey, series, HISTORICAL_CACHE_TTL);
      }
      const error = new Error(data?.message || "Unable to load historical series");
      error.source = "twelvedata";
      throw error;
    }
    throw new Error("TWELVEDATA_API_KEY is not configured");
  } catch (error) {
    if (process.env.NODE_ENV !== "production") {
      console.warn(
        `[marketProvider] Historical fallback trigger for ${symbol} (${interval} ${startDate} → ${endDate}): ${
          error.message
        }`
      );
    }
    try {
      const yahooSeries = await fetchHistoricalFromYahoo(symbol, { interval, startDate, endDate });
      if (yahooSeries && yahooSeries.length) {
        if (process.env.NODE_ENV !== "production") {
          console.info(
            `[marketProvider] Historical data served from Yahoo Finance for ${symbol} (${interval} ${startDate} → ${endDate})`
          );
        }
        return setCache(historicalCache, cacheKey, yahooSeries, HISTORICAL_CACHE_TTL);
      }
    } catch (yahooError) {
      if (process.env.NODE_ENV !== "production") {
        console.warn(
          `[marketProvider] Yahoo Finance historical fallback failed for ${symbol} (${interval} ${startDate} → ${endDate}): ${
            yahooError.message
          }`
        );
      }
    }
    const fallbackSeries = generateSyntheticSeries(symbol, { interval, startDate, endDate });
    return setCache(historicalCache, cacheKey, fallbackSeries, HISTORICAL_CACHE_TTL);
  }
};

const fetchTimeSeries = async (symbol, { startDate, recoveryDate }) => {
  return fetchHistoricalSeries(symbol, {
    interval: "1week",
    startDate,
    endDate: recoveryDate
  });
};

const findClosestPoint = (series, targetDate, direction = "any") => {
  if (!series.length) return null;
  const target = new Date(targetDate);

  if (direction === "before") {
    const candidates = series.filter((point) => new Date(point.date) <= target);
    return candidates.length ? candidates[candidates.length - 1] : series[0];
  }
  if (direction === "after") {
    const candidates = series.filter((point) => new Date(point.date) >= target);
    return candidates.length ? candidates[0] : series[series.length - 1];
  }

  return series.reduce((closest, point) => {
    const diff = Math.abs(new Date(point.date) - target);
    if (!closest) return point;
    return diff < Math.abs(new Date(closest.date) - target) ? point : closest;
  }, null);
};

const applyScenarioFallback = (symbol, scenarioConfig) => {
  const { metrics } = scenarioConfig.fallback;
  const entryPrice = metrics.beforeCrash.price;
  const lowPrice = metrics.crisisLow.price;
  const recoveryPrice = metrics.recovery.price;
  const shares = INVESTMENT_BASE / entryPrice;

  const scenario = {
    scenario: {
      id: scenarioConfig.id,
      title: scenarioConfig.title,
      description: scenarioConfig.description,
      period: `${scenarioConfig.startDate} → ${scenarioConfig.recoveryDate}`
    },
    symbol,
    currency: "INR",
    metrics: {
      beforeCrash: metrics.beforeCrash,
      crisisLow: metrics.crisisLow,
      recovery: metrics.recovery,
      lossPercent: Number((((lowPrice - entryPrice) / entryPrice) * 100).toFixed(2)),
      recoveryPercent: Number((((recoveryPrice - lowPrice) / lowPrice) * 100).toFixed(2)),
      totalReturnPercent: Number((((recoveryPrice - entryPrice) / entryPrice) * 100).toFixed(2)),
      investment: {
        initial: INVESTMENT_BASE,
        shares: Number(shares.toFixed(4)),
        valueAtLow: Number((shares * lowPrice).toFixed(2)),
        valueAfterYear: Number((shares * recoveryPrice).toFixed(2))
      }
    },
    series: [
      metrics.beforeCrash,
      metrics.crisisLow,
      metrics.recovery
    ],
    annotations: {
      entryDate: metrics.beforeCrash.date,
      crisisDate: scenarioConfig.eventDate,
      recoveryDate: scenarioConfig.recoveryDate
    },
    source: "Simulated historical snapshot"
  };

  scenario.summary = `If you invested ₹${INVESTMENT_BASE.toLocaleString("en-IN")} in ${symbol.replace(
    ".NS",
    ""
  )} before the ${scenarioConfig.title}, your portfolio one year later would be worth ₹${Math.round(
    shares * recoveryPrice
  ).toLocaleString("en-IN")}.`;

  scenario.fallback = true;
  return scenario;
};

const buildScenarioSnapshot = (symbol, scenarioConfig, series) => {
  const entryPoint =
    findClosestPoint(series, scenarioConfig.entryDate || scenarioConfig.startDate, "before") ||
    series[0];
  const crisisPoint =
    series.reduce((min, point) => (point.close < min.close ? point : min), series[0]) || entryPoint;
  const recoveryPoint =
    findClosestPoint(series, scenarioConfig.recoveryDate, "after") ||
    series[series.length - 1];

  const entryPrice = entryPoint.close;
  const lowPrice = crisisPoint.close;
  const recoveryPrice = recoveryPoint.close;
  const shares = INVESTMENT_BASE / entryPrice;

  const snapshot = {
    scenario: {
      id: scenarioConfig.id,
      title: scenarioConfig.title,
      description: scenarioConfig.description,
      period: `${scenarioConfig.startDate} → ${scenarioConfig.recoveryDate}`
    },
    symbol,
    currency: "INR",
    metrics: {
      beforeCrash: entryPoint,
      crisisLow: crisisPoint,
      recovery: recoveryPoint,
      lossPercent: Number((((lowPrice - entryPrice) / entryPrice) * 100).toFixed(2)),
      recoveryPercent: Number((((recoveryPrice - lowPrice) / lowPrice) * 100).toFixed(2)),
      totalReturnPercent: Number((((recoveryPrice - entryPrice) / entryPrice) * 100).toFixed(2)),
      investment: {
        initial: INVESTMENT_BASE,
        shares: Number(shares.toFixed(4)),
        valueAtLow: Number((shares * lowPrice).toFixed(2)),
        valueAfterYear: Number((shares * recoveryPrice).toFixed(2))
      }
    },
    series,
    annotations: {
      entryDate: entryPoint.date,
      crisisDate: scenarioConfig.eventDate,
      recoveryDate: scenarioConfig.recoveryDate
    },
    source: "TwelveData (15m delayed, NSE)"
  };

  snapshot.summary = `If you invested ₹${INVESTMENT_BASE.toLocaleString(
    "en-IN"
  )} in ${symbol.replace(".NS", "")} before the ${scenarioConfig.title}, the position would have dropped to ₹${Math.round(
    shares * lowPrice
  ).toLocaleString(
    "en-IN"
  )} at the crisis low and recovered to ₹${Math.round(shares * recoveryPrice).toLocaleString(
    "en-IN"
  )} one year later.`;

  return snapshot;
};

const getScenarioSnapshot = async (rawSymbol, scenarioId = "gfc_2008") => {
  const symbol = normalizeSymbol(rawSymbol);
  if (!symbol) {
    const error = new Error("Symbol is required");
    error.source = "validation";
    throw error;
  }

  const scenarioConfig = SCENARIOS[scenarioId] || SCENARIOS.gfc_2008;
  const cacheKey = `${symbol}:${scenarioConfig.id}`;

  const cached = getCached(scenarioCache, cacheKey);
  if (cached) {
    return cached;
  }

  try {
    const series = await fetchTimeSeries(symbol, scenarioConfig);
    if (!series.length) {
      throw new Error("No historical data points available");
    }
    const snapshot = buildScenarioSnapshot(symbol, scenarioConfig, series);
    return setCache(scenarioCache, cacheKey, snapshot, SCENARIO_CACHE_TTL);
  } catch (error) {
    if (process.env.NODE_ENV !== "production") {
      console.warn(
        `[marketProvider] Scenario fallback for ${symbol} (${scenarioConfig.id}): ${error.message}`
      );
    }
    const fallback = applyScenarioFallback(symbol, scenarioConfig);
    return setCache(scenarioCache, cacheKey, fallback, SCENARIO_CACHE_TTL);
  }
};

const listCrisisPresets = () => {
  return Object.values(SCENARIOS).map((scenario) => ({
    id: scenario.id,
    title: scenario.title,
    description: scenario.description,
    startDate: scenario.startDate,
    endDate: scenario.recoveryDate,
    eventDate: scenario.eventDate,
    entryDate: scenario.entryDate,
    difficulty: scenario.difficulty,
    image: scenario.image
  }));
};

const getScenarioConfig = (scenarioId) => {
  return SCENARIOS[scenarioId] || null;
};

module.exports = {
  getQuote,
  getScenarioSnapshot,
  fetchHistoricalSeries,
  listCrisisPresets,
  getScenarioConfig
};

