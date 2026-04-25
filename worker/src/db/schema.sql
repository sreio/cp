-- 双色球开奖记录
CREATE TABLE IF NOT EXISTS ssq_draws (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  issue        TEXT NOT NULL UNIQUE,
  draw_date    DATE NOT NULL,
  week         TEXT,
  red_balls    TEXT NOT NULL,
  blue_ball    TEXT NOT NULL,
  pool_amount  REAL,
  sales_amount REAL,
  source       TEXT DEFAULT 'official',
  prize_details TEXT,
  created_at   DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at   DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 大乐透开奖记录
CREATE TABLE IF NOT EXISTS dlt_draws (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  issue        TEXT NOT NULL UNIQUE,
  draw_date    DATE NOT NULL,
  week         TEXT,
  front_zone   TEXT NOT NULL,
  back_zone    TEXT NOT NULL,
  pool_amount  REAL,
  sales_amount REAL,
  source       TEXT DEFAULT 'official',
  prize_details TEXT,
  created_at   DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at   DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 小盘彩 (福彩3D / 排列3 / 排列5)
CREATE TABLE IF NOT EXISTS small_draws (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  type         TEXT NOT NULL,
  issue        TEXT NOT NULL,
  draw_date    DATE NOT NULL,
  numbers      TEXT NOT NULL,
  sales_amount REAL,
  source       TEXT DEFAULT 'official',
  prize_details TEXT,
  created_at   DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at   DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(type, issue)
);

-- 奖级详情
CREATE TABLE IF NOT EXISTS prize_details (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  lottery_type    TEXT NOT NULL,
  issue           TEXT NOT NULL,
  prize_level     TEXT NOT NULL,
  prize_count     INTEGER NOT NULL DEFAULT 0,
  prize_amount    REAL,
  additional_count  INTEGER DEFAULT 0,
  additional_amount REAL,
  created_at      DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_prize_details_type_issue ON prize_details(lottery_type, issue);

-- 中奖地区
CREATE TABLE IF NOT EXISTS winning_locations (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  lottery_type TEXT NOT NULL,
  issue        TEXT NOT NULL,
  prize_level  TEXT NOT NULL,
  location     TEXT NOT NULL,
  win_count    INTEGER NOT NULL,
  win_amount   REAL,
  created_at   DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_winning_location ON winning_locations(lottery_type, issue);
CREATE INDEX IF NOT EXISTS idx_winning_prize ON winning_locations(lottery_type, issue, prize_level);

-- Webhook 配置
CREATE TABLE IF NOT EXISTS webhooks (
  id        INTEGER PRIMARY KEY AUTOINCREMENT,
  name      TEXT NOT NULL,
  type      TEXT NOT NULL,
  url       TEXT NOT NULL,
  secret    TEXT,
  enabled   INTEGER DEFAULT 1,
  events    TEXT DEFAULT '["draw.new"]',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 配置表
CREATE TABLE IF NOT EXISTS config (
  key   TEXT PRIMARY KEY,
  value TEXT NOT NULL
);
