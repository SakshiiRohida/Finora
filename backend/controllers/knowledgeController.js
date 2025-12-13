const db = require("../utils/db");
const { resolveUserId } = require("./helpers");

const getKnowledgeIndex = async (req, res, next) => {
  try {
    const userId = resolveUserId(req);

    if (!userId) {
      return res.json({ knowledgeIndex: 0, samples: 0 });
    }

    const [rows] = await db.query(
      `SELECT
         COUNT(*) AS samples,
         COALESCE(ROUND(AVG(score)), 0) AS knowledge_index
       FROM user_lessons
       WHERE user_id = ? AND score IS NOT NULL`,
      [userId]
    );

    const payload = rows?.[0] || { knowledge_index: 0, samples: 0 };

    return res.json({
      knowledgeIndex: Number(payload.knowledge_index || 0),
      samples: Number(payload.samples || 0),
      userId
    });
  } catch (error) {
    return next(error);
  }
};

module.exports = {
  getKnowledgeIndex
};

