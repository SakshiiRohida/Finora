const db = require("../utils/db");
const { resolveUserId } = require("./helpers");

const parseSections = (raw) => {
  if (!raw) {
    return null;
  }

  let source = raw;
  if (typeof raw === "string") {
    try {
      source = JSON.parse(raw);
    } catch (error) {
      return null;
    }
  }

  if (!Array.isArray(source)) {
    return null;
  }

  return source
    .map((section) => {
      if (section && typeof section === "object") {
        return {
          heading: section.heading ?? section.title ?? "",
          content: section.content ?? section.body ?? "",
          bullets: Array.isArray(section.bullets) ? section.bullets : undefined,
          keyTakeaway: section.keyTakeaway ?? section.takeaway ?? undefined
        };
      }
      return null;
    })
    .filter(Boolean);
};

const listLessons = async (req, res, next) => {
  try {
    const { category } = req.query;

    let sql = `SELECT l.id,
                      l.slug,
                      l.title,
                      l.description,
                      l.body,
                      l.content,
                      l.xp,
                      l.difficulty,
                      l.category,
                      l.image_url,
                      COALESCE(q.has_quiz, 0) AS has_quiz
               FROM lessons l
               LEFT JOIN (
                 SELECT lesson_id, 1 AS has_quiz
                 FROM quizzes
                 GROUP BY lesson_id
               ) q ON q.lesson_id = l.id`;

    const params = [];
    if (category) {
      sql += " WHERE l.category = ?";
      params.push(category);
    }

    sql += " ORDER BY l.category, l.difficulty, l.id";

    const [rows] = await db.query(sql, params);

    return res.json({
      lessons: rows.map((row) => ({
        id: row.id,
        slug: row.slug,
        title: row.title,
        description: row.description,
        body: row.body || row.content || "",
        content: row.content || row.body || "",
        sections: parseSections(row.content),
        xp: row.xp,
        difficulty: row.difficulty,
        category: row.category,
        imageUrl: row.image_url,
        hasQuiz: Boolean(row.has_quiz)
      }))
    });
  } catch (error) {
    return next(error);
  }
};

const getLesson = async (req, res, next) => {
  try {
    const identifier = req.params.id;

    let lessonQuery = `SELECT id,
                              slug,
                              title,
                              description,
                              body,
                              content,
                              xp,
                              difficulty,
                              category,
                              image_url,
                              created_at,
                              updated_at
                        FROM lessons`;
    const params = [];

    if (/^\d+$/.test(identifier)) {
      lessonQuery += " WHERE id = ?";
      params.push(Number(identifier));
    } else {
      lessonQuery += " WHERE slug = ?";
      params.push(identifier);
    }

    const [lessonRows] = await db.query(lessonQuery, params);
    if (!lessonRows.length) {
      return res.status(404).json({ message: "Lesson not found" });
    }

    const lesson = lessonRows[0];
    const parsedSections = parseSections(lesson.content);

    const [quizRows] = await db.query(
      `SELECT id, questions, passing_percent
       FROM quizzes
       WHERE lesson_id = ?`,
      [lesson.id]
    );

    const quiz =
      quizRows.length > 0
        ? {
            id: quizRows[0].id,
            questions: quizRows[0].questions,
            passingPercent: quizRows[0].passing_percent
          }
        : null;

    return res.json({
      lesson: {
        id: lesson.id,
        slug: lesson.slug,
        title: lesson.title,
        description: lesson.description,
        body: lesson.body || lesson.content || "",
        content: lesson.content || lesson.body || "",
        sections: parsedSections,
        xp: lesson.xp,
        difficulty: lesson.difficulty,
        category: lesson.category,
        imageUrl: lesson.image_url,
        createdAt: lesson.created_at,
        updatedAt: lesson.updated_at,
        quiz
      }
    });
  } catch (error) {
    return next(error);
  }
};

const completeLesson = async (req, res, next) => {
  try {
    const userId = resolveUserId(req);
    if (!userId) {
      return res.status(400).json({ message: "Unknown user context" });
    }

    const identifier = req.params.id;
    let lessonWhere = "";
    const params = [];

    if (/^\d+$/.test(identifier)) {
      lessonWhere = "id = ?";
      params.push(Number(identifier));
    } else {
      lessonWhere = "slug = ?";
      params.push(identifier);
    }

    const [lessonRows] = await db.query(
      `SELECT id, xp FROM lessons WHERE ${lessonWhere} LIMIT 1`,
      params
    );

    if (!lessonRows.length) {
      return res.status(404).json({ message: "Lesson not found" });
    }

    const lesson = lessonRows[0];
    const score = Number(req.body?.score ?? 0);
    const maxScore = Number(req.body?.maxScore ?? 0);
    const scorePercent = maxScore > 0 ? Math.max(0, Math.min(100, (score / maxScore) * 100)) : 0;
    const roundedPercent = Math.round(scorePercent);
    const passed = roundedPercent >= 70;

    const rewardXp = Math.round(lesson.xp * (roundedPercent / 100));
    const rewardCoins = Math.round(Math.max(10, lesson.xp * 0.6) * (roundedPercent / 100));

    await db.query(
      `INSERT INTO user_lessons (user_id, lesson_id, completed, score, attempts, completed_at)
       VALUES (?, ?, ?, ?, 1, NOW())
       ON DUPLICATE KEY UPDATE
         completed = GREATEST(completed, VALUES(completed)),
         score = VALUES(score),
         attempts = attempts + 1,
         completed_at = NOW()`,
      [userId, lesson.id, passed ? 1 : 0, roundedPercent]
    );

    const [userRows] = await db.query(
      `SELECT xp, coins, streak_count, last_active_date
       FROM users
       WHERE id = ?
       LIMIT 1`,
      [userId]
    );

    if (!userRows.length) {
      return res.status(404).json({ message: "User not found" });
    }

    const user = userRows[0];
    const today = new Date().toISOString().slice(0, 10);
    let newStreak = user.streak_count || 0;
    let newLastActive = user.last_active_date;

    if (passed) {
      if (user.last_active_date) {
        const last = new Date(user.last_active_date);
        const current = new Date(today);
        const diffDays = Math.floor((current.getTime() - last.getTime()) / 86400000);

        if (diffDays === 0) {
          newStreak = user.streak_count || 1;
        } else if (diffDays === 1) {
          newStreak = (user.streak_count || 0) + 1;
        } else {
          newStreak = 1;
        }
      } else {
        newStreak = 1;
      }
      newLastActive = today;
    }

    await db.query(
      `UPDATE users
       SET xp = xp + ?, coins = coins + ?, streak_count = ?, last_active_date = ?
       WHERE id = ?`,
      [rewardXp, rewardCoins, newStreak, newLastActive, userId]
    );

    const [[totals]] = await db.query(
      `SELECT xp, coins, streak_count FROM users WHERE id = ? LIMIT 1`,
      [userId]
    );

    return res.json({
      lessonId: lesson.id,
      rewardXp,
      rewardCoins,
      scorePercent: Number(scorePercent.toFixed(2)),
      passed,
      totals: {
        xp: Number(totals?.xp ?? 0),
        coins: Number(totals?.coins ?? 0),
        streakCount: Number(totals?.streak_count ?? newStreak)
      }
    });
  } catch (error) {
    return next(error);
  }
};

module.exports = {
  listLessons,
  getLesson,
  completeLesson
};

