const express = require("express");
const { body } = require("express-validator");
const { listLessons, getLesson, completeLesson } = require("../controllers/lessonController");

const router = express.Router();

router.get("/", listLessons);
router.get("/:id", getLesson);
router.post(
  "/:id/complete",
  [
    body("score").optional().isNumeric(),
    body("maxScore").optional().isNumeric()
  ],
  completeLesson
);

module.exports = router;

