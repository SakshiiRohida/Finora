const { fetchHistoricalSeries } = require("../services/marketProvider");

const parseDate = (value, fallback) => {
  if (!value) return fallback;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return fallback;
  }
  return date.toISOString().slice(0, 10);
};

const getHistory = async (req, res, next) => {
  try {
    const symbol = req.query.symbol;
    if (!symbol) {
      return res.status(400).json({ message: "Symbol query parameter is required" });
    }

    const interval = req.query.interval || "1month";
    const startDate = parseDate(req.query.start, "2000-01-01");
    const endDate = parseDate(req.query.end, new Date().toISOString().slice(0, 10));

    const series = await fetchHistoricalSeries(symbol, { interval, startDate, endDate });

    return res.json({
      symbol,
      interval,
      startDate,
      endDate,
      points: series
    });
  } catch (error) {
    return next(error);
  }
};

module.exports = {
  getHistory
};





