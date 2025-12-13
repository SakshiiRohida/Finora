const express = require("express");
const { body, query, param } = require("express-validator");
const {
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
} = require("../controllers/timeTravelController");
const validate = require("../utils/validate");

const router = express.Router();

router.get("/crises", listCrises);

router.get(
  "/events",
  [query("crisisId").optional().isString().withMessage("crisisId must be a string")],
  validate,
  listEvents
);

router.post(
  "/start",
  [
    body("startDate")
      .optional({ nullable: true, checkFalsy: true })
      .isISO8601()
      .withMessage("startDate must be a valid date"),
    body("endDate")
      .optional({ nullable: true, checkFalsy: true })
      .isISO8601()
      .withMessage("endDate must be a valid date"),
    body("crisisId").optional().isString().withMessage("crisisId must be a string"),
    body("initialCash").optional().isFloat({ min: 0 }).withMessage("initialCash must be positive"),
    body().custom((value, { req }) => {
      const hasCustomRange = req.body.startDate && req.body.endDate;
      if (!req.body.crisisId && !hasCustomRange) {
        throw new Error("Provide startDate & endDate or choose a crisisId");
      }
      return true;
    })
  ],
  validate,
  startSession
);

router.get(
  "/history",
  [query("symbol").isString().notEmpty().withMessage("symbol is required")],
  validate,
  getHistory
);

router.get(
  "/portfolio/:sessionId",
  [param("sessionId").isInt({ min: 1 }).withMessage("sessionId must be provided")],
  validate,
  getPortfolio
);

router.post(
  "/trade",
  [
    body("sessionId").isInt({ min: 1 }).withMessage("sessionId is required"),
    body("date").isISO8601().withMessage("date must be a valid trading day"),
    body("symbol").isString().notEmpty().withMessage("symbol is required"),
    body("qty").optional().isInt({ min: 1 }).withMessage("qty must be at least 1"),
    body("quantity").optional().isInt({ min: 1 }).withMessage("quantity must be at least 1"),
    body("type").isString().notEmpty().withMessage("type is required")
  ],
  validate,
  recordTrade
);

router.post(
  "/next-day",
  [body("sessionId").isInt({ min: 1 }).withMessage("sessionId is required")],
  validate,
  nextDay
);

router.post(
  "/previous-day",
  [body("sessionId").isInt({ min: 1 }).withMessage("sessionId is required")],
  validate,
  previousDay
);

router.post(
  "/seek",
  [
    body("sessionId").isInt({ min: 1 }).withMessage("sessionId is required"),
    body("date").isISO8601().withMessage("date must be valid")
  ],
  validate,
  seekDate
);

router.post(
  "/reset",
  [body("sessionId").isInt({ min: 1 }).withMessage("sessionId is required")],
  validate,
  resetSession
);

module.exports = router;


