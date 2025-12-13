const express = require("express");
const { getKnowledgeIndex } = require("../controllers/knowledgeController");

const router = express.Router();

router.get("/", getKnowledgeIndex);

module.exports = router;





