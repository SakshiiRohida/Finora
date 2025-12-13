const express = require("express");
const { listQuests, completeQuest } = require("../controllers/questController");

const router = express.Router();

router.get("/", listQuests);
router.post("/:id/complete", completeQuest);

module.exports = router;

