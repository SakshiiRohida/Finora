const { validationResult } = require("express-validator");
const { getQuote, getScenarioSnapshot } = require("../services/marketProvider");
const stockUniverse = require("../config/stockUniverse");
const { resolveUserId } = require("./helpers");
const db = require("../utils/db");

const extractValidationErrors = (req) => {
  const errors = validationResult(req);
  if (errors.isEmpty()) {
    return null;
  }
  return errors.array().map((error) => ({
    field: error.param,
    message: error.msg
  }));
};

const quote = async (req, res) => {
  const validationErrors = extractValidationErrors(req);
  if (validationErrors) {
    return res.status(400).json({ message: "Invalid request", errors: validationErrors });
  }

  const symbol = req.query.symbol || req.params.symbol;
  if (!symbol) {
    return res.status(400).json({ message: "Symbol query parameter is required" });
  }

  try {
    const quoteData = await getQuote(symbol);
    return res.json({ quote: quoteData });
  } catch (error) {
    console.error("[simulatorController] quote error", error);
    return res.status(502).json({
      message: error.message || "Unable to fetch quote right now",
      source: error.source || "market-data"
    });
  }
};

const scenario = async (req, res) => {
  const validationErrors = extractValidationErrors(req);
  if (validationErrors) {
    return res.status(400).json({ message: "Invalid request", errors: validationErrors });
  }

  const { symbol, scenario: scenarioId } = req.query;

  if (!symbol) {
    return res.status(400).json({ message: "Symbol query parameter is required" });
  }

  try {
    const snapshot = await getScenarioSnapshot(symbol, scenarioId);
    return res.json(snapshot);
  } catch (error) {
    console.error("[simulatorController] scenario error", error);
    return res.status(502).json({
      message: error.message || "Unable to load scenario data right now",
      source: error.source || "market-data"
    });
  }
};

module.exports = {
  quote,
  scenario,
  recordTrade: async (req, res, next) => {
    try {
      const userId = resolveUserId(req);
      if (!userId) {
        return res.status(400).json({ message: "Unknown user context" });
      }

      const { symbol, side, quantity, price, executedAt } = req.body || {};
      if (!symbol || !side || !quantity || !price) {
        return res.status(400).json({ message: "Missing trade parameters" });
      }

      const normalisedSide = String(side).toUpperCase() === "SELL" ? "SELL" : "BUY";
      const qty = Number(quantity);
      const tradePrice = Number(price);

      if (!Number.isFinite(qty) || qty <= 0 || !Number.isFinite(tradePrice) || tradePrice <= 0) {
        return res.status(400).json({ message: "Invalid trade values" });
      }

      const timestamp = executedAt ? new Date(executedAt) : new Date();
      if (Number.isNaN(timestamp.getTime())) {
        return res.status(400).json({ message: "Invalid executedAt timestamp" });
      }

      await db.query(
        `
          INSERT INTO simulator_trades (user_id, symbol, side, quantity, price, executed_at)
          VALUES (?, ?, ?, ?, ?, ?)
        `,
        [userId, symbol.toUpperCase(), normalisedSide, qty, tradePrice, timestamp]
      );

      return res.json({ status: "recorded" });
    } catch (error) {
      return next(error);
    }
  },
  listStocks: async (_req, res) => {
    return res.json({
      stocks: stockUniverse
    });
  }
};

