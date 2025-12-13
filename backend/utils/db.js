const mysql = require("mysql2/promise");
const fs = require("fs");
const path = require("path");

const {
  DB_HOST = "localhost",
  DB_PORT = "3306",
  DB_NAME = "finora_app",
  DB_USER = "root",
  DB_PASSWORD = "root"
} = process.env;

let pool;

const INITIAL_CASH = 100000;

const ensureQuestLinksForUser = async (userId) => {
  await pool.query(
    `
      INSERT INTO user_quests (user_id, quest_id, progress, completed, completed_at)
      SELECT ?, q.id, 0, 0, NULL
      FROM quests q
      ON DUPLICATE KEY UPDATE user_id = user_id
    `,
    [userId]
  );
};

const createDatabaseIfNeeded = async () => {
  const connection = await mysql.createConnection({
    host: DB_HOST,
    port: Number(DB_PORT),
    user: DB_USER,
    password: DB_PASSWORD
  });

  await connection.query(`CREATE DATABASE IF NOT EXISTS \`${DB_NAME}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;`);
  await connection.end();
};

const createTables = async () => {
  const schemaPath = path.join(__dirname, "../db/schema.sql");
  const ddl = fs.readFileSync(schemaPath, "utf8");

  const statements = ddl
    .split(/;\s*$/m)
    .map((stmt) => stmt.trim())
    .filter(Boolean);

  for (const statement of statements) {
    try {
      await pool.query(statement);
    } catch (error) {
      if (error.code === "ER_DUP_FIELDNAME" || error.code === "ER_DUP_KEYNAME" || error.code === "ER_TABLE_EXISTS_ERROR") {
        continue;
      }
      throw error;
    }
  }
};

const ensureGuestUser = async () => {
  const guestEmail = "guest@finora.app";
  const [existing] = await pool.query(
    "SELECT id FROM users WHERE email = ? LIMIT 1",
    [guestEmail]
  );

  let guestId;
  if (existing.length) {
    guestId = existing[0].id;
    await pool.query(
      `UPDATE users
       SET name = 'Guest Fin'
       WHERE id = ?`,
      [guestId]
    );
  } else {
  const [result] = await pool.query(
    `INSERT INTO users (name, email, password_hash, is_admin, xp, coins, streak_count, created_at, updated_at)
       VALUES ('Guest Fin', ?, '', 0, 0, 250, 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
    [guestEmail]
  );
    guestId = result.insertId;
  }

  await pool.query(
    `INSERT INTO simulator_accounts (user_id, cash_balance)
     VALUES (?, ?)
     ON DUPLICATE KEY UPDATE cash_balance = VALUES(cash_balance)`,
    [guestId, INITIAL_CASH]
  );

  await ensureQuestLinksForUser(guestId);

  return guestId;
};

const seedLessons = async () => {
  const lessonSeeds = [
    {
      slug: "finance-intro",
      title: "Introduction to Personal Finance",
      description: "Learn the fundamentals of budgeting, saving, and building a money plan you can stick to.",
      paragraphs: [
        "Personal finance is the practice of directing your money toward the life you want. It starts with understanding where every rupee comes from and where it goes, then using that insight to spend with intention.",
        "In this lesson you'll learn how to map your income and expenses, assign roles to every rupee through a simple budget, and build buffers that absorb surprises before they become crises.",
        "Expect practical checklists, worksheets, and reflection prompts so you finish with a starter plan that you can revisit every month."
      ],
      sections: [
        {
          heading: "Map Your Money Reality",
          content:
            "Track a full pay-cycle of inflows and outflows. Capture salaries, freelance income, EMI deductions, subscriptions, and little treats. Seeing the real picture removes the guesswork.",
          bullets: [
            "List net income sources and the dates they arrive.",
            "Categorise expenses into essentials (needs), lifestyle (wants), and future self (savings/investing).",
            "Notice automated deductions—SIPs, insurance premiums, EMIs—so they stay accounted for."
          ],
          keyTakeaway: "Awareness turns vague spending habits into numbers you can adjust deliberately."
        },
        {
          heading: "Design a Zero-Stress Budget",
          content:
            "Use a framework like 50-30-20 as a starting point—50% needs, 30% wants, 20% future savings/investing. Adjust the sliders to suit your city cost, family responsibilities, or income variability.",
          bullets: [
            "Prioritise fixed essentials (rent, groceries, transport) before lifestyle spends.",
            "Name your savings buckets—emergency fund, festival fund, travel fund—so motivation stays high.",
            "Automate transfers on payday to keep goals funded without daily decisions."
          ],
          keyTakeaway: "A personalised budget should feel like clear instructions, not a punishment."
        },
        {
          heading: "Build Safety Nets First",
          content:
            "Life throws medical bills, layoffs, and repairs without warning. A 3-6 month emergency fund in a separate savings account cushions those shocks and keeps you from high-interest debt.",
          bullets: [
            "Calculate essential monthly expenses (housing, groceries, utilities, EMIs) and multiply by 3 to start.",
            "Automate a SIP or recurring deposit so contributions happen even on busy months.",
            "Review insurance coverage—term life for dependants, health cover for hospital costs."
          ],
          keyTakeaway: "Safety nets buy you time and peace of mind to make thoughtful decisions."
        },
        {
          heading: "Create Review Rituals",
          content:
            "Money systems thrive on regular check-ins. Spend 30 minutes every week to reconcile expenses and celebrate small wins; do a deeper review monthly to tweak goals.",
          bullets: [
            "Use a simple tracker or app to tag transactions in real time.",
            "Hold a monthly money date with yourself or your partner to reset goals.",
            "Document wins and lessons so you see progress, not just restrictions."
          ],
          keyTakeaway: "Consistency beats intensity—small, frequent reviews keep your plan honest."
        }
      ],
      xp: 20,
      difficulty: 1,
      category: "Foundations",
      imageUrl: "https://images.unsplash.com/photo-1520607162513-77705c0f0d4a",
      quiz: {
        passingPercent: 70,
        questions: [
          {
            q: "What is the very first step in personal finance?",
            options: ["Understanding current income and expenses", "Taking a personal loan", "Investing in the stock market", "Buying insurance"],
            answer: 0
          },
          {
            q: "How does writing financial goals help you?",
            options: ["It keeps spending aligned with priorities", "It guarantees higher returns", "It reduces taxes automatically", "It removes the need for a budget"],
            answer: 0
          },
          {
            q: "Which budgeting split is a popular rule of thumb for beginners?",
            options: ["50/30/20", "10/20/70", "80/10/10", "25/25/50"],
            answer: 0
          }
        ]
      }
    },
    {
      slug: "banking-basics",
      title: "Understanding Banking and Accounts",
      description: "Explore the purpose of savings, current, and fixed deposit accounts and how banks calculate interest.",
      paragraphs: [
        "Banks offer different account types because our money needs change. A savings account is meant for regular use and earns modest interest, whereas current accounts are built for businesses that require frequent transactions without limits.",
        "You will learn how interest is calculated on daily balances, what minimum balance requirements mean, and why digital features like UPI, standing instructions, and auto-pay reduce late fees and manual effort.",
        "We also cover the documents needed for KYC, how to evaluate bank charges, and why linking your account to an emergency fund or recurring deposit can keep goals on track."
      ],
      xp: 25,
      difficulty: 1,
      category: "Banking",
      imageUrl: "https://images.unsplash.com/photo-1579621970795-87facc2f976d",
      quiz: {
        passingPercent: 70,
        questions: [
          {
            q: "Which account is best for everyday personal transactions?",
            options: ["Savings account", "Current account", "Escrow account", "NRE account"],
            answer: 0
          },
          {
            q: "What does the KYC process ensure when opening an account?",
            options: ["Your identity is verified and compliant with regulations", "You receive zero balance facility", "The bank waives all future charges", "You get a free credit card"],
            answer: 0
          },
          {
            q: "How can automation help your banking routine?",
            options: ["It schedules payments so bills are never missed", "It increases interest overnight", "It removes the need for budgeting", "It eliminates the requirement of KYC"],
            answer: 0
          }
        ]
      }
    },
    {
      slug: "investing-basics",
      title: "Basics of Investing",
      description: "Differentiate between stocks, mutual funds, and bonds, and learn how risk and return are connected.",
      paragraphs: [
        "Investing is using your money to buy assets that can grow in value. Equities offer growth but fluctuate, debt instruments provide stability with lower returns, and hybrid products blend the two.",
        "This lesson explains compounding, systematic investment plans, and the importance of aligning investments with time horizons. You will evaluate how much risk you can take and how diversification cushions a portfolio against shocks.",
        "We also demystify Demat accounts, expense ratios, and how to compare investments based on costs, liquidity, and tax efficiency so you can pick the right mix for your goals."
      ],
      sections: [
        {
          heading: "What Does Investing Really Mean?",
          content:
            "Investing is putting money into assets that can generate returns over time—businesses (stocks), loans (bonds), properties, or funds that pool many investors' money.",
          bullets: [
            "Equity represents ownership in a company and tends to grow with the economy.",
            "Debt instruments like bonds or fixed deposits pay regular interest with lower volatility.",
            "Mutual funds and ETFs bundle many securities, giving instant diversification."
          ],
          keyTakeaway: "Investing is a long-term engine to outpace inflation and grow wealth."
        },
        {
          heading: "Risk and Return Go Hand in Hand",
          content:
            "Higher potential return usually means higher volatility. Your investment mix should match how soon you need the money and how calm you can stay during market swings.",
          bullets: [
            "Short-term goals (0-3 years) suit safer debt or liquid funds.",
            "Medium goals (3-5 years) can add balanced or hybrid funds.",
            "Long-term goals (5+ years) benefit from equity exposure for growth."
          ],
          keyTakeaway: "Align every rupee with a goal timeline so temporary dips do not derail plans."
        },
        {
          heading: "Harness the Power of Compounding",
          content:
            "Compounding happens when returns are reinvested to earn their own returns. SIPs automate this by investing a fixed amount monthly regardless of market levels.",
          bullets: [
            "Start early—even small sums have decades to grow.",
            "Stay invested—time in the market beats timing the market.",
            "Increase SIPs annually with income hikes to accelerate growth."
          ],
          keyTakeaway: "The longer money stays invested, the more exponential its growth curve becomes."
        },
        {
          heading: "Build Your Starter Portfolio",
          content:
            "Before investing, open a Demat/brokerage account and define allocation rules. Spread money across equity index funds, short-term debt funds, and maybe gold ETFs to reduce concentration risk.",
          bullets: [
            "Use low-cost index funds for broad market exposure.",
            "Keep an emergency fund separate so you never redeem investments in panic.",
            "Review annually: rebalance to target allocation and prune underperformers."
          ],
          keyTakeaway: "A simple, diversified portfolio beats complex products you cannot monitor."
        }
      ],
      xp: 30,
      difficulty: 2,
      category: "Investing",
      imageUrl: "https://images.unsplash.com/photo-1559526324-593bc073d938",
      quiz: {
        passingPercent: 70,
        questions: [
          {
            q: "What is diversification?",
            options: ["Spreading investments across different assets", "Investing all money in one trending stock", "Keeping only cash at home", "Borrowing to invest more"],
            answer: 0
          },
          {
            q: "How does compounding work best?",
            options: ["By investing regularly over long periods", "By withdrawing gains every month", "By timing the market perfectly", "By investing only when markets fall"],
            answer: 0
          },
          {
            q: "Which instrument typically offers the highest long-term growth potential but higher volatility?",
            options: ["Equity mutual funds", "Savings accounts", "Fixed deposits", "Gold loans"],
            answer: 0
          }
        ]
      }
    },
    {
      slug: "risk-inflation",
      title: "Risk, Diversification, and Inflation",
      description: "See how inflation erodes purchasing power and why spreading investments protects wealth.",
      paragraphs: [
        "Risk is the chance that an investment turns out differently from what you expect. Market swings, credit defaults, and inflation are common risks that investors must plan for.",
        "We compare systematic risk (which affects the whole market) with unsystematic risk (specific to a company) and illustrate how asset allocation across equity, debt, gold, and cash can keep a portfolio resilient.",
        "Inflation silently reduces purchasing power each year. You will learn how to calculate real returns, why stepping up contributions is crucial, and how diversification plus periodic rebalancing builds long-term confidence."
      ],
      xp: 35,
      difficulty: 2,
      category: "Wealth Protection",
      imageUrl: "https://images.unsplash.com/photo-1454165804606-c3d57bc86b40",
      quiz: {
        passingPercent: 70,
        questions: [
          {
            q: "What happens to money during periods of high inflation?",
            options: ["Purchasing power falls", "Purchasing power rises", "Returns become risk-free", "Taxes reduce automatically"],
            answer: 0
          },
          {
            q: "Which strategy helps reduce unsystematic risk?",
            options: ["Diversifying across sectors and assets", "Investing only in one favourite stock", "Timing the market daily", "Keeping all savings in cash"],
            answer: 0
          },
          {
            q: "What is the primary goal of rebalancing a portfolio?",
            options: ["To restore the desired asset mix", "To generate instant profit", "To avoid filing taxes", "To eliminate all risk"],
            answer: 0
          }
        ]
      }
    }
  ];

  for (const lesson of lessonSeeds) {
    const paragraphs = Array.isArray(lesson.paragraphs) ? lesson.paragraphs : [];
    const body = lesson.body
      ? lesson.body
      : paragraphs.length
      ? paragraphs.join("\n\n")
      : "";
    const contentValue =
      lesson.sections && lesson.sections.length
        ? JSON.stringify(lesson.sections)
        : lesson.content
        ? lesson.content
        : body;

    await pool.query(
      `INSERT INTO lessons (slug, title, description, body, content, xp, difficulty, category, image_url)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
         title = VALUES(title),
         description = VALUES(description),
         body = VALUES(body),
         content = VALUES(content),
         xp = VALUES(xp),
         difficulty = VALUES(difficulty),
         category = VALUES(category),
         image_url = VALUES(image_url),
         updated_at = CURRENT_TIMESTAMP`,
      [
        lesson.slug,
        lesson.title,
        lesson.description,
        body,
        contentValue,
        lesson.xp,
        lesson.difficulty,
        lesson.category,
        lesson.imageUrl
      ]
    );

    if (lesson.quiz) {
      const questionsJson = JSON.stringify(lesson.quiz.questions);
      await pool.query(
        `INSERT INTO quizzes (lesson_id, questions, passing_percent)
         SELECT id, ?, ?
         FROM lessons
         WHERE slug = ?
         ON DUPLICATE KEY UPDATE
           questions = VALUES(questions),
           passing_percent = VALUES(passing_percent),
           updated_at = CURRENT_TIMESTAMP`,
        [questionsJson, lesson.quiz.passingPercent ?? 70, lesson.slug]
      );
    }
  }

  await pool.query(
    `UPDATE lessons
     SET content = body
     WHERE (content IS NULL OR content = '')`
  );
};

const seedQuests = async () => {
  const [rows] = await pool.query("SELECT COUNT(*) as count FROM quests");
  const count = rows[0].count;
  if (count > 0) return;

  const quests = [
    {
      title: "Daily Warm-Up",
      description: "Complete one lesson today to keep your streak alive.",
      reward_xp: 25,
      reward_coins: 25,
      target_type: "lessons_completed",
      target_value: 1
    },
    {
      title: "Knowledge Sprint",
      description: "Finish three lessons this week to earn bonus rewards.",
      reward_xp: 120,
      reward_coins: 120,
      target_type: "weekly_lessons",
      target_value: 3
    },
    {
      title: "Trader in Training",
      description: "Execute two simulated trades to show the Shark your skills.",
      reward_xp: 80,
      reward_coins: 80,
      target_type: "trades_completed",
      target_value: 2
    }
  ];

  const values = quests.map((quest) => [
    quest.title,
    quest.description,
    quest.reward_xp,
    quest.reward_coins,
    quest.target_type,
    quest.target_value
  ]);

  await pool.query(
    `INSERT INTO quests (title, description, reward_xp, reward_coins, target_type, target_value)
     VALUES ?
     ON DUPLICATE KEY UPDATE
       description = VALUES(description),
       reward_xp = VALUES(reward_xp),
       reward_coins = VALUES(reward_coins),
       target_type = VALUES(target_type),
       target_value = VALUES(target_value)`,
    [values]
  );
};

const seedSampleUsers = async () => {
  const sampleUsers = [
    {
      name: "Arjun M.",
      email: "demo_arjun@sampaket.app",
      xp: 840,
      coins: 960,
      streak: 12
    },
    {
      name: "Isha P.",
      email: "demo_isha@sampaket.app",
      xp: 720,
      coins: 820,
      streak: 9
    },
    {
      name: "Ravi S.",
      email: "demo_ravi@sampaket.app",
      xp: 680,
      coins: 780,
      streak: 7
    },
    {
      name: "Kiara D.",
      email: "demo_kiara@sampaket.app",
      xp: 610,
      coins: 690,
      streak: 5
    }
  ];

  for (const sample of sampleUsers) {
    const [existing] = await pool.query(
      "SELECT id FROM users WHERE email = ? LIMIT 1",
      [sample.email]
    );

    let userId;
    if (existing.length) {
      userId = existing[0].id;
      await pool.query(
        `UPDATE users
         SET name = ?, xp = ?, coins = ?, streak_count = ?
         WHERE id = ?`,
        [sample.name, sample.xp, sample.coins, sample.streak, userId]
      );
    } else {
      const [result] = await pool.query(
        `INSERT INTO users (name, email, password_hash, is_admin, xp, coins, streak_count, created_at, updated_at)
         VALUES (?, ?, '', 0, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
        [sample.name, sample.email, sample.xp, sample.coins, sample.streak]
      );
      userId = result.insertId;
    }

    await pool.query(
      `INSERT INTO simulator_accounts (user_id, cash_balance)
       VALUES (?, ?)
       ON DUPLICATE KEY UPDATE cash_balance = VALUES(cash_balance)`,
      [userId, INITIAL_CASH]
    );

    await ensureQuestLinksForUser(userId);
  }
};

const runSeed = async (fileName) => {
  const seedPath = path.join(__dirname, "../db/seeds", fileName);
  if (!fs.existsSync(seedPath)) {
    return;
  }
  const seedSql = fs.readFileSync(seedPath, "utf8");
  const statements = seedSql
    .split(/;\s*$/m)
    .map((stmt) => stmt.trim())
    .filter(Boolean);
  for (const statement of statements) {
    await pool.query(statement);
  }
};

const init = async () => {
  await createDatabaseIfNeeded();
  pool = mysql.createPool({
    host: DB_HOST,
    port: Number(DB_PORT),
    user: DB_USER,
    password: DB_PASSWORD,
    database: DB_NAME,
    waitForConnections: true,
    connectionLimit: 10,
    namedPlaceholders: true
  });

  await createTables();
  await seedLessons();
  await seedQuests();
  await runSeed("seed_loans.sql");
  await seedSampleUsers();
  const guestId = await ensureGuestUser();
  process.env.GUEST_USER_ID = String(guestId);
};

const ready = init().catch((error) => {
  console.error("[database] initialization failed", error);
  throw error;
});

const query = async (...args) => {
  await ready;
  return pool.query(...args);
};

const getConnection = async () => {
  await ready;
  return pool.getConnection();
};

module.exports = {
  query,
  getConnection,
  ready,
  pool: () => pool,
  config: {
    host: DB_HOST,
    port: Number(DB_PORT),
    database: DB_NAME,
    user: DB_USER
  }
};

