const db = require("../utils/db");

const resolveUserId = (req) => {
  if (req?.query?.userId && Number(req.query.userId) > 0) {
    return Number(req.query.userId);
  }
  const guest = Number(process.env.GUEST_USER_ID);
  return Number.isFinite(guest) ? guest : null;
};

const getProfile = async (req, res, next) => {
  try {
    const userId = resolveUserId(req);
    if (!userId) {
      return res.status(400).json({ message: "Guest profile not initialised" });
    }

    const [[user]] = await db.query(
      `SELECT id, name, email, xp, coins, streak_count, last_active_date, created_at
       FROM users
       WHERE id = ?
       LIMIT 1`,
      [userId]
    );

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const [[lessonStats]] = await db.query(
      `SELECT
          COUNT(*) AS attempts,
          SUM(completed) AS completed,
          COALESCE(ROUND(AVG(score)), 0) AS knowledge_index
        FROM user_lessons
        WHERE user_id = ?`,
      [userId]
    );

    const [[questStats]] = await db.query(
      `SELECT
          COUNT(*) AS total,
          SUM(completed) AS completed
        FROM user_quests
        WHERE user_id = ?`,
      [userId]
    );

    const [positionsRows] = await db.query(
      `SELECT symbol, shares, avg_price
       FROM simulator_positions
       WHERE user_id = ?`,
      [userId]
    );

    const [recentTrades] = await db.query(
      `SELECT symbol, side, quantity, price, executed_at
       FROM simulator_trades
       WHERE user_id = ?
       ORDER BY executed_at DESC
       LIMIT 15`,
      [userId]
    );

    return res.json({
      profile: {
        id: user.id,
        name: user.name,
        email: user.email,
        xp: Number(user.xp),
        coins: Number(user.coins),
        streak: user.streak_count,
        lastActive: user.last_active_date,
        createdAt: user.created_at,
        knowledgeIndex: Number(lessonStats?.knowledge_index ?? 0),
        lessons: {
          attempts: Number(lessonStats?.attempts ?? 0),
          completed: Number(lessonStats?.completed ?? 0)
        },
        quests: {
          total: Number(questStats?.total ?? 0),
          completed: Number(questStats?.completed ?? 0)
        },
        positions: positionsRows.map((row) => ({
          symbol: row.symbol,
          shares: Number(row.shares),
          avgPrice: Number(row.avg_price)
        }))
      },
      recentTrades: recentTrades.map((trade) => ({
        symbol: trade.symbol,
        side: trade.side,
        quantity: Number(trade.quantity),
        price: Number(trade.price),
        executedAt: trade.executed_at
      }))
    });
  } catch (error) {
    return next(error);
  }
};

module.exports = {
  getProfile
};

