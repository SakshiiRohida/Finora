const db = require("../utils/db");

const resolveUserId = (req) => {
  if (req?.query?.userId && Number(req.query.userId) > 0) {
    return Number(req.query.userId);
  }
  const guest = Number(process.env.GUEST_USER_ID);
  return Number.isFinite(guest) ? guest : null;
};

const listLeaderboard = async (req, res, next) => {
  try {
    const metric = req.query.metric === "coins" ? "coins" : "xp";
    const limit = Math.min(50, Math.max(5, Number(req.query.limit) || 20));
    const userId = resolveUserId(req);
    const orderColumn = metric === "coins" ? "u.coins" : "u.xp";

    const [rows] = await db.query(
      `SELECT
          u.id,
          u.name,
          u.xp,
          u.coins,
          u.streak_count,
          COALESCE(ROUND(AVG(ul.score)), 0) AS knowledge_index
        FROM users u
        LEFT JOIN user_lessons ul
          ON ul.user_id = u.id AND ul.score IS NOT NULL
        GROUP BY u.id
        ORDER BY ${orderColumn} DESC, u.id ASC
        LIMIT ?`,
      [limit]
    );

    let currentUser = null;
    if (userId) {
      const currentIndex = rows.findIndex((entry) => entry.id === userId);
      if (currentIndex >= 0) {
        currentUser = {
          id: rows[currentIndex].id,
          name: rows[currentIndex].name,
          xp: Number(rows[currentIndex].xp || 0),
          coins: Number(rows[currentIndex].coins || 0),
          streak: rows[currentIndex].streak_count,
          knowledgeIndex: Number(rows[currentIndex].knowledge_index || 0),
          rank: currentIndex + 1
        };
      } else {
        const [extraRows] = await db.query(
          `SELECT
              u.id,
              u.name,
              u.xp,
              u.coins,
              u.streak_count,
              COALESCE(ROUND(AVG(ul.score)), 0) AS knowledge_index
            FROM users u
            LEFT JOIN user_lessons ul ON ul.user_id = u.id AND ul.score IS NOT NULL
            WHERE u.id = ?
            GROUP BY u.id`,
          [userId]
        );
        if (extraRows.length) {
          currentUser = {
            id: extraRows[0].id,
            name: extraRows[0].name,
            xp: Number(extraRows[0].xp || 0),
            coins: Number(extraRows[0].coins || 0),
            streak: extraRows[0].streak_count,
            knowledgeIndex: Number(extraRows[0].knowledge_index || 0),
            rank: null
          };
        }
      }
    }

    return res.json({
      leaderboard: rows.map((row, index) => ({
        id: row.id,
        name: row.name,
        xp: Number(row.xp || 0),
        coins: Number(row.coins || 0),
        streak: row.streak_count,
        knowledgeIndex: Number(row.knowledge_index || 0),
        rank: index + 1
      })),
      currentUser
    });
  } catch (error) {
    return next(error);
  }
};

module.exports = {
  listLeaderboard
};

