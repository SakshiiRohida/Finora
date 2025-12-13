const express = require("express");
const { query, body } = require("express-validator");
const { quote, scenario, listStocks, recordTrade } = require("../controllers/simulatorController");

const router = express.Router();

router.get(
  "/quote",
  [query("symbol").isString().notEmpty().withMessage("Symbol is required")],
  quote
);

router.get("/stocks", listStocks);

router.post(
  "/trades",
  [
    body("symbol").isString().notEmpty(),
    body("side").isString().isIn(["BUY", "SELL", "buy", "sell"]),
    body("quantity").isNumeric(),
    body("price").isNumeric(),
    body("executedAt").optional().isISO8601()
  ],
  recordTrade
);

router.get(
  "/scenario",
  [
    query("symbol").isString().notEmpty().withMessage("Symbol is required"),
    query("scenario")
      .optional()
      .isString()
      .withMessage("Scenario must be a string identifier")
  ],
  scenario
);

module.exports = router;

