const express = require("express");
const { list, complete } = require("../controllers/questsController");

const router = express.Router();

router.get("/", list);
router.post("/:id/complete", complete);

module.exports = router;

