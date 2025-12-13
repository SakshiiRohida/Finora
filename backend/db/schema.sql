-- Sampaket schema adjustments (MySQL / MariaDB flavour)

-- Users table (ensure baseline columns exist)
CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL DEFAULT '',
  xp INT NOT NULL DEFAULT 0,
  coins DECIMAL(18,2) NOT NULL DEFAULT 0,
  streak_count INT NOT NULL DEFAULT 0,
  last_active_date DATE NULL,
  is_admin TINYINT(1) NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Lessons catalogue
CREATE TABLE IF NOT EXISTS lessons (
  id INT AUTO_INCREMENT PRIMARY KEY,
  slug VARCHAR(150) NOT NULL UNIQUE,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  body MEDIUMTEXT NOT NULL,
  content MEDIUMTEXT NULL,
  xp INT NOT NULL DEFAULT 10,
  difficulty TINYINT NOT NULL DEFAULT 1,
  category VARCHAR(100) NOT NULL,
  image_url TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

ALTER TABLE lessons
  ADD COLUMN description TEXT AFTER title;
ALTER TABLE lessons
  ADD COLUMN content MEDIUMTEXT AFTER body;
ALTER TABLE lessons
  ADD COLUMN image_url TEXT AFTER category;
ALTER TABLE lessons
  ADD COLUMN updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP;

-- Quizzes linked to lessons (JSON per lesson)
CREATE TABLE IF NOT EXISTS quizzes (
  id INT AUTO_INCREMENT PRIMARY KEY,
  lesson_id INT NOT NULL,
  questions JSON NOT NULL,
  passing_percent INT NOT NULL DEFAULT 70,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_quizzes_lesson FOREIGN KEY (lesson_id) REFERENCES lessons(id) ON DELETE CASCADE
);

CREATE UNIQUE INDEX unique_quiz_lesson ON quizzes (lesson_id);

-- User progress on lessons/quizzes
CREATE TABLE IF NOT EXISTS user_lessons (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  lesson_id INT NOT NULL,
  completed TINYINT(1) NOT NULL DEFAULT 0,
  score INT NULL,
  attempts INT NOT NULL DEFAULT 0,
  completed_at DATETIME NULL,
  UNIQUE KEY unique_user_lesson (user_id, lesson_id),
  CONSTRAINT fk_user_lessons_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_user_lessons_lesson FOREIGN KEY (lesson_id) REFERENCES lessons(id) ON DELETE CASCADE
);

-- Quests catalogue
CREATE TABLE IF NOT EXISTS quests (
  id INT AUTO_INCREMENT PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  description TEXT NOT NULL,
  reward_xp INT NOT NULL DEFAULT 0,
  reward_coins INT NOT NULL DEFAULT 0,
  target_type VARCHAR(64) NOT NULL DEFAULT 'custom',
  target_value INT NOT NULL DEFAULT 0,
  criteria JSON,
  active TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

ALTER TABLE quests
  ADD COLUMN target_type VARCHAR(64) NOT NULL DEFAULT 'custom' AFTER reward_coins;
ALTER TABLE quests
  ADD COLUMN target_value INT NOT NULL DEFAULT 0 AFTER target_type;
ALTER TABLE quests
  ADD COLUMN criteria JSON AFTER target_value;

-- Per-user quest progress
CREATE TABLE IF NOT EXISTS user_quests (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  quest_id INT NOT NULL,
  progress INT NOT NULL DEFAULT 0,
  completed TINYINT(1) NOT NULL DEFAULT 0,
  completed_at DATETIME NULL,
  UNIQUE KEY unique_user_quest (user_id, quest_id),
  CONSTRAINT fk_user_quests_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_user_quests_quest FOREIGN KEY (quest_id) REFERENCES quests(id) ON DELETE CASCADE
);

-- Simulator account (virtual cash, P/L)
CREATE TABLE IF NOT EXISTS simulator_accounts (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL UNIQUE,
  cash_balance DECIMAL(18,2) NOT NULL DEFAULT 100000,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Open holdings
CREATE TABLE IF NOT EXISTS simulator_positions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  symbol VARCHAR(32) NOT NULL,
  shares DECIMAL(18,4) NOT NULL DEFAULT 0,
  avg_price DECIMAL(18,4) NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY unique_position (user_id, symbol),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Trade history
CREATE TABLE IF NOT EXISTS simulator_trades (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  symbol VARCHAR(32) NOT NULL,
  side ENUM('BUY','SELL') NOT NULL,
  quantity DECIMAL(18,4) NOT NULL,
  price DECIMAL(18,4) NOT NULL,
  executed_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_trades_user_date (user_id, executed_at)
);

-- Leaderboard snapshots for historical rankings
CREATE TABLE IF NOT EXISTS leaderboard_snapshots (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  coins DECIMAL(18,2) NOT NULL,
  xp INT NOT NULL,
  streak INT NOT NULL,
  rank_position INT NOT NULL DEFAULT 0,
  snapshot_date DATE NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY unique_snapshot (user_id, snapshot_date),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS time_travel_sessions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NULL,
  crisis_id VARCHAR(64) NULL,
  `start_date` DATE NOT NULL,
  `end_date` DATE NOT NULL,
  `current_date` DATE NOT NULL,
  initial_cash DECIMAL(12,2) NOT NULL DEFAULT 100000.00,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_time_travel_sessions_user
    FOREIGN KEY (user_id) REFERENCES users(id)
      ON DELETE SET NULL
);

ALTER TABLE time_travel_sessions
  ADD COLUMN crisis_id VARCHAR(64) NULL AFTER user_id;

CREATE TABLE IF NOT EXISTS time_travel_trades (
  id INT AUTO_INCREMENT PRIMARY KEY,
  session_id INT NOT NULL,
  trade_date DATE NOT NULL,
  symbol VARCHAR(20) NOT NULL,
  quantity INT NOT NULL,
  price DECIMAL(12,4) NOT NULL,
  type ENUM('BUY','SELL') NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_time_travel_trades_session
    FOREIGN KEY (session_id) REFERENCES time_travel_sessions(id)
      ON DELETE CASCADE
);

