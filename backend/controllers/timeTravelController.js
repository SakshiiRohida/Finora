const db = require("../utils/db");
const {
  fetchHistoricalSeries,
  listCrisisPresets,
  getScenarioConfig
} = require("../services/marketProvider");
const marketConditionData = require("../data/time_travel_market_conditions.json");

const MARKET_CONDITION_FALLBACK = "Market tone mirrors the previous month with no notable shifts.";

const CRISIS_ALIAS_MAP = {
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

const DEFAULT_INITIAL_CASH = 100000;

const toISODate = (value) => {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) {
    return null;
  }
  return date.toISOString().slice(0, 10);
};

const addDays = (dateString, amount) => {
  const date = new Date(dateString);
  date.setDate(date.getDate() + amount);
  return toISODate(date);
};

const normaliseSymbol = (symbol) => {
  if (!symbol) {
    return null;
  }
  const trimmed = symbol.trim().toUpperCase();
  if (!trimmed.includes(".NS")) {
    return `${trimmed}.NS`;
  }
  return trimmed;
};

const normaliseCrisisKey = (value) => {
  if (!value) return null;
  const trimmed = String(value).trim().toLowerCase();
  if (!trimmed) return null;
  return CRISIS_ALIAS_MAP[trimmed] || trimmed.replace(/-/g, "_");
};

const toMonthKey = (value) => {
  if (!value) return null;
  if (/^\d{4}-\d{2}$/.test(value)) return value;
  const iso = toISODate(value);
  return iso ? iso.slice(0, 7) : null;
};

const iterateMonths = (startDate, endDate) => {
  const startKey = toMonthKey(startDate);
  const endKey = toMonthKey(endDate);
  if (!startKey || !endKey) return [];

  const months = [];
  const current = new Date(`${startKey}-01T00:00:00Z`);
  const end = new Date(`${endKey}-01T00:00:00Z`);

  if (Number.isNaN(current.getTime()) || Number.isNaN(end.getTime())) {
    return [];
  }

  while (current <= end) {
    const key = `${current.getUTCFullYear()}-${String(current.getUTCMonth() + 1).padStart(2, "0")}`;
    months.push(key);
    current.setUTCMonth(current.getUTCMonth() + 1);
  }

  return months;
};

const getSession = async (sessionId) => {
  const [rows] = await db.query("SELECT * FROM time_travel_sessions WHERE id = ?", [sessionId]);
  if (!rows.length) {
    const error = new Error("Time travel session not found");
    error.status = 404;
    throw error;
  }
  return rows[0];
};

const getTrades = async (sessionId) => {
  const [rows] = await db.query(
    `SELECT * FROM time_travel_trades
     WHERE session_id = ?
     ORDER BY trade_date ASC, created_at ASC, id ASC`,
    [sessionId]
  );
  return rows;
};

const fetchPriceOnOrBefore = async (rawSymbol, date) => {
  const symbol = normaliseSymbol(rawSymbol);
  const startBuffer = addDays(date, -7);
  const history = await fetchHistoricalSeries(symbol, {
    interval: "1day",
    startDate: startBuffer,
    endDate: date
  });

  if (!history || !history.length) {
    const error = new Error(`No historical data available for ${symbol} by ${date}`);
    error.status = 404;
    throw error;
  }

  const point = [...history].reverse().find((entry) => entry.date <= date);
  if (!point) {
    const error = new Error(`No trading data available for ${symbol} on or before ${date}`);
    error.status = 404;
    throw error;
  }
  return point;
};

const computeHoldingsSnapshot = (session, trades, asOfDate) => {
  const cash = Number(session.initial_cash ?? DEFAULT_INITIAL_CASH);
  const holdings = new Map();
  let remainingCash = cash;

  for (const trade of trades) {
    const tradeDate = toISODate(trade.trade_date);
    if (!tradeDate || tradeDate > asOfDate) {
      continue;
    }

    const symbol = trade.symbol.toUpperCase();
    const quantity = Number(trade.quantity);
    const price = Number(trade.price);
    const type = trade.type.toUpperCase();

    if (!holdings.has(symbol)) {
      holdings.set(symbol, { quantity: 0, avgPrice: 0 });
    }
    const holding = holdings.get(symbol);

    if (type === "BUY") {
      const cost = quantity * price;
      remainingCash -= cost;
      const newQuantity = holding.quantity + quantity;
      const newAvg =
        holding.quantity === 0
          ? price
          : (holding.avgPrice * holding.quantity + price * quantity) / newQuantity;

      holding.quantity = Number(newQuantity.toFixed(4));
      holding.avgPrice = Number(newAvg.toFixed(4));
    } else if (type === "SELL") {
      const proceeds = quantity * price;
      remainingCash += proceeds;
      const newQuantity = holding.quantity - quantity;
      holding.quantity = Number(newQuantity.toFixed(4));
      if (holding.quantity <= 0) {
        holdings.delete(symbol);
      }
    }
  }

  return {
    cash: Number(remainingCash.toFixed(2)),
    holdings
  };
};

const buildPortfolioResponse = async (session, trades, asOfDate) => {
  const { cash, holdings } = computeHoldingsSnapshot(session, trades, asOfDate);
  const symbols = Array.from(holdings.keys());

  const holdingsWithPrices = await Promise.all(
    symbols.map(async (symbol) => {
      const point = await fetchPriceOnOrBefore(symbol, asOfDate);
      const holding = holdings.get(symbol);
      const currentValue = holding.quantity * point.close;
      return {
        symbol,
        quantity: Number(holding.quantity.toFixed(4)),
        avgPrice: Number(holding.avgPrice.toFixed(2)),
        currentPrice: Number(point.close.toFixed(2)),
        currentValue: Number(currentValue.toFixed(2)),
        pnl: Number((currentValue - holding.quantity * holding.avgPrice).toFixed(2))
      };
    })
  );

  const totalHoldingsValue = holdingsWithPrices.reduce((sum, entry) => sum + entry.currentValue, 0);
  const totalValue = Number((cash + totalHoldingsValue).toFixed(2));

  return {
    asOf: asOfDate,
    cash,
    holdingsValue: Number(totalHoldingsValue.toFixed(2)),
    totalValue,
    pnl: Number((totalValue - session.initial_cash).toFixed(2)),
    holdings: holdingsWithPrices,
    trades: trades
      .filter((trade) => toISODate(trade.trade_date) <= asOfDate)
      .map((trade) => ({
        id: trade.id,
        date: toISODate(trade.trade_date),
        symbol: trade.symbol,
        quantity: Number(trade.quantity),
        price: Number(trade.price),
        side: trade.type
      }))
  };
};

const startSession = async (req, res, next) => {
  try {
    const crisisId = req.body.crisisId ? String(req.body.crisisId) : null;
    const crisisConfig = crisisId ? getScenarioConfig(crisisId) : null;

    let startDate = toISODate(req.body.startDate);
    let endDate = toISODate(req.body.endDate);

    if (crisisConfig) {
      startDate = crisisConfig.startDate;
      endDate = crisisConfig.recoveryDate;
    }

    const initialCash = Number(req.body.initialCash ?? DEFAULT_INITIAL_CASH);

    if (!startDate || !endDate) {
      return res.status(400).json({
        message: "Provide startDate & endDate or choose a crisis preset"
      });
    }
    if (startDate > endDate) {
      return res.status(400).json({ message: "startDate must be before endDate" });
    }

    const [result] = await db.query(
      "INSERT INTO time_travel_sessions (`user_id`, `crisis_id`, `start_date`, `end_date`, `current_date`, `initial_cash`) VALUES (?, ?, ?, ?, ?, ?)",
      [req.body.userId ?? null, crisisId, startDate, endDate, startDate, initialCash]
    );

    const session = await getSession(result.insertId);
    const trades = await getTrades(session.id);
    const portfolio = await buildPortfolioResponse(session, trades, session.current_date);

    return res.status(201).json({ session, portfolio });
  } catch (error) {
    return next(error);
  }
};

const getHistory = async (req, res, next) => {
  try {
    const symbol = normaliseSymbol(req.query.symbol);
    if (!symbol) {
      return res.status(400).json({ message: "symbol query parameter is required" });
    }

    const interval = req.query.interval || "1day";
    const crisisId = req.query.crisisId ? String(req.query.crisisId) : null;
    const crisisConfig = crisisId ? getScenarioConfig(crisisId) : null;
    const startDate = toISODate(req.query.start || crisisConfig?.startDate || "2000-01-01");
    const endDate = toISODate(req.query.end || crisisConfig?.recoveryDate || new Date());

    const points = await fetchHistoricalSeries(symbol, {
      interval,
      startDate,
      endDate
    });

    return res.json({
      symbol,
      interval,
      startDate,
      endDate,
      points: points ?? [],
      crisis: crisisConfig
    });
  } catch (error) {
    return next(error);
  }
};

const ensureTradable = async (session, trades, tradeDate, symbol, quantity, type) => {
  const snapshot = computeHoldingsSnapshot(session, trades, tradeDate);
  const pricePoint = await fetchPriceOnOrBefore(symbol, tradeDate);
  const price = Number(pricePoint.close.toFixed(4));
  const notional = quantity * price;

  if (type === "BUY") {
    if (notional > snapshot.cash + 1e-6) {
      const error = new Error("Insufficient cash to execute trade");
      error.status = 400;
      throw error;
    }
  } else if (type === "SELL") {
    const symbolKey = symbol.toUpperCase();
    const holding = snapshot.holdings.get(symbolKey);
    if (!holding || holding.quantity + 1e-6 < quantity) {
      const error = new Error("Cannot sell more than current holdings");
      error.status = 400;
      throw error;
    }
  }

  return { price };
};

const recordTrade = async (req, res, next) => {
  try {
    const sessionId = Number(req.body.sessionId);
    const tradeDate = toISODate(req.body.date);
    const quantity = Number(req.body.qty ?? req.body.quantity);
    const type = String(req.body.type || req.body.side || "").toUpperCase();
    const symbol = normaliseSymbol(req.body.symbol);

    if (!sessionId || !tradeDate || !quantity || !type || !symbol) {
      return res.status(400).json({ message: "sessionId, date, symbol, quantity, and type are required" });
    }
    if (!["BUY", "SELL"].includes(type)) {
      return res.status(400).json({ message: "type must be BUY or SELL" });
    }
    if (quantity <= 0) {
      return res.status(400).json({ message: "quantity must be greater than zero" });
    }

    const session = await getSession(sessionId);
    if (tradeDate < toISODate(session.start_date) || tradeDate > toISODate(session.end_date)) {
      return res.status(400).json({ message: "Trade date must fall within the session range" });
    }

    const trades = await getTrades(sessionId);
    const { price } = await ensureTradable(session, trades, tradeDate, symbol, quantity, type);

    await db.query(
      `INSERT INTO time_travel_trades (session_id, trade_date, symbol, quantity, price, type)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [sessionId, tradeDate, symbol, quantity, price, type]
    );

    const updatedTrades = await getTrades(sessionId);
    const portfolio = await buildPortfolioResponse(session, updatedTrades, session.current_date);

    return res.status(201).json({
      message: "Trade recorded",
      portfolio,
      trade: {
        date: tradeDate,
        symbol,
        quantity,
        price,
        side: type
      }
    });
  } catch (error) {
    return next(error);
  }
};

const getPortfolio = async (req, res, next) => {
  try {
    const session = await getSession(Number(req.params.sessionId));
    const trades = await getTrades(session.id);
    const portfolio = await buildPortfolioResponse(session, trades, session.current_date);
    return res.json({ session, portfolio });
  } catch (error) {
    return next(error);
  }
};

const clampSessionDate = async (session, targetDate) => {
  const start = toISODate(session.start_date);
  const end = toISODate(session.end_date);
  if (targetDate < start || targetDate > end) {
    const error = new Error("Date is outside the session range");
    error.status = 400;
    throw error;
  }

  await db.query(
    "UPDATE time_travel_sessions SET `current_date` = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
    [targetDate, session.id]
  );

  return targetDate;
};

const updateSessionDate = async (session, delta) => {
  const nextDate = addDays(session.current_date, delta);
  const start = toISODate(session.start_date);
  const end = toISODate(session.end_date);

  if (delta > 0 && nextDate > end) {
    const error = new Error("Already at the end of the selected range");
    error.status = 400;
    throw error;
  }
  if (delta < 0 && nextDate < start) {
    const error = new Error("Already at the start of the selected range");
    error.status = 400;
    throw error;
  }

  return clampSessionDate(session, nextDate);
};

const nextDay = async (req, res, next) => {
  try {
    const session = await getSession(Number(req.body.sessionId));
    const updatedDate = await updateSessionDate(session, 1);
    const updatedSession = await getSession(session.id);
    const trades = await getTrades(session.id);
    const portfolio = await buildPortfolioResponse(updatedSession, trades, updatedSession.current_date);

    return res.json({ session: updatedSession, portfolio, currentDate: updatedDate });
  } catch (error) {
    return next(error);
  }
};

const previousDay = async (req, res, next) => {
  try {
    const session = await getSession(Number(req.body.sessionId));
    const updatedDate = await updateSessionDate(session, -1);
    const updatedSession = await getSession(session.id);
    const trades = await getTrades(session.id);
    const portfolio = await buildPortfolioResponse(updatedSession, trades, updatedSession.current_date);

    return res.json({ session: updatedSession, portfolio, currentDate: updatedDate });
  } catch (error) {
    return next(error);
  }
};

const seekDate = async (req, res, next) => {
  try {
    const session = await getSession(Number(req.body.sessionId));
    const targetDate = toISODate(req.body.date);
    if (!targetDate) {
      return res.status(400).json({ message: "Valid date is required" });
    }

    await clampSessionDate(session, targetDate);
    const updatedSession = await getSession(session.id);
    const trades = await getTrades(session.id);
    const portfolio = await buildPortfolioResponse(updatedSession, trades, updatedSession.current_date);

    return res.json({ session: updatedSession, portfolio, currentDate: updatedSession.current_date });
  } catch (error) {
    return next(error);
  }
};

const resetSession = async (req, res, next) => {
  try {
    const sessionId = Number(req.body.sessionId);
    if (!sessionId) {
      return res.status(400).json({ message: "sessionId is required" });
    }
    await db.query("DELETE FROM time_travel_sessions WHERE id = ?", [sessionId]);
    return res.status(204).send();
  } catch (error) {
    return next(error);
  }
};

const listCrises = async (req, res) => {
  const crises = listCrisisPresets();
  return res.json({ crises });
};

const listEvents = async (req, res) => {
  const crisisIdRaw = req.query.crisisId || req.params.crisisId;
  if (!crisisIdRaw) {
    const crises = listCrisisPresets().map((crisis) => ({
      id: crisis.id,
      title: crisis.title,
      startDate: crisis.startDate,
      endDate: crisis.endDate
    }));
    return res.json({ crises });
  }

  const normalisedKey = normaliseCrisisKey(crisisIdRaw);
  const crisisKey = normalisedKey || String(crisisIdRaw).trim();

  const scenario = getScenarioConfig(crisisKey);
  const rawEntries =
    marketConditionData[crisisKey] ||
    marketConditionData[normalisedKey] ||
    marketConditionData[String(crisisIdRaw).trim()] ||
    [];

  const monthMap = new Map();
  rawEntries.forEach((entry) => {
    const key = toMonthKey(entry.month);
    if (!key) return;
    const value = String(entry.marketCondition ?? "").trim();
    monthMap.set(key, value.length ? value : MARKET_CONDITION_FALLBACK);
  });

  let months = [];
  if (scenario?.startDate && scenario?.recoveryDate) {
    months = iterateMonths(scenario.startDate, scenario.recoveryDate);
  }
  if (!months.length && monthMap.size) {
    months = Array.from(monthMap.keys()).sort();
  }

  const events = months.map((month) => ({
    month,
    marketCondition: monthMap.get(month) || MARKET_CONDITION_FALLBACK
  }));

  return res.json({
    crisisId: crisisKey,
    events
  });
};

module.exports = {
  startSession,
  getHistory,
  recordTrade,
  getPortfolio,
  nextDay,
  previousDay,
  seekDate,
  resetSession,
  listCrises,
  listEvents
};


