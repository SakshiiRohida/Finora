-- Time Travel migration script (idempotent)
-- Run manually with:
--   mysql -u <user> -p <database> < backend/db/time_travel_migration.sql

CREATE TABLE IF NOT EXISTS time_travel_crises (
  id INT AUTO_INCREMENT PRIMARY KEY,
  slug VARCHAR(64) NOT NULL UNIQUE,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  difficulty VARCHAR(32),
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS time_travel_sessions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NULL,
  crisis_id INT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  current_date DATE NOT NULL,
  initial_cash DECIMAL(12,2) NOT NULL DEFAULT 100000.00,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

ALTER TABLE time_travel_sessions
  ADD COLUMN IF NOT EXISTS crisis_id INT NULL;

ALTER TABLE time_travel_sessions
  ADD CONSTRAINT IF NOT EXISTS fk_time_travel_sessions_user
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL;

ALTER TABLE time_travel_sessions
  ADD CONSTRAINT IF NOT EXISTS fk_time_travel_sessions_crisis
    FOREIGN KEY (crisis_id) REFERENCES time_travel_crises(id) ON DELETE SET NULL;

CREATE TABLE IF NOT EXISTS time_travel_trades (
  id INT AUTO_INCREMENT PRIMARY KEY,
  session_id INT NOT NULL,
  trade_date DATE NOT NULL,
  symbol VARCHAR(32) NOT NULL,
  quantity DECIMAL(18,4) NOT NULL,
  price DECIMAL(18,4) NOT NULL,
  side ENUM('BUY','SELL') NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

ALTER TABLE time_travel_trades
  ADD CONSTRAINT IF NOT EXISTS fk_time_travel_trades_session
    FOREIGN KEY (session_id) REFERENCES time_travel_sessions(id) ON DELETE CASCADE;

CREATE TABLE IF NOT EXISTS time_travel_context (
  id INT AUTO_INCREMENT PRIMARY KEY,
  crisis_id INT NOT NULL,
  period VARCHAR(7) NOT NULL,
  market_conditions TEXT,
  news_headlines TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY unique_crisis_period (crisis_id, period)
) ENGINE=InnoDB;

ALTER TABLE time_travel_context
  ADD CONSTRAINT IF NOT EXISTS fk_time_travel_context_crisis
    FOREIGN KEY (crisis_id) REFERENCES time_travel_crises(id) ON DELETE CASCADE;

INSERT INTO time_travel_crises (slug, title, description, difficulty, start_date, end_date)
VALUES
  ('dotcom_bubble', 'Dot-com Bubble', 'Tech valuations spike then collapse during 1998-2001.', 'Medium', '1998-01-01', '2001-12-31'),
  ('gfc_2008', '2008 Financial Crisis', 'Global credit crunch and market meltdown during 2007-2009.', 'Hard', '2007-01-01', '2009-12-31'),
  ('covid_2020', 'COVID-19 Market Crash', 'Pandemic-driven sell-off followed by stimulus-fueled recovery.', 'Medium', '2019-01-01', '2021-06-30'),
  ('inflation_2022', '2022 Inflation Shock', 'High inflation, rate hikes, and supply disruptions.', 'Hard', '2021-09-01', '2023-03-31')
ON DUPLICATE KEY UPDATE
  title = VALUES(title),
  description = VALUES(description),
  difficulty = VALUES(difficulty),
  start_date = VALUES(start_date),
  end_date = VALUES(end_date),
  updated_at = CURRENT_TIMESTAMP;
