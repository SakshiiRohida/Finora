const db = require("../utils/db");

const resolveUserId = (req) => {
  if (req?.query?.userId && Number(req.query.userId) > 0) {
    return Number(req.query.userId);
  }
  const guest = Number(process.env.GUEST_USER_ID);
  return Number.isFinite(guest) ? guest : null;
};

const ensureQuestLinksForUser = async (userId) => {
  await db.query(
    `INSERT INTO user_quests (user_id, quest_id, progress, completed, completed_at)
     SELECT ?, q.id, 0, 0, NULL
     FROM quests q
     ON DUPLICATE KEY UPDATE user_id = user_id`,
    [userId]
  );
};

const listQuests = async (req, res, next) => {
  try {
    const userId = resolveUserId(req);
    if (!userId) {
      return res.json({ quests: [] });
    }

    await ensureQuestLinksForUser(userId);

    const [rows] = await db.query(
      `SELECT q.id,
              q.title,
              q.description,
              q.reward_xp,
              q.reward_coins,
              q.criteria,
              q.target_type,
              q.target_value,
              uq.progress,
              uq.completed,
              uq.completed_at
       FROM quests q
       LEFT JOIN user_quests uq ON uq.quest_id = q.id AND uq.user_id = ?
       WHERE q.active = 1
       ORDER BY q.id`,
      [userId]
    );

    return res.json({
      quests: rows.map((row) => ({
        id: row.id,
        title: row.title,
        description: row.description,
        rewardXp: row.reward_xp,
        rewardCoins: row.reward_coins,
        criteria: row.criteria ? JSON.parse(row.criteria) : null,
        target_type: row.target_type,
        target_value: row.target_value,
        progress: Number(row.progress ?? 0),
        completed: Boolean(row.completed),
        completedAt: row.completed_at
      }))
    });
  } catch (error) {
    return next(error);
  }
};

const completeQuest = async (req, res, next) => {
  try {
    const questId = Number(req.params.id);
    if (!Number.isFinite(questId)) {
      return res.status(400).json({ message: "Invalid quest id" });
    }

    const userId = resolveUserId(req);
    if (!userId) {
      return res.status(400).json({ message: "Guest user not initialised" });
    }

    const [questRows] = await db.query(`SELECT * FROM quests WHERE id = ?`, [questId]);
    if (!questRows.length) {
      return res.status(404).json({ message: "Quest not found" });
    }
    const quest = questRows[0];

    const connection = await db.getConnection();
    try {
      await connection.beginTransaction();

      await connection.query(
        `INSERT INTO user_quests (user_id, quest_id, progress, completed, completed_at)
         VALUES (?, ?, ?, 1, NOW())
         ON DUPLICATE KEY UPDATE progress = VALUES(progress), completed = VALUES(completed), completed_at = VALUES(completed_at)`
      , [userId, questId, quest.target_value ?? 1]);

      await connection.query(
        `UPDATE users SET xp = xp + ?, coins = coins + ? WHERE id = ?`,
        [quest.reward_xp, quest.reward_coins, userId]
      );

      await connection.commit();
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      await connection.release();
    }

    return res.json({
      message: "Quest completed",
      quest: {
        id: quest.id,
        title: quest.title,
        rewardXp: quest.reward_xp,
        rewardCoins: quest.reward_coins
      }
    });
  } catch (error) {
    return next(error);
  }
};

module.exports = {
  listQuests,
  completeQuest
};

