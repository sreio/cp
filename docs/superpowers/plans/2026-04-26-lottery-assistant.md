# 彩票助手 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a lottery information query and analysis tool supporting SSQ, DLT, FC3D, PL3/5, deployed on Cloudflare free tier.

**Architecture:** Vue 3 + Vite frontend on Cloudflare Pages, Hono backend on Cloudflare Worker, D1 database with SQLite adapter for local dev. Data flows from official/third-party APIs through adapter pattern into D1, with webhook notifications on new draws.

**Tech Stack:** Vue 3, Vite, Hono, Cloudflare Worker, Cloudflare D1, SQLite (better-sqlite3 for dev), ECharts, TypeScript

---

## Phase 1: Project Scaffolding & Database

### Task 1: Initialize workspace and backend project

**Files:**
- Create: `package.json` (root workspace)
- Create: `worker/package.json`
- Create: `worker/tsconfig.json`
- Create: `worker/wrangler.toml`
- Create: `worker/src/index.ts`

- [ ] **Step 1: Create root workspace `package.json`**

```json
{
  "name": "cp",
  "private": true,
  "workspaces": ["worker", "frontend"],
  "scripts": {
    "dev:worker": "cd worker && npm run dev",
    "dev:frontend": "cd frontend && npm run dev",
    "deploy": "cd worker && npm run deploy"
  }
}
```

- [ ] **Step 2: Create `worker/package.json`**

```json
{
  "name": "cp-worker",
  "private": true,
  "scripts": {
    "dev": "wrangler dev",
    "deploy": "wrangler deploy",
    "test": "vitest run",
    "db:migrate": "wrangler d1 execute cp-lottery --local --file=./src/db/schema.sql"
  },
  "dependencies": {
    "hono": "^4.4.0"
  },
  "devDependencies": {
    "@cloudflare/workers-types": "^4.20240614.0",
    "better-sqlite3": "^11.0.0",
    "typescript": "^5.5.0",
    "vitest": "^2.0.0",
    "wrangler": "^3.60.0"
  }
}
```

- [ ] **Step 3: Create `worker/tsconfig.json`**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "strict": true,
    "lib": ["ES2022"],
    "types": ["@cloudflare/workers-types"],
    "jsx": "react-jsx",
    "jsxImportSource": "hono/jsx",
    "outDir": "dist",
    "rootDir": "src"
  },
  "include": ["src/**/*.ts"],
  "exclude": ["node_modules", "dist"]
}
```

- [ ] **Step 4: Create `worker/wrangler.toml`**

```toml
name = "cp-worker"
main = "src/index.ts"
compatibility_date = "2024-06-14"

[vars]
ENVIRONMENT = "production"

[[d1_databases]]
binding = "DB"
database_name = "cp-lottery"
database_id = "placeholder-will-be-created"

[triggers]
crons = [
  "30 13 * * 0,2,4",  # 双色球 周二四日 21:30 CST = 13:30 UTC
  "25 13 * * 1,3,5",  # 大乐透 周一三六 21:25 CST = 13:25 UTC
  "15 13 * * *",       # 福彩3D/排列3/5 每日 21:15 CST = 13:15 UTC
]
```

- [ ] **Step 5: Create minimal `worker/src/index.ts`**

```typescript
import { Hono } from 'hono';

type Bindings = {
  DB: D1Database;
  ENVIRONMENT: string;
};

const app = new Hono<{ Bindings: Bindings }>();

app.get('/api/health', (c) => c.json({ status: 'ok' }));

export default app;
```

- [ ] **Step 6: Install dependencies and verify**

```bash
cd /Users/weidada/ai/cp/worker && npm install
```

Expected: node_modules created, no errors.

- [ ] **Step 7: Commit**

```bash
git add package.json worker/package.json worker/tsconfig.json worker/wrangler.toml worker/src/index.ts
git commit -m "feat: initialize workspace and worker project"
```

---

### Task 2: Database schema and adapter

**Files:**
- Create: `worker/src/db/schema.sql`
- Create: `worker/src/db/types.ts`
- Create: `worker/src/db/adapter.ts`
- Create: `worker/src/db/d1-adapter.ts`
- Create: `worker/src/db/sqlite-adapter.ts`
- Create: `worker/src/db/index.ts`
- Create: `worker/src/db/__tests__/adapter.test.ts`

- [ ] **Step 1: Create `worker/src/db/schema.sql`**

```sql
-- 双色球开奖记录
CREATE TABLE IF NOT EXISTS ssq_draws (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  issue        TEXT NOT NULL UNIQUE,
  draw_date    DATE NOT NULL,
  week         TEXT,
  red_balls    TEXT NOT NULL,          -- "[01,02,03,04,05,06]"
  blue_ball    TEXT NOT NULL,
  pool_amount  REAL,
  sales_amount REAL,
  source       TEXT DEFAULT 'official', -- official | third_party | manual
  prize_details TEXT,                   -- JSON
  created_at   DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at   DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 大乐透开奖记录
CREATE TABLE IF NOT EXISTS dlt_draws (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  issue        TEXT NOT NULL UNIQUE,
  draw_date    DATE NOT NULL,
  week         TEXT,
  front_zone   TEXT NOT NULL,           -- "[01,02,03,04,05]"
  back_zone    TEXT NOT NULL,           -- "[01,02]"
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
  type         TEXT NOT NULL,           -- fc3d | pl3 | pl5
  issue        TEXT NOT NULL,
  draw_date    DATE NOT NULL,
  numbers      TEXT NOT NULL,           -- "[1,2,3]" or "[1,2,3,4,5]"
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
  lottery_type    TEXT NOT NULL,          -- ssq | dlt | fc3d | pl3 | pl5
  issue           TEXT NOT NULL,
  prize_level     TEXT NOT NULL,          -- "一等奖"
  prize_count     INTEGER NOT NULL DEFAULT 0,
  prize_amount    REAL,
  additional_count  INTEGER DEFAULT 0,   -- 追加注数
  additional_amount REAL,                -- 追加单注奖金
  created_at      DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_prize_details_type_issue ON prize_details(lottery_type, issue);

-- 中奖地区
CREATE TABLE IF NOT EXISTS winning_locations (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  lottery_type TEXT NOT NULL,
  issue        TEXT NOT NULL,
  prize_level  TEXT NOT NULL,
  location     TEXT NOT NULL,            -- "北京"
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
  type      TEXT NOT NULL,              -- dingtalk | wechat | feishu | generic
  url       TEXT NOT NULL,
  secret    TEXT,
  enabled   INTEGER DEFAULT 1,
  events    TEXT DEFAULT '["draw.new"]', -- JSON array
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 配置表
CREATE TABLE IF NOT EXISTS config (
  key   TEXT PRIMARY KEY,
  value TEXT NOT NULL                   -- JSON
);
```

- [ ] **Step 2: Create `worker/src/db/types.ts`**

```typescript
export type LotteryType = 'ssq' | 'dlt' | 'fc3d' | 'pl3' | 'pl5';
export type DataSource = 'official' | 'third_party' | 'manual';

export interface SSQDraw {
  id: number;
  issue: string;
  draw_date: string;
  week: string | null;
  red_balls: string;       // JSON "[01,02,...]"
  blue_ball: string;
  pool_amount: number | null;
  sales_amount: number | null;
  source: DataSource;
  prize_details: string | null; // JSON
  created_at: string;
  updated_at: string;
}

export interface DLTDraw {
  id: number;
  issue: string;
  draw_date: string;
  week: string | null;
  front_zone: string;      // JSON "[01,02,...]"
  back_zone: string;       // JSON "[01,02]"
  pool_amount: number | null;
  sales_amount: number | null;
  source: DataSource;
  prize_details: string | null;
  created_at: string;
  updated_at: string;
}

export interface SmallDraw {
  id: number;
  type: LotteryType;
  issue: string;
  draw_date: string;
  numbers: string;         // JSON "[1,2,3]"
  sales_amount: number | null;
  source: DataSource;
  prize_details: string | null;
  created_at: string;
  updated_at: string;
}

export interface PrizeDetail {
  id: number;
  lottery_type: LotteryType;
  issue: string;
  prize_level: string;
  prize_count: number;
  prize_amount: number | null;
  additional_count: number;
  additional_amount: number | null;
  created_at: string;
}

export interface WinningLocation {
  id: number;
  lottery_type: LotteryType;
  issue: string;
  prize_level: string;
  location: string;
  win_count: number;
  win_amount: number | null;
  created_at: string;
}

export interface Webhook {
  id: number;
  name: string;
  type: 'dingtalk' | 'wechat' | 'feishu' | 'generic';
  url: string;
  secret: string | null;
  enabled: number;
  events: string;
  created_at: string;
  updated_at: string;
}

export interface PrizeLevel {
  level: string;
  front_match: number;
  back_match: number;
  description: string;
  prize_pool_under_800m: string | number;
  prize_pool_over_800m: string | number;
}
```

- [ ] **Step 3: Create `worker/src/db/adapter.ts`**

```typescript
import type { SSQDraw, DLTDraw, SmallDraw, PrizeDetail, WinningLocation, Webhook, LotteryType, DataSource } from './types';

export interface DatabaseAdapter {
  // 开奖数据 - 双色球
  getSSQLatest(): Promise<SSQDraw | null>;
  getSSQHistory(page: number, size: number): Promise<{ data: SSQDraw[]; total: number }>;
  getSSQByIssue(issue: string): Promise<SSQDraw | null>;
  insertSSQDraw(draw: Omit<SSQDraw, 'id' | 'created_at' | 'updated_at'>): Promise<void>;
  updateSSQDraw(issue: string, draw: Partial<SSQDraw>): Promise<void>;

  // 开奖数据 - 大乐透
  getDLTLatest(): Promise<DLTDraw | null>;
  getDLTHistory(page: number, size: number): Promise<{ data: DLTDraw[]; total: number }>;
  getDLTByIssue(issue: string): Promise<DLTDraw | null>;
  insertDLTDraw(draw: Omit<DLTDraw, 'id' | 'created_at' | 'updated_at'>): Promise<void>;
  updateDLTDraw(issue: string, draw: Partial<DLTDraw>): Promise<void>;

  // 开奖数据 - 小盘彩
  getSmallLatest(type: LotteryType): Promise<SmallDraw | null>;
  getSmallHistory(type: LotteryType, page: number, size: number): Promise<{ data: SmallDraw[]; total: number }>;
  getSmallByIssue(type: LotteryType, issue: string): Promise<SmallDraw | null>;
  insertSmallDraw(draw: Omit<SmallDraw, 'id' | 'created_at' | 'updated_at'>): Promise<void>;

  // 奖级详情
  getPrizeDetails(lottery_type: LotteryType, issue: string): Promise<PrizeDetail[]>;
  insertPrizeDetail(detail: Omit<PrizeDetail, 'id' | 'created_at'>): Promise<void>;

  // 中奖地区
  getWinningLocations(lottery_type: LotteryType, issue: string): Promise<WinningLocation[]>;
  insertWinningLocation(loc: Omit<WinningLocation, 'id' | 'created_at'>): Promise<void>;

  // 通用查询（用于分析）
  getDrawsForAnalysis(lottery_type: LotteryType, range: number): Promise<(SSQDraw | DLTDraw | SmallDraw)[]>;

  // 数据存在性检查
  checkDrawExists(lottery_type: LotteryType, issues: string[]): Promise<{ issue: string; source: string; draw_date: string }[]>;

  // Webhook
  getWebhooks(): Promise<Webhook[]>;
  getWebhookById(id: number): Promise<Webhook | null>;
  createWebhook(webhook: Omit<Webhook, 'id' | 'created_at' | 'updated_at'>): Promise<number>;
  updateWebhook(id: number, webhook: Partial<Webhook>): Promise<void>;
  deleteWebhook(id: number): Promise<void>;
}
```

- [ ] **Step 4: Create `worker/src/db/d1-adapter.ts`**

```typescript
import type { DatabaseAdapter } from './adapter';
import type { SSQDraw, DLTDraw, SmallDraw, PrizeDetail, WinningLocation, Webhook, LotteryType, DataSource } from './types';

export class D1Adapter implements DatabaseAdapter {
  constructor(private db: D1Database) {}

  private async first<T>(stmt: D1PreparedStatement): Promise<T | null> {
    const result = await stmt.first<T>();
    return result ?? null;
  }

  private async all<T>(stmt: D1PreparedStatement): Promise<T[]> {
    const result = await stmt.all<T>();
    return result.results;
  }

  // --- 双色球 ---
  async getSSQLatest(): Promise<SSQDraw | null> {
    return this.first<SSQDraw>(this.db.prepare('SELECT * FROM ssq_draws ORDER BY draw_date DESC LIMIT 1'));
  }

  async getSSQHistory(page: number, size: number) {
    const offset = (page - 1) * size;
    const total = await this.first<{ count: number }>(this.db.prepare('SELECT COUNT(*) as count FROM ssq_draws'));
    const data = await this.all<SSQDraw>(this.db.prepare('SELECT * FROM ssq_draws ORDER BY draw_date DESC LIMIT ? OFFSET ?').bind(size, offset));
    return { data, total: total?.count ?? 0 };
  }

  async getSSQByIssue(issue: string) {
    return this.first<SSQDraw>(this.db.prepare('SELECT * FROM ssq_draws WHERE issue = ?').bind(issue));
  }

  async insertSSQDraw(draw: Omit<SSQDraw, 'id' | 'created_at' | 'updated_at'>) {
    await this.db.prepare(
      'INSERT OR IGNORE INTO ssq_draws (issue, draw_date, week, red_balls, blue_ball, pool_amount, sales_amount, source, prize_details) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)'
    ).bind(draw.issue, draw.draw_date, draw.week, draw.red_balls, draw.blue_ball, draw.pool_amount, draw.sales_amount, draw.source, draw.prize_details).run();
  }

  async updateSSQDraw(issue: string, draw: Partial<SSQDraw>) {
    const fields: string[] = [];
    const values: unknown[] = [];
    for (const [key, val] of Object.entries(draw)) {
      if (val !== undefined && key !== 'id' && key !== 'created_at') {
        fields.push(`${key} = ?`);
        values.push(val);
      }
    }
    fields.push('updated_at = CURRENT_TIMESTAMP');
    values.push(issue);
    await this.db.prepare(`UPDATE ssq_draws SET ${fields.join(', ')} WHERE issue = ?`).bind(...values).run();
  }

  // --- 大乐透 ---
  async getDLTLatest(): Promise<DLTDraw | null> {
    return this.first<DLTDraw>(this.db.prepare('SELECT * FROM dlt_draws ORDER BY draw_date DESC LIMIT 1'));
  }

  async getDLTHistory(page: number, size: number) {
    const offset = (page - 1) * size;
    const total = await this.first<{ count: number }>(this.db.prepare('SELECT COUNT(*) as count FROM dlt_draws'));
    const data = await this.all<DLTDraw>(this.db.prepare('SELECT * FROM dlt_draws ORDER BY draw_date DESC LIMIT ? OFFSET ?').bind(size, offset));
    return { data, total: total?.count ?? 0 };
  }

  async getDLTByIssue(issue: string) {
    return this.first<DLTDraw>(this.db.prepare('SELECT * FROM dlt_draws WHERE issue = ?').bind(issue));
  }

  async insertDLTDraw(draw: Omit<DLTDraw, 'id' | 'created_at' | 'updated_at'>) {
    await this.db.prepare(
      'INSERT OR IGNORE INTO dlt_draws (issue, draw_date, week, front_zone, back_zone, pool_amount, sales_amount, source, prize_details) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)'
    ).bind(draw.issue, draw.draw_date, draw.week, draw.front_zone, draw.back_zone, draw.pool_amount, draw.sales_amount, draw.source, draw.prize_details).run();
  }

  async updateDLTDraw(issue: string, draw: Partial<DLTDraw>) {
    const fields: string[] = [];
    const values: unknown[] = [];
    for (const [key, val] of Object.entries(draw)) {
      if (val !== undefined && key !== 'id' && key !== 'created_at') {
        fields.push(`${key} = ?`);
        values.push(val);
      }
    }
    fields.push('updated_at = CURRENT_TIMESTAMP');
    values.push(issue);
    await this.db.prepare(`UPDATE dlt_draws SET ${fields.join(', ')} WHERE issue = ?`).bind(...values).run();
  }

  // --- 小盘彩 ---
  async getSmallLatest(type: LotteryType): Promise<SmallDraw | null> {
    return this.first<SmallDraw>(this.db.prepare('SELECT * FROM small_draws WHERE type = ? ORDER BY draw_date DESC LIMIT 1').bind(type));
  }

  async getSmallHistory(type: LotteryType, page: number, size: number) {
    const offset = (page - 1) * size;
    const total = await this.first<{ count: number }>(this.db.prepare('SELECT COUNT(*) as count FROM small_draws WHERE type = ?').bind(type));
    const data = await this.all<SmallDraw>(this.db.prepare('SELECT * FROM small_draws WHERE type = ? ORDER BY draw_date DESC LIMIT ? OFFSET ?').bind(type, size, offset));
    return { data, total: total?.count ?? 0 };
  }

  async getSmallByIssue(type: LotteryType, issue: string) {
    return this.first<SmallDraw>(this.db.prepare('SELECT * FROM small_draws WHERE type = ? AND issue = ?').bind(type, issue));
  }

  async insertSmallDraw(draw: Omit<SmallDraw, 'id' | 'created_at' | 'updated_at'>) {
    await this.db.prepare(
      'INSERT OR IGNORE INTO small_draws (type, issue, draw_date, numbers, sales_amount, source, prize_details) VALUES (?, ?, ?, ?, ?, ?, ?)'
    ).bind(draw.type, draw.issue, draw.draw_date, draw.numbers, draw.sales_amount, draw.source, draw.prize_details).run();
  }

  // --- 奖级详情 ---
  async getPrizeDetails(lottery_type: LotteryType, issue: string) {
    return this.all<PrizeDetail>(this.db.prepare('SELECT * FROM prize_details WHERE lottery_type = ? AND issue = ?').bind(lottery_type, issue));
  }

  async insertPrizeDetail(detail: Omit<PrizeDetail, 'id' | 'created_at'>) {
    await this.db.prepare(
      'INSERT INTO prize_details (lottery_type, issue, prize_level, prize_count, prize_amount, additional_count, additional_amount) VALUES (?, ?, ?, ?, ?, ?, ?)'
    ).bind(detail.lottery_type, detail.issue, detail.prize_level, detail.prize_count, detail.prize_amount, detail.additional_count, detail.additional_amount).run();
  }

  // --- 中奖地区 ---
  async getWinningLocations(lottery_type: LotteryType, issue: string) {
    return this.all<WinningLocation>(this.db.prepare('SELECT * FROM winning_locations WHERE lottery_type = ? AND issue = ?').bind(lottery_type, issue));
  }

  async insertWinningLocation(loc: Omit<WinningLocation, 'id' | 'created_at'>) {
    await this.db.prepare(
      'INSERT INTO winning_locations (lottery_type, issue, prize_level, location, win_count, win_amount) VALUES (?, ?, ?, ?, ?, ?)'
    ).bind(loc.lottery_type, loc.issue, loc.prize_level, loc.location, loc.win_count, loc.win_amount).run();
  }

  // --- 通用查询 ---
  async getDrawsForAnalysis(lottery_type: LotteryType, range: number) {
    const table = lottery_type === 'ssq' ? 'ssq_draws' : lottery_type === 'dlt' ? 'dlt_draws' : 'small_draws';
    const where = lottery_type === 'fc3d' || lottery_type === 'pl3' || lottery_type === 'pl5' ? 'WHERE type = ?' : '';
    const params = where ? [lottery_type, range] : [range];
    const sql = `SELECT * FROM ${table} ${where} ORDER BY draw_date DESC LIMIT ?`;
    return this.all(sql).bind(...params);
  }

  // --- 数据存在性检查 ---
  async checkDrawExists(lottery_type: LotteryType, issues: string[]) {
    const table = lottery_type === 'ssq' ? 'ssq_draws' : lottery_type === 'dlt' ? 'dlt_draws' : 'small_draws';
    const placeholders = issues.map(() => '?').join(',');
    const where = lottery_type === 'fc3d' || lottery_type === 'pl3' || lottery_type === 'pl5'
      ? `WHERE type = ? AND issue IN (${placeholders})`
      : `WHERE issue IN (${placeholders})`;
    const params = lottery_type === 'fc3d' || lottery_type === 'pl3' || lottery_type === 'pl5'
      ? [lottery_type, ...issues]
      : [...issues];
    return this.all<{ issue: string; source: string; draw_date: string }>(
      this.db.prepare(`SELECT issue, source, draw_date FROM ${table} ${where}`).bind(...params)
    );
  }

  // --- Webhook ---
  async getWebhooks() {
    return this.all<Webhook>(this.db.prepare('SELECT * FROM webhooks ORDER BY created_at DESC'));
  }

  async getWebhookById(id: number) {
    return this.first<Webhook>(this.db.prepare('SELECT * FROM webhooks WHERE id = ?').bind(id));
  }

  async createWebhook(webhook: Omit<Webhook, 'id' | 'created_at' | 'updated_at'>) {
    const result = await this.db.prepare(
      'INSERT INTO webhooks (name, type, url, secret, enabled, events) VALUES (?, ?, ?, ?, ?, ?)'
    ).bind(webhook.name, webhook.type, webhook.url, webhook.secret, webhook.enabled, webhook.events).run();
    return result.meta.last_row_id as number;
  }

  async updateWebhook(id: number, webhook: Partial<Webhook>) {
    const fields: string[] = [];
    const values: unknown[] = [];
    for (const [key, val] of Object.entries(webhook)) {
      if (val !== undefined && key !== 'id' && key !== 'created_at') {
        fields.push(`${key} = ?`);
        values.push(val);
      }
    }
    fields.push('updated_at = CURRENT_TIMESTAMP');
    values.push(id);
    await this.db.prepare(`UPDATE webhooks SET ${fields.join(', ')} WHERE id = ?`).bind(...values).run();
  }

  async deleteWebhook(id: number) {
    await this.db.prepare('DELETE FROM webhooks WHERE id = ?').bind(id).run();
  }
}
```

- [ ] **Step 5: Create `worker/src/db/sqlite-adapter.ts`**

```typescript
import Database from 'better-sqlite3';
import { D1Adapter } from './d1-adapter';

// better-sqlite3 wrapper that mimics D1Database interface for local dev
class SQLiteD1Compat {
  private db: Database.Database;

  constructor(path: string) {
    this.db = new Database(path);
    this.db.pragma('journal_mode = WAL');
  }

  prepare(sql: string) {
    const stmt = this.db.prepare(sql);
    let boundParams: unknown[] = [];

    const chain = {
      bind(...params: unknown[]) {
        boundParams = params;
        return chain;
      },
      async first<T>(): Promise<T | null> {
        try {
          const row = stmt.get(...boundParams) as T | undefined;
          return row ?? null;
        } catch {
          return null;
        }
      },
      async all<T>(): Promise<{ results: T[] }> {
        try {
          const rows = stmt.all(...boundParams) as T[];
          return { results: rows };
        } catch {
          return { results: [] };
        }
      },
      async run() {
        const info = stmt.run(...boundParams);
        return { meta: { last_row_id: info.lastInsertRowid } };
      },
    };
    return chain;
  }
}

// For local dev, use D1Adapter with SQLite compat wrapper
export function createSQLiteAdapter(path: string) {
  const db = new SQLiteD1Compat(path) as unknown as D1Database;
  return new D1Adapter(db);
}
```

- [ ] **Step 6: Create `worker/src/db/index.ts`**

```typescript
export { D1Adapter } from './d1-adapter';
export { createSQLiteAdapter } from './sqlite-adapter';
export type { DatabaseAdapter } from './adapter';
export type * from './types';
```

- [ ] **Step 7: Commit**

```bash
git add worker/src/db/
git commit -m "feat: add database schema, types, and D1/SQLite adapters"
```

---

### Task 3: Test database adapter with unit tests

**Files:**
- Create: `worker/vitest.config.ts`
- Create: `worker/src/db/__tests__/adapter.test.ts`

- [ ] **Step 1: Create `worker/vitest.config.ts`**

```typescript
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
});
```

- [ ] **Step 2: Create `worker/src/db/__tests__/adapter.test.ts`**

```typescript
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import Database from 'better-sqlite3';
import { D1Adapter } from '../d1-adapter';
import { readFileSync } from 'fs';
import { resolve } from 'path';

// D1-compatible wrapper for better-sqlite3
class TestD1 {
  private db: Database.Database;
  constructor(db: Database.Database) { this.db = db; }
  prepare(sql: string) {
    const stmt = this.db.prepare(sql);
    let params: unknown[] = [];
    return {
      bind(...p: unknown[]) { params = p; return this; },
      async first<T>() { try { return stmt.get(...params) as T ?? null; } catch { return null; } },
      async all<T>() { try { return { results: stmt.all(...params) as T[] }; } catch { return { results: [] }; } },
      async run() { const info = stmt.run(...params); return { meta: { last_row_id: info.lastInsertRowid } }; },
    };
  }
}

describe('D1Adapter', () => {
  let adapter: D1Adapter;
  let db: Database.Database;

  beforeAll(() => {
    db = new Database(':memory:');
    const schema = readFileSync(resolve(__dirname, '../schema.sql'), 'utf-8');
    db.exec(schema);
    adapter = new D1Adapter(new TestD1(db) as unknown as D1Database);
  });

  afterAll(() => {
    db.close();
  });

  describe('SSQ draws', () => {
    it('should insert and retrieve SSQ draw', async () => {
      await adapter.insertSSQDraw({
        issue: '2024001',
        draw_date: '2024-01-02',
        week: '二',
        red_balls: '["01","02","03","04","05","06"]',
        blue_ball: '07',
        pool_amount: 2000000000,
        sales_amount: 388000000,
        source: 'official',
        prize_details: null,
      });

      const draw = await adapter.getSSQByIssue('2024001');
      expect(draw).not.toBeNull();
      expect(draw!.issue).toBe('2024001');
      expect(draw!.red_balls).toBe('["01","02","03","04","05","06"]');
      expect(draw!.blue_ball).toBe('07');
    });

    it('should get latest SSQ draw', async () => {
      await adapter.insertSSQDraw({
        issue: '2024002',
        draw_date: '2024-01-04',
        week: '四',
        red_balls: '["10","11","12","13","14","15"]',
        blue_ball: '16',
        pool_amount: 2100000000,
        sales_amount: 400000000,
        source: 'official',
        prize_details: null,
      });

      const latest = await adapter.getSSQLatest();
      expect(latest!.issue).toBe('2024002');
    });

    it('should get SSQ history with pagination', async () => {
      const result = await adapter.getSSQHistory(1, 10);
      expect(result.data.length).toBe(2);
      expect(result.total).toBe(2);
    });

    it('should update SSQ draw', async () => {
      await adapter.updateSSQDraw('2024001', { pool_amount: 2500000000 });
      const draw = await adapter.getSSQByIssue('2024001');
      expect(draw!.pool_amount).toBe(2500000000);
    });
  });

  describe('DLT draws', () => {
    it('should insert and retrieve DLT draw', async () => {
      await adapter.insertDLTDraw({
        issue: '24001',
        draw_date: '2024-01-01',
        week: '一',
        front_zone: '["01","02","03","04","05"]',
        back_zone: '["01","02"]',
        pool_amount: 1000000000,
        sales_amount: 300000000,
        source: 'official',
        prize_details: null,
      });

      const draw = await adapter.getDLTByIssue('24001');
      expect(draw).not.toBeNull();
      expect(draw!.front_zone).toBe('["01","02","03","04","05"]');
    });
  });

  describe('Small draws', () => {
    it('should insert and retrieve FC3D draw', async () => {
      await adapter.insertSmallDraw({
        type: 'fc3d',
        issue: '2024001',
        draw_date: '2024-01-01',
        numbers: '[1,2,3]',
        sales_amount: 50000000,
        source: 'official',
        prize_details: null,
      });

      const draw = await adapter.getSmallByIssue('fc3d', '2024001');
      expect(draw).not.toBeNull();
      expect(draw!.numbers).toBe('[1,2,3]');
    });
  });

  describe('checkDrawExists', () => {
    it('should return existing draws', async () => {
      const result = await adapter.checkDrawExists('ssq', ['2024001', '2024002', '2024999']);
      expect(result.length).toBe(2);
      expect(result.map(r => r.issue)).toContain('2024001');
      expect(result.map(r => r.issue)).toContain('2024002');
    });
  });

  describe('Webhooks', () => {
    it('should create and list webhooks', async () => {
      const id = await adapter.createWebhook({
        name: 'Test',
        type: 'dingtalk',
        url: 'https://oapi.dingtalk.com/robot/send?access_token=xxx',
        secret: 'test',
        enabled: 1,
        events: '["draw.new"]',
      });

      const webhooks = await adapter.getWebhooks();
      expect(webhooks.length).toBe(1);
      expect(webhooks[0].name).toBe('Test');

      await adapter.deleteWebhook(id);
      const after = await adapter.getWebhooks();
      expect(after.length).toBe(0);
    });
  });
});
```

- [ ] **Step 3: Run tests**

```bash
cd /Users/weidada/ai/cp/worker && npx vitest run
```

Expected: All tests PASS.

- [ ] **Step 4: Commit**

```bash
git add worker/vitest.config.ts worker/src/db/__tests__/
git commit -m "test: add database adapter unit tests"
```

---

## Phase 2: Backend API Core

### Task 4: API routes for lottery data

**Files:**
- Create: `worker/src/routes/lottery.ts`
- Modify: `worker/src/index.ts`

- [ ] **Step 1: Create `worker/src/routes/lottery.ts`**

```typescript
import { Hono } from 'hono';
import type { DatabaseAdapter } from '../db/adapter';
import type { LotteryType } from '../db/types';

type Bindings = { DB: D1Database };
type Variables = { db: DatabaseAdapter };

export const lotteryRouter = new Hono<{ Bindings: Bindings; Variables: Variables }>();

const VALID_TYPES: LotteryType[] = ['ssq', 'dlt', 'fc3d', 'pl3', 'pl5'];

lotteryRouter.get('/latest', async (c) => {
  const type = c.req.query('type') as LotteryType;
  if (!VALID_TYPES.includes(type)) return c.json({ error: 'Invalid type' }, 400);

  const db = c.get('db');
  if (type === 'ssq') return c.json(await db.getSSQLatest());
  if (type === 'dlt') return c.json(await db.getDLTLatest());
  return c.json(await db.getSmallLatest(type));
});

lotteryRouter.get('/history', async (c) => {
  const type = c.req.query('type') as LotteryType;
  const page = parseInt(c.req.query('page') ?? '1');
  const size = parseInt(c.req.query('size') ?? '20');
  if (!VALID_TYPES.includes(type)) return c.json({ error: 'Invalid type' }, 400);

  const db = c.get('db');
  if (type === 'ssq') return c.json(await db.getSSQHistory(page, size));
  if (type === 'dlt') return c.json(await db.getDLTHistory(page, size));
  return c.json(await db.getSmallHistory(type, page, size));
});

lotteryRouter.get('/draw/:type/:issue', async (c) => {
  const type = c.req.param('type') as LotteryType;
  const issue = c.req.param('issue');
  if (!VALID_TYPES.includes(type)) return c.json({ error: 'Invalid type' }, 400);

  const db = c.get('db');
  let draw;
  if (type === 'ssq') draw = await db.getSSQByIssue(issue);
  else if (type === 'dlt') draw = await db.getDLTByIssue(issue);
  else draw = await db.getSmallByIssue(type, issue);

  if (!draw) return c.json({ error: 'Not found' }, 404);

  const details = await db.getPrizeDetails(type, issue);
  const locations = await db.getWinningLocations(type, issue);
  return c.json({ draw, prize_details: details, winning_locations: locations });
});

lotteryRouter.get('/prize-levels', async (c) => {
  const type = c.req.query('type') as LotteryType;
  // Static prize level definitions per lottery type
  const prizeLevels = getPrizeLevelDefinitions(type);
  return c.json(prizeLevels);
});

function getPrizeLevelDefinitions(type: LotteryType) {
  const levels: Record<string, unknown[]> = {
    ssq: [
      { level: '一等奖', front_match: 6, back_match: 1, description: '中6+1', prize_pool_under_800m: '浮动奖 最高1000万', prize_pool_over_800m: '浮动奖 最高1000万' },
      { level: '二等奖', front_match: 6, back_match: 0, description: '中6+0', prize_pool_under_800m: '浮动奖', prize_pool_over_800m: '浮动奖' },
      { level: '三等奖', front_match: 5, back_match: 1, description: '中5+1', prize_pool_under_800m: 3000, prize_pool_over_800m: 3000 },
      { level: '四等奖', front_match: 5, back_match: 0, description: '中5+0', prize_pool_under_800m: 200, prize_pool_over_800m: 200 },
      { level: '五等奖', front_match: 4, back_match: 1, description: '中4+1', prize_pool_under_800m: 10, prize_pool_over_800m: 10 },
      { level: '六等奖', front_match: 3, back_match: 1, description: '中3+1 / 2+1 / 1+1 / 0+1', prize_pool_under_800m: 5, prize_pool_over_800m: 5 },
    ],
    dlt: [
      { level: '一等奖', front_match: 5, back_match: 2, description: '中5+2', prize_pool_under_800m: '浮动奖 最高1000万', prize_pool_over_800m: '浮动奖 最高1800万' },
      { level: '二等奖', front_match: 5, back_match: 1, description: '中5+1', prize_pool_under_800m: '浮动奖', prize_pool_over_800m: '浮动奖 追加多80%' },
      { level: '三等奖', front_match: 5, back_match: 0, description: '中5+0 / 4+2', prize_pool_under_800m: 5000, prize_pool_over_800m: 6666 },
      { level: '四等奖', front_match: 4, back_match: 1, description: '中4+1', prize_pool_under_800m: 300, prize_pool_over_800m: 380 },
      { level: '五等奖', front_match: 4, back_match: 0, description: '中4+0 / 3+2', prize_pool_under_800m: 150, prize_pool_over_800m: 200 },
      { level: '六等奖', front_match: 3, back_match: 1, description: '中3+1 / 2+2', prize_pool_under_800m: 15, prize_pool_over_800m: 18 },
      { level: '七等奖', front_match: 3, back_match: 0, description: '中3+0 / 2+1 / 1+2 / 0+2', prize_pool_under_800m: 5, prize_pool_over_800m: 7 },
    ],
    fc3d: [
      { level: '直选', front_match: 3, back_match: 0, description: '顺序一致', prize_pool_under_800m: 1040, prize_pool_over_800m: 1040 },
      { level: '组选3', front_match: 3, back_match: 0, description: '两个相同', prize_pool_under_800m: 346, prize_pool_over_800m: 346 },
      { level: '组选6', front_match: 3, back_match: 0, description: '三个不同', prize_pool_under_800m: 173, prize_pool_over_800m: 173 },
    ],
    pl3: [
      { level: '直选', front_match: 3, back_match: 0, description: '顺序一致', prize_pool_under_800m: 1040, prize_pool_over_800m: 1040 },
      { level: '组选3', front_match: 3, back_match: 0, description: '两个相同', prize_pool_under_800m: 346, prize_pool_over_800m: 346 },
      { level: '组选6', front_match: 3, back_match: 0, description: '三个不同', prize_pool_under_800m: 173, prize_pool_over_800m: 173 },
    ],
    pl5: [
      { level: '一等奖', front_match: 5, back_match: 0, description: '5位全中', prize_pool_under_800m: 100000, prize_pool_over_800m: 100000 },
    ],
  };
  return levels[type] ?? [];
}
```

- [ ] **Step 2: Update `worker/src/index.ts` to mount routes and inject adapter**

```typescript
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { D1Adapter } from './db/d1-adapter';
import { lotteryRouter } from './routes/lottery';
import { analysisRouter } from './routes/analysis';
import { toolsRouter } from './routes/tools';
import { pullRouter } from './routes/pull';
import { webhookRouter } from './routes/webhooks';

type Bindings = {
  DB: D1Database;
  ENVIRONMENT: string;
};

const app = new Hono<{ Bindings: Bindings }>();

app.use('*', cors());

// Inject database adapter into context
app.use('*', async (c, next) => {
  const adapter = new D1Adapter(c.env.DB);
  c.set('db', adapter as any);
  await next();
});

app.get('/api/health', (c) => c.json({ status: 'ok' }));

app.route('/api/lottery', lotteryRouter);
app.route('/api/analysis', analysisRouter);
app.route('/api/tools', toolsRouter);
app.route('/api/lottery', pullRouter);
app.route('/api/webhooks', webhookRouter);

export default app;
```

- [ ] **Step 3: Commit**

```bash
git add worker/src/routes/lottery.ts worker/src/index.ts
git commit -m "feat: add lottery data API routes"
```

---

### Task 5: Analysis API routes

**Files:**
- Create: `worker/src/services/analysis.ts`
- Create: `worker/src/routes/analysis.ts`

- [ ] **Step 1: Create `worker/src/services/analysis.ts`**

```typescript
import type { SSQDraw, DLTDraw, SmallDraw, LotteryType } from '../db/types';

export interface HotColdResult {
  hot: { number: string; count: number }[];
  cold: { number: string; count: number }[];
}

export interface MissingResult {
  numbers: { number: string; missing: number; avg_missing: number }[];
}

export function analyzeHotCold(draws: (SSQDraw | DLTDraw | SmallDraw)[], type: LotteryType): HotColdResult {
  const countMap = new Map<string, number>();

  for (const draw of draws) {
    const numbers = extractNumbers(draw, type);
    for (const n of numbers) {
      countMap.set(n, (countMap.get(n) ?? 0) + 1);
    }
  }

  const sorted = [...countMap.entries()]
    .map(([number, count]) => ({ number, count }))
    .sort((a, b) => b.count - a.count);

  return {
    hot: sorted.slice(0, 10),
    cold: sorted.slice(-10).reverse(),
  };
}

export function analyzeMissing(draws: (SSQDraw | DLTDraw | SmallDraw)[], type: LotteryType): MissingResult {
  const lastSeen = new Map<string, number>();
  const totalMissing = new Map<string, number>();
  const appearCount = new Map<string, number>();

  const reversed = [...draws].reverse();
  for (let i = 0; i < reversed.length; i++) {
    const numbers = extractNumbers(reversed[i], type);
    for (const n of numbers) {
      if (lastSeen.has(n)) {
        const gap = i - lastSeen.get(n)!;
        totalMissing.set(n, (totalMissing.get(n) ?? 0) + gap);
        appearCount.set(n, (appearCount.get(n) ?? 0) + 1);
      }
      lastSeen.set(n, i);
    }
  }

  // Current missing = draws.length - 1 - lastSeen index
  const numbers = getAllPossibleNumbers(type);
  return {
    numbers: numbers.map(n => {
      const last = lastSeen.get(n);
      const missing = last !== undefined ? draws.length - 1 - last : draws.length;
      const count = appearCount.get(n) ?? 0;
      const avg_missing = count > 0 ? (totalMissing.get(n) ?? 0) / count : 0;
      return { number: n, missing, avg_missing: Math.round(avg_missing * 10) / 10 };
    }),
  };
}

export function analyzeFeatures(draws: (SSQDraw | DLTDraw | SmallDraw)[], type: LotteryType) {
  return draws.map(draw => {
    const numbers = extractNumbers(draw, type);
    const ints = numbers.map(Number);
    const odd = ints.filter(n => n % 2 === 1).length;
    const even = ints.length - odd;
    const big = ints.filter(n => type === 'ssq' ? n > 16 : type === 'dlt' ? n > 12 : n > 4).length;
    const small = ints.length - big;
    return { issue: (draw as any).issue, odd, even, big, small, sum: ints.reduce((a, b) => a + b, 0) };
  });
}

function extractNumbers(draw: SSQDraw | DLTDraw | SmallDraw, type: LotteryType): string[] {
  if (type === 'ssq') return JSON.parse((draw as SSQDraw).red_balls);
  if (type === 'dlt') return JSON.parse((draw as DLTDraw).front_zone);
  return JSON.parse((draw as SmallDraw).numbers).map(String);
}

function getAllPossibleNumbers(type: LotteryType): string[] {
  if (type === 'ssq') return Array.from({ length: 33 }, (_, i) => String(i + 1).padStart(2, '0'));
  if (type === 'dlt') return Array.from({ length: 35 }, (_, i) => String(i + 1).padStart(2, '0'));
  return Array.from({ length: 10 }, (_, i) => String(i));
}
```

- [ ] **Step 2: Create `worker/src/routes/analysis.ts`**

```typescript
import { Hono } from 'hono';
import type { DatabaseAdapter } from '../db/adapter';
import type { LotteryType } from '../db/types';
import { analyzeHotCold, analyzeMissing, analyzeFeatures } from '../services/analysis';

type Bindings = { DB: D1Database };
type Variables = { db: DatabaseAdapter };

export const analysisRouter = new Hono<{ Bindings: Bindings; Variables: Variables }>();

const VALID_TYPES: LotteryType[] = ['ssq', 'dlt', 'fc3d', 'pl3', 'pl5'];

analysisRouter.get('/hot-cold', async (c) => {
  const type = c.req.query('type') as LotteryType;
  const range = parseInt(c.req.query('range') ?? '30');
  if (!VALID_TYPES.includes(type)) return c.json({ error: 'Invalid type' }, 400);

  const db = c.get('db');
  const draws = await db.getDrawsForAnalysis(type, range);
  return c.json(analyzeHotCold(draws as any, type));
});

analysisRouter.get('/missing', async (c) => {
  const type = c.req.query('type') as LotteryType;
  const range = parseInt(c.req.query('range') ?? '30');
  if (!VALID_TYPES.includes(type)) return c.json({ error: 'Invalid type' }, 400);

  const db = c.get('db');
  const draws = await db.getDrawsForAnalysis(type, range);
  return c.json(analyzeMissing(draws as any, type));
});

analysisRouter.get('/features', async (c) => {
  const type = c.req.query('type') as LotteryType;
  const range = parseInt(c.req.query('range') ?? '30');
  if (!VALID_TYPES.includes(type)) return c.json({ error: 'Invalid type' }, 400);

  const db = c.get('db');
  const draws = await db.getDrawsForAnalysis(type, range);
  return c.json(analyzeFeatures(draws as any, type));
});

analysisRouter.get('/trend', async (c) => {
  const type = c.req.query('type') as LotteryType;
  const range = parseInt(c.req.query('range') ?? '30');
  if (!VALID_TYPES.includes(type)) return c.json({ error: 'Invalid type' }, 400);

  const db = c.get('db');
  const draws = await db.getDrawsForAnalysis(type, range);
  // Return raw draws for frontend to render as trend chart
  return c.json({ draws });
});
```

- [ ] **Step 3: Commit**

```bash
git add worker/src/services/analysis.ts worker/src/routes/analysis.ts
git commit -m "feat: add analysis API routes (hot-cold, missing, features, trend)"
```

---

### Task 6: Tools API routes (recommend, check-prize, prize-calc)

**Files:**
- Create: `worker/src/services/lottery-rules.ts`
- Create: `worker/src/routes/tools.ts`

- [ ] **Step 1: Create `worker/src/services/lottery-rules.ts`**

```typescript
import type { LotteryType } from '../db/types';

export interface LotteryRules {
  type: LotteryType;
  frontCount: number;
  frontMax: number;
  backCount: number;
  backMax: number;
  name: string;
}

export const RULES: Record<LotteryType, LotteryRules> = {
  ssq: { type: 'ssq', frontCount: 6, frontMax: 33, backCount: 1, backMax: 16, name: '双色球' },
  dlt: { type: 'dlt', frontCount: 5, frontMax: 35, backCount: 2, backMax: 12, name: '大乐透' },
  fc3d: { type: 'fc3d', frontCount: 3, frontMax: 10, backCount: 0, backMax: 0, name: '福彩3D' },
  pl3: { type: 'pl3', frontCount: 3, frontMax: 10, backCount: 0, backMax: 0, name: '排列3' },
  pl5: { type: 'pl5', frontCount: 5, frontMax: 10, backCount: 0, backMax: 0, name: '排列5' },
};

export function generateNumbers(type: LotteryType, count: number = 1): string[][] {
  const rules = RULES[type];
  const results: string[][] = [];

  for (let i = 0; i < count; i++) {
    const front = pickRandom(rules.frontCount, rules.frontMax, type === 'ssq' || type === 'dlt');
    const back = rules.backCount > 0 ? pickRandom(rules.backCount, rules.backMax, true) : [];
    results.push([...front, ...back]);
  }
  return results;
}

function pickRandom(count: number, max: number, padZero: boolean): string[] {
  const nums = new Set<number>();
  while (nums.size < count) {
    nums.add(Math.floor(Math.random() * max) + 1);
  }
  return [...nums]
    .sort((a, b) => a - b)
    .map(n => padZero ? String(n).padStart(2, '0') : String(n));
}

export function checkPrize(
  type: LotteryType,
  userNumbers: { front: string[]; back: string[] },
  drawNumbers: { front: string[]; back: string[] },
): { level: string; frontMatch: number; backMatch: number } | null {
  const frontMatch = userNumbers.front.filter(n => drawNumbers.front.includes(n)).length;
  const backMatch = userNumbers.back.filter(n => drawNumbers.back.includes(n)).length;

  const levels = getPrizeLevels(type);
  for (const lvl of levels) {
    if (frontMatch >= lvl.front && backMatch >= lvl.back) {
      return { level: lvl.name, frontMatch, backMatch };
    }
  }
  return null;
}

function getPrizeLevels(type: LotteryType) {
  const levels: Record<string, { name: string; front: number; back: number }[]> = {
    ssq: [
      { name: '一等奖', front: 6, back: 1 },
      { name: '二等奖', front: 6, back: 0 },
      { name: '三等奖', front: 5, back: 1 },
      { name: '四等奖', front: 5, back: 0 },
      { name: '五等奖', front: 4, back: 1 },
      { name: '六等奖', front: 3, back: 1 },
      { name: '六等奖', front: 2, back: 1 },
      { name: '六等奖', front: 1, back: 1 },
      { name: '六等奖', front: 0, back: 1 },
    ],
    dlt: [
      { name: '一等奖', front: 5, back: 2 },
      { name: '二等奖', front: 5, back: 1 },
      { name: '三等奖', front: 5, back: 0 },
      { name: '四等奖', front: 4, back: 2 },
      { name: '四等奖', front: 4, back: 1 },
      { name: '五等奖', front: 4, back: 0 },
      { name: '五等奖', front: 3, back: 2 },
      { name: '六等奖', front: 3, back: 1 },
      { name: '六等奖', front: 2, back: 2 },
      { name: '七等奖', front: 3, back: 0 },
      { name: '七等奖', front: 2, back: 1 },
      { name: '七等奖', front: 1, back: 2 },
      { name: '七等奖', front: 0, back: 2 },
    ],
    fc3d: [
      { name: '直选', front: 3, back: 0 },
    ],
    pl3: [
      { name: '直选', front: 3, back: 0 },
    ],
    pl5: [
      { name: '一等奖', front: 5, back: 0 },
    ],
  };
  return levels[type] ?? [];
}
```

- [ ] **Step 2: Create `worker/src/routes/tools.ts`**

```typescript
import { Hono } from 'hono';
import type { LotteryType } from '../db/types';
import { generateNumbers, RULES } from '../services/lottery-rules';

type Bindings = { DB: D1Database };

export const toolsRouter = new Hono<{ Bindings: Bindings }>();

toolsRouter.post('/recommend', async (c) => {
  const body = await c.req.json<{ type: LotteryType; count?: number }>();
  if (!body.type || !RULES[body.type]) return c.json({ error: 'Invalid type' }, 400);

  const count = Math.min(body.count ?? 5, 20);
  const numbers = generateNumbers(body.type, count);
  return c.json({ type: body.type, numbers });
});

toolsRouter.post('/check-prize', async (c) => {
  const body = await c.req.json<{
    type: LotteryType;
    numbers: { front: string[]; back: string[] };
    issue_range?: string;
  }>();

  // TODO: implement prize checking against database
  return c.json({ matches: [], summary: { total_matches: 0, total_prize: 0, best_match: null } });
});

toolsRouter.post('/prize-calc', async (c) => {
  const body = await c.req.json<{
    type: LotteryType;
    prize_level: string;
    count: number;
    additional?: boolean;
  }>();

  // Simple prize calculation
  const prizeMap: Record<string, Record<string, number>> = {
    ssq: { '一等奖': 5000000, '二等奖': 88888, '三等奖': 3000, '四等奖': 200, '五等奖': 10, '六等奖': 5 },
    dlt: { '一等奖': 10000000, '二等奖': 500000, '三等奖': 5000, '四等奖': 300, '五等奖': 150, '六等奖': 15, '七等奖': 5 },
    fc3d: { '直选': 1040, '组选3': 346, '组选6': 173 },
    pl3: { '直选': 1040, '组选3': 346, '组选6': 173 },
    pl5: { '一等奖': 100000 },
  };

  const amount = prizeMap[body.type]?.[body.prize_level] ?? 0;
  const total = amount * body.count;
  return c.json({ prize_level: body.prize_level, per_prize: amount, count: body.count, total });
});
```

- [ ] **Step 3: Commit**

```bash
git add worker/src/services/lottery-rules.ts worker/src/routes/tools.ts
git commit -m "feat: add tools API routes (recommend, check-prize, prize-calc)"
```

---

## Phase 3: Data Source Adapters & Pull API

### Task 7: Third-party API adapter for fetching lottery data

**Files:**
- Create: `worker/src/adapters/types.ts`
- Create: `worker/src/adapters/third-party.ts`
- Create: `worker/src/adapters/index.ts`
- Create: `worker/src/adapters/__tests__/adapter.test.ts`

- [ ] **Step 1: Create `worker/src/adapters/types.ts`**

```typescript
import type { LotteryType, DataSource } from '../db/types';

export interface DrawData {
  type: LotteryType;
  issue: string;
  draw_date: string;
  week?: string;
  numbers: {
    front: string[];  // red_balls / front_zone / main numbers
    back: string[];   // blue_ball / back_zone / empty for small
  };
  pool_amount?: number;
  sales_amount?: number;
  source: DataSource;
  prize_details?: PrizeDetailData[];
  winning_locations?: WinningLocationData[];
}

export interface PrizeDetailData {
  prize_level: string;
  prize_count: number;
  prize_amount: number;
  additional_count?: number;
  additional_amount?: number;
}

export interface WinningLocationData {
  prize_level: string;
  location: string;
  win_count: number;
  win_amount?: number;
}

export interface DataSourceAdapter {
  name: string;
  fetchLatest(type: LotteryType): Promise<DrawData | null>;
  fetchByIssue(type: LotteryType, issue: string): Promise<DrawData | null>;
  fetchByDateRange(type: LotteryType, startDate: string, endDate: string): Promise<DrawData[]>;
  fetchByIssues(type: LotteryType, issues: string[]): Promise<DrawData[]>;
}
```

- [ ] **Step 2: Create `worker/src/adapters/third-party.ts`**

```typescript
import type { DataSourceAdapter, DrawData, PrizeDetailData } from './types';
import type { LotteryType } from '../db/types';

/**
 * Third-party API adapter using opencai.net style API
 * Parses the common JSON format returned by third-party lottery APIs
 */
export class ThirdPartyAdapter implements DataSourceAdapter {
  name = 'third_party';
  private baseUrl: string;

  constructor(baseUrl: string = 'https://api.caipiaokong.com') {
    this.baseUrl = baseUrl;
  }

  async fetchLatest(type: LotteryType): Promise<DrawData | null> {
    try {
      const data = await this.fetchAPI(type, 'latest');
      return data.length > 0 ? data[0] : null;
    } catch {
      return null;
    }
  }

  async fetchByIssue(type: LotteryType, issue: string): Promise<DrawData | null> {
    try {
      const data = await this.fetchAPI(type, `issue/${issue}`);
      return data.length > 0 ? data[0] : null;
    } catch {
      return null;
    }
  }

  async fetchByDateRange(type: LotteryType, startDate: string, endDate: string): Promise<DrawData[]> {
    return this.fetchAPI(type, `range?start=${startDate}&end=${endDate}`);
  }

  async fetchByIssues(type: LotteryType, issues: string[]): Promise<DrawData[]> {
    const results: DrawData[] = [];
    for (const issue of issues) {
      const draw = await this.fetchByIssue(type, issue);
      if (draw) results.push(draw);
    }
    return results;
  }

  private async fetchAPI(type: LotteryType, path: string): Promise<DrawData[]> {
    const url = `${this.baseUrl}/lottery/${type}/${path}`;
    const resp = await fetch(url, {
      headers: { 'User-Agent': 'LotteryHelper/1.0' },
    });
    if (!resp.ok) return [];
    const json = await resp.json() as any;
    return this.normalizeResponse(type, json);
  }

  private normalizeResponse(type: LotteryType, raw: any): DrawData[] {
    // Normalize various third-party API formats
    const items = Array.isArray(raw) ? raw : raw?.data ?? [raw];
    return items.filter(Boolean).map((item: any) => this.normalizeItem(type, item));
  }

  private normalizeItem(type: LotteryType, item: any): DrawData {
    const numbers = this.parseNumbers(type, item);
    return {
      type,
      issue: String(item.issue ?? item.expect ?? ''),
      draw_date: item.date ?? item.draw_date ?? item.opentime?.slice(0, 10) ?? '',
      week: item.week ?? undefined,
      numbers,
      pool_amount: item.pool_amount ?? item.poolmoney ?? undefined,
      sales_amount: item.sales_amount ?? item.sales ?? undefined,
      source: 'third_party',
      prize_details: this.parsePrizeDetails(type, item),
    };
  }

  private parseNumbers(type: LotteryType, item: any): { front: string[]; back: string[] } {
    if (type === 'ssq') {
      const red = item.red_balls ?? item.redcode ?? item.opencode?.split('+')[0]?.split(',') ?? [];
      const blue = item.blue_ball ?? item.bluecode ?? item.opencode?.split('+')[1]?.split(',') ?? [];
      return {
        front: red.map((n: string) => String(n).padStart(2, '0')),
        back: blue.map((n: string) => String(n).padStart(2, '0')),
      };
    }
    if (type === 'dlt') {
      const front = item.front_zone ?? item.frontcode ?? item.opencode?.split('+')[0]?.split(',') ?? [];
      const back = item.back_zone ?? item.backcode ?? item.opencode?.split('+')[1]?.split(',') ?? [];
      return {
        front: front.map((n: string) => String(n).padStart(2, '0')),
        back: back.map((n: string) => String(n).padStart(2, '0')),
      };
    }
    // small lottery
    const nums = item.numbers ?? item.opencode?.split(',') ?? [];
    return { front: nums.map(String), back: [] };
  }

  private parsePrizeDetails(type: LotteryType, item: any): PrizeDetailData[] {
    const details = item.prize_details ?? item.prizegrades ?? [];
    return details.map((d: any) => ({
      prize_level: d.level ?? d.prize_level ?? d.typename ?? '',
      prize_count: Number(d.count ?? d.prize_count ?? d.num ?? 0),
      prize_amount: Number(d.amount ?? d.prize_amount ?? d.singlemoney ?? 0),
      additional_count: Number(d.add_count ?? d.append_num ?? 0),
      additional_amount: Number(d.add_amount ?? d.append_money ?? 0),
    }));
  }
}
```

- [ ] **Step 3: Create `worker/src/adapters/index.ts`**

```typescript
export type { DataSourceAdapter, DrawData, PrizeDetailData, WinningLocationData } from './types';
export { ThirdPartyAdapter } from './third-party';
```

- [ ] **Step 4: Create `worker/src/adapters/__tests__/adapter.test.ts`**

```typescript
import { describe, it, expect } from 'vitest';
import { ThirdPartyAdapter } from '../third-party';

describe('ThirdPartyAdapter', () => {
  it('should normalize SSQ numbers from opencode format', () => {
    const adapter = new ThirdPartyAdapter();
    // Access private method for testing
    const result = (adapter as any).parseNumbers('ssq', {
      opencode: '01,02,03,04,05,06+07',
    });
    expect(result.front).toEqual(['01', '02', '03', '04', '05', '06']);
    expect(result.back).toEqual(['07']);
  });

  it('should normalize DLT numbers', () => {
    const adapter = new ThirdPartyAdapter();
    const result = (adapter as any).parseNumbers('dlt', {
      front_zone: [1, 2, 3, 4, 5],
      back_zone: [1, 2],
    });
    expect(result.front).toEqual(['01', '02', '03', '04', '05']);
    expect(result.back).toEqual(['01', '02']);
  });

  it('should normalize small lottery numbers', () => {
    const adapter = new ThirdPartyAdapter();
    const result = (adapter as any).parseNumbers('fc3d', {
      numbers: [1, 2, 3],
    });
    expect(result.front).toEqual(['1', '2', '3']);
    expect(result.back).toEqual([]);
  });
});
```

- [ ] **Step 5: Run tests**

```bash
cd /Users/weidada/ai/cp/worker && npx vitest run
```

Expected: All tests PASS.

- [ ] **Step 6: Commit**

```bash
git add worker/src/adapters/
git commit -m "feat: add third-party data source adapter with number parsing"
```

---

### Task 8: Pull and check-exists API routes

**Files:**
- Create: `worker/src/services/pull-service.ts`
- Create: `worker/src/routes/pull.ts`

- [ ] **Step 1: Create `worker/src/services/pull-service.ts`**

```typescript
import type { DatabaseAdapter } from '../db/adapter';
import type { LotteryType } from '../db/types';
import type { DrawData } from '../adapters/types';
import { ThirdPartyAdapter } from '../adapters/third-party';

export interface PullResult {
  success: boolean;
  pulled: number;
  skipped: number;
  updated: number;
  errors: string[];
}

export interface ConflictInfo {
  conflict: boolean;
  existing_data: { issue: string; source: string; draw_date: string }[];
  missing_data: string[];
}

export async function checkExists(
  db: DatabaseAdapter,
  type: LotteryType,
  issues: string[],
): Promise<ConflictInfo> {
  const existing = await db.checkDrawExists(type, issues);
  const existingIssues = new Set(existing.map(e => e.issue));
  const missing = issues.filter(i => !existingIssues.has(i));

  return {
    conflict: existing.length > 0,
    existing_data: existing,
    missing_data: missing,
  };
}

export async function pullData(
  db: DatabaseAdapter,
  type: LotteryType,
  issues: string[],
  forceUpdate: boolean = false,
): Promise<PullResult> {
  const adapter = new ThirdPartyAdapter();
  const result: PullResult = { success: true, pulled: 0, skipped: 0, updated: 0, errors: [] };

  for (const issue of issues) {
    try {
      const existing = await db.checkDrawExists(type, [issue]);

      if (existing.length > 0 && !forceUpdate) {
        result.skipped++;
        continue;
      }

      const drawData = await adapter.fetchByIssue(type, issue);
      if (!drawData) {
        result.errors.push(`Issue ${issue}: not found in data source`);
        continue;
      }

      await saveDraw(db, drawData);

      if (existing.length > 0) {
        result.updated++;
      } else {
        result.pulled++;
      }
    } catch (err) {
      result.errors.push(`Issue ${issue}: ${err instanceof Error ? err.message : 'unknown error'}`);
    }
  }

  return result;
}

export async function pullByDateRange(
  db: DatabaseAdapter,
  type: LotteryType,
  startDate: string,
  endDate: string,
  forceUpdate: boolean = false,
): Promise<PullResult> {
  const adapter = new ThirdPartyAdapter();
  const result: PullResult = { success: true, pulled: 0, skipped: 0, updated: 0, errors: [] };

  try {
    const draws = await adapter.fetchByDateRange(type, startDate, endDate);

    for (const drawData of draws) {
      try {
        const existing = await db.checkDrawExists(type, [drawData.issue]);

        if (existing.length > 0 && !forceUpdate) {
          result.skipped++;
          continue;
        }

        await saveDraw(db, drawData);

        if (existing.length > 0) result.updated++;
        else result.pulled++;
      } catch (err) {
        result.errors.push(`Issue ${drawData.issue}: ${err instanceof Error ? err.message : 'unknown error'}`);
      }
    }
  } catch (err) {
    result.success = false;
    result.errors.push(`Failed to fetch date range: ${err instanceof Error ? err.message : 'unknown error'}`);
  }

  return result;
}

async function saveDraw(db: DatabaseAdapter, draw: DrawData) {
  const { type, issue, draw_date, week, numbers, pool_amount, sales_amount, source, prize_details } = draw;

  if (type === 'ssq') {
    await db.insertSSQDraw({
      issue, draw_date, week: week ?? null,
      red_balls: JSON.stringify(numbers.front),
      blue_ball: numbers.back[0] ?? '00',
      pool_amount: pool_amount ?? null,
      sales_amount: sales_amount ?? null,
      source,
      prize_details: prize_details ? JSON.stringify(prize_details) : null,
    });
  } else if (type === 'dlt') {
    await db.insertDLTDraw({
      issue, draw_date, week: week ?? null,
      front_zone: JSON.stringify(numbers.front),
      back_zone: JSON.stringify(numbers.back),
      pool_amount: pool_amount ?? null,
      sales_amount: sales_amount ?? null,
      source,
      prize_details: prize_details ? JSON.stringify(prize_details) : null,
    });
  } else {
    await db.insertSmallDraw({
      type, issue, draw_date,
      numbers: JSON.stringify([...numbers.front, ...numbers.back]),
      sales_amount: sales_amount ?? null,
      source,
      prize_details: prize_details ? JSON.stringify(prize_details) : null,
    });
  }

  // Save prize details
  if (prize_details) {
    for (const pd of prize_details) {
      await db.insertPrizeDetail({
        lottery_type: type, issue,
        prize_level: pd.prize_level,
        prize_count: pd.prize_count,
        prize_amount: pd.prize_amount,
        additional_count: pd.additional_count ?? 0,
        additional_amount: pd.additional_amount ?? null,
      });
    }
  }
}
```

- [ ] **Step 2: Create `worker/src/routes/pull.ts`**

```typescript
import { Hono } from 'hono';
import type { DatabaseAdapter } from '../db/adapter';
import type { LotteryType } from '../db/types';
import { checkExists, pullData, pullByDateRange } from '../services/pull-service';

type Bindings = { DB: D1Database };
type Variables = { db: DatabaseAdapter };

export const pullRouter = new Hono<{ Bindings: Bindings; Variables: Variables }>();

pullRouter.post('/check-exists', async (c) => {
  const body = await c.req.json<{ type: LotteryType; issues: string[] }>();
  if (!body.type || !body.issues?.length) return c.json({ error: 'type and issues required' }, 400);

  const db = c.get('db');
  const result = await checkExists(db, body.type, body.issues);
  return c.json(result);
});

pullRouter.post('/pull', async (c) => {
  const body = await c.req.json<{
    type: LotteryType;
    mode: 'issue' | 'date_range';
    issues?: string[];
    start_date?: string;
    end_date?: string;
    force_update?: boolean;
  }>();

  if (!body.type) return c.json({ error: 'type required' }, 400);

  const db = c.get('db');

  if (body.mode === 'issue' && body.issues?.length) {
    const result = await pullData(db, body.type, body.issues, body.force_update);
    return c.json(result);
  }

  if (body.mode === 'date_range' && body.start_date && body.end_date) {
    const result = await pullByDateRange(db, body.type, body.start_date, body.end_date, body.force_update);
    return c.json(result);
  }

  return c.json({ error: 'Invalid mode or missing parameters' }, 400);
});
```

- [ ] **Step 3: Commit**

```bash
git add worker/src/services/pull-service.ts worker/src/routes/pull.ts
git commit -m "feat: add pull and check-exists API with conflict detection"
```

---

## Phase 4: Webhooks & Cron

### Task 9: Webhook routes and notification service

**Files:**
- Create: `worker/src/services/webhook-service.ts`
- Create: `worker/src/routes/webhooks.ts`

- [ ] **Step 1: Create `worker/src/services/webhook-service.ts`**

```typescript
import type { DatabaseAdapter } from '../db/adapter';
import type { DrawData } from '../adapters/types';

export async function notifyNewDraw(db: DatabaseAdapter, draw: DrawData) {
  const webhooks = await db.getWebhooks();
  const enabled = webhooks.filter(w => w.enabled && JSON.parse(w.events).includes('draw.new'));

  for (const webhook of enabled) {
    try {
      await sendNotification(webhook, draw);
    } catch (err) {
      console.error(`Webhook ${webhook.id} failed:`, err);
    }
  }
}

async function sendNotification(webhook: any, draw: DrawData) {
  const message = formatMessage(draw);

  switch (webhook.type) {
    case 'dingtalk':
      await sendDingtalk(webhook.url, webhook.secret, message);
      break;
    case 'wechat':
      await sendWechat(webhook.url, message);
      break;
    case 'feishu':
      await sendFeishu(webhook.url, webhook.secret, message);
      break;
    case 'generic':
      await sendGeneric(webhook.url, { event: 'draw.new', data: draw, message });
      break;
  }
}

function formatMessage(draw: DrawData): string {
  const front = draw.numbers.front.join(' ');
  const back = draw.numbers.back.join(' ');
  const pool = draw.pool_amount ? `奖池: ¥${(draw.pool_amount / 100000000).toFixed(2)}亿` : '';
  return `🎱 ${draw.type.toUpperCase()} 第${draw.issue}期开奖\n前区: ${front}\n后区: ${back}\n${pool}`;
}

async function sendDingtalk(url: string, secret: string | null, text: string) {
  let finalUrl = url;
  if (secret) {
    const timestamp = Date.now();
    const sign = await hmacSha256(secret, `${timestamp}\n${secret}`);
    finalUrl += `&timestamp=${timestamp}&sign=${encodeURIComponent(sign)}`;
  }

  await fetch(finalUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      msgtype: 'markdown',
      markdown: { title: '开奖通知', text },
    }),
  });
}

async function sendWechat(url: string, text: string) {
  await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      msgtype: 'markdown',
      markdown: { content: text },
    }),
  });
}

async function sendFeishu(url: string, secret: string | null, text: string) {
  await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      msg_type: 'text',
      content: { text },
    }),
  });
}

async function sendGeneric(url: string, payload: unknown) {
  await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
}

async function hmacSha256(secret: string, message: string): Promise<string> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw', encoder.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']
  );
  const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(message));
  return btoa(String.fromCharCode(...new Uint8Array(signature)));
}
```

- [ ] **Step 2: Create `worker/src/routes/webhooks.ts`**

```typescript
import { Hono } from 'hono';
import type { DatabaseAdapter } from '../db/adapter';

type Bindings = { DB: D1Database };
type Variables = { db: DatabaseAdapter };

export const webhookRouter = new Hono<{ Bindings: Bindings; Variables: Variables }>();

webhookRouter.get('/', async (c) => {
  const db = c.get('db');
  const webhooks = await db.getWebhooks();
  return c.json(webhooks);
});

webhookRouter.post('/', async (c) => {
  const body = await c.req.json();
  const db = c.get('db');
  const id = await db.createWebhook({
    name: body.name,
    type: body.type,
    url: body.url,
    secret: body.secret ?? null,
    enabled: body.enabled ? 1 : 0,
    events: JSON.stringify(body.events ?? ['draw.new']),
  });
  return c.json({ id, ...body }, 201);
});

webhookRouter.put('/:id', async (c) => {
  const id = parseInt(c.req.param('id'));
  const body = await c.req.json();
  const db = c.get('db');
  await db.updateWebhook(id, {
    name: body.name,
    type: body.type,
    url: body.url,
    secret: body.secret,
    enabled: body.enabled ? 1 : 0,
    events: body.events ? JSON.stringify(body.events) : undefined,
  });
  return c.json({ id, ...body });
});

webhookRouter.delete('/:id', async (c) => {
  const id = parseInt(c.req.param('id'));
  const db = c.get('db');
  await db.deleteWebhook(id);
  return c.json({ deleted: true });
});

webhookRouter.post('/:id/test', async (c) => {
  const id = parseInt(c.req.param('id'));
  const db = c.get('db');
  const webhook = await db.getWebhookById(id);
  if (!webhook) return c.json({ error: 'Not found' }, 404);

  try {
    const testMessage = '🎱 测试通知 - 彩票助手 Webhook 连接正常';
    if (webhook.type === 'generic') {
      await fetch(webhook.url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ event: 'test', message: testMessage }),
      });
    }
    return c.json({ success: true });
  } catch (err) {
    return c.json({ success: false, error: err instanceof Error ? err.message : 'unknown' }, 500);
  }
});
```

- [ ] **Step 3: Commit**

```bash
git add worker/src/services/webhook-service.ts worker/src/routes/webhooks.ts
git commit -m "feat: add webhook CRUD routes and notification service"
```

---

### Task 10: Cron handler for scheduled data fetching

**Files:**
- Create: `worker/src/cron/handler.ts`
- Modify: `worker/src/index.ts` (add scheduled export)

- [ ] **Step 1: Create `worker/src/cron/handler.ts`**

```typescript
import type { D1Database } from '@cloudflare/workers-types';
import { D1Adapter } from '../db/d1-adapter';
import { ThirdPartyAdapter } from '../adapters/third-party';
import { notifyNewDraw } from '../services/webhook-service';
import type { LotteryType } from '../db/types';

const LOTTERY_SCHEDULE: Record<string, { type: LotteryType; name: string }> = {
  '30 13 * * 0,2,4': { type: 'ssq', name: '双色球' },
  '25 13 * * 1,3,5': { type: 'dlt', name: '大乐透' },
  '15 13 * * *': { type: 'fc3d', name: '福彩3D' },
};

export async function handleScheduled(env: { DB: D1Database }) {
  const db = new D1Adapter(env.DB);
  const adapter = new ThirdPartyAdapter();

  // Fetch latest for each lottery type
  for (const [, config] of Object.entries(LOTTERY_SCHEDULE)) {
    try {
      const latest = await adapter.fetchLatest(config.type);
      if (!latest) continue;

      // Check if already exists
      const existing = await db.checkDrawExists(config.type, [latest.issue]);
      if (existing.length > 0) continue;

      // Save new draw
      if (config.type === 'ssq') {
        await db.insertSSQDraw({
          issue: latest.issue,
          draw_date: latest.draw_date,
          week: latest.week ?? null,
          red_balls: JSON.stringify(latest.numbers.front),
          blue_ball: latest.numbers.back[0] ?? '00',
          pool_amount: latest.pool_amount ?? null,
          sales_amount: latest.sales_amount ?? null,
          source: 'official',
          prize_details: latest.prize_details ? JSON.stringify(latest.prize_details) : null,
        });
      } else if (config.type === 'dlt') {
        await db.insertDLTDraw({
          issue: latest.issue,
          draw_date: latest.draw_date,
          week: latest.week ?? null,
          front_zone: JSON.stringify(latest.numbers.front),
          back_zone: JSON.stringify(latest.numbers.back),
          pool_amount: latest.pool_amount ?? null,
          sales_amount: latest.sales_amount ?? null,
          source: 'official',
          prize_details: latest.prize_details ? JSON.stringify(latest.prize_details) : null,
        });
      } else {
        await db.insertSmallDraw({
          type: config.type,
          issue: latest.issue,
          draw_date: latest.draw_date,
          numbers: JSON.stringify([...latest.numbers.front, ...latest.numbers.back]),
          sales_amount: latest.sales_amount ?? null,
          source: 'official',
          prize_details: latest.prize_details ? JSON.stringify(latest.prize_details) : null,
        });
      }

      // Notify webhooks
      await notifyNewDraw(db, latest);
    } catch (err) {
      console.error(`Cron failed for ${config.name}:`, err);
    }
  }
}
```

- [ ] **Step 2: Update `worker/src/index.ts` to add scheduled handler**

Add this after the existing `export default app;`:

```typescript
export default {
  fetch: app.fetch,
  async scheduled(event: ScheduledEvent, env: Bindings) {
    const { handleScheduled } = await import('./cron/handler');
    await handleScheduled(env);
  },
};
```

- [ ] **Step 3: Commit**

```bash
git add worker/src/cron/ worker/src/index.ts
git commit -m "feat: add cron handler for scheduled lottery data fetching"
```

---

## Phase 5: Frontend

### Task 11: Initialize Vue 3 frontend project

**Files:**
- Create: `frontend/package.json`
- Create: `frontend/vite.config.ts`
- Create: `frontend/tsconfig.json`
- Create: `frontend/index.html`
- Create: `frontend/src/main.ts`
- Create: `frontend/src/App.vue`
- Create: `frontend/src/api/client.ts`
- Create: `frontend/src/api/types.ts`

- [ ] **Step 1: Scaffold Vue project**

```bash
cd /Users/weidada/ai/cp && npm create vite@latest frontend -- --template vue-ts
cd frontend && npm install
npm install vue-router@4 axios echarts
```

- [ ] **Step 2: Create `frontend/src/api/types.ts`**

```typescript
export type LotteryType = 'ssq' | 'dlt' | 'fc3d' | 'pl3' | 'pl5';

export interface SSQDraw {
  id: number;
  issue: string;
  draw_date: string;
  week: string | null;
  red_balls: string;
  blue_ball: string;
  pool_amount: number | null;
  sales_amount: number | null;
  source: string;
  prize_details: string | null;
  created_at: string;
  updated_at: string;
}

export interface DLTDraw {
  id: number;
  issue: string;
  draw_date: string;
  week: string | null;
  front_zone: string;
  back_zone: string;
  pool_amount: number | null;
  sales_amount: number | null;
  source: string;
  prize_details: string | null;
  created_at: string;
  updated_at: string;
}

export interface SmallDraw {
  id: number;
  type: string;
  issue: string;
  draw_date: string;
  numbers: string;
  sales_amount: number | null;
  source: string;
  prize_details: string | null;
}

export interface PrizeDetail {
  prize_level: string;
  prize_count: number;
  prize_amount: number | null;
  additional_count: number;
  additional_amount: number | null;
}

export interface WinningLocation {
  prize_level: string;
  location: string;
  win_count: number;
  win_amount: number | null;
}
```

- [ ] **Step 3: Create `frontend/src/api/client.ts`**

```typescript
import axios from 'axios';
import type { LotteryType, SSQDraw, DLTDraw, SmallDraw } from './types';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE || '/api',
  timeout: 10000,
});

export async function getLatest(type: LotteryType) {
  const { data } = await api.get<SSQDraw | DLTDraw | SmallDraw>('/lottery/latest', { params: { type } });
  return data;
}

export async function getHistory(type: LotteryType, page = 1, size = 20) {
  const { data } = await api.get('/lottery/history', { params: { type, page, size } });
  return data;
}

export async function getDrawDetail(type: LotteryType, issue: string) {
  const { data } = await api.get(`/lottery/draw/${type}/${issue}`);
  return data;
}

export async function getPrizeLevels(type: LotteryType) {
  const { data } = await api.get('/lottery/prize-levels', { params: { type } });
  return data;
}

export async function recommendNumbers(type: LotteryType, count = 5) {
  const { data } = await api.post('/tools/recommend', { type, count });
  return data;
}

export async function getHotCold(type: LotteryType, range = 30) {
  const { data } = await api.get('/analysis/hot-cold', { params: { type, range } });
  return data;
}

export async function getMissing(type: LotteryType, range = 30) {
  const { data } = await api.get('/analysis/missing', { params: { type, range } });
  return data;
}

export async function getFeatures(type: LotteryType, range = 30) {
  const { data } = await api.get('/analysis/features', { params: { type, range } });
  return data;
}

export async function checkExists(type: LotteryType, issues: string[]) {
  const { data } = await api.post('/lottery/check-exists', { type, issues });
  return data;
}

export async function pullData(params: {
  type: LotteryType;
  mode: 'issue' | 'date_range';
  issues?: string[];
  start_date?: string;
  end_date?: string;
  force_update?: boolean;
}) {
  const { data } = await api.post('/lottery/pull', params);
  return data;
}
```

- [ ] **Step 4: Create `frontend/src/App.vue`**

```vue
<template>
  <div id="app">
    <AppHeader v-model:lottery-type="currentType" />
    <SalesBanner :type="currentType" />
    <main class="main-content">
      <div class="left-panel">
        <LatestDraw :type="currentType" />
        <RecentDrawsTable :type="currentType" />
      </div>
      <div class="right-panel">
        <QuickActions :type="currentType" />
      </div>
    </main>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import type { LotteryType } from './api/types';
import AppHeader from './components/AppHeader.vue';
import SalesBanner from './components/SalesBanner.vue';
import LatestDraw from './components/LatestDraw.vue';
import RecentDrawsTable from './components/RecentDrawsTable.vue';
import QuickActions from './components/QuickActions.vue';

const currentType = ref<LotteryType>('ssq');
</script>

<style>
* { margin: 0; padding: 0; box-sizing: border-box; }
body {
  background: #1e1e1e;
  color: #d4d4d4;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
}
#app {
  max-width: 1400px;
  margin: 0 auto;
  padding: 16px;
}
.main-content {
  display: grid;
  grid-template-columns: 2fr 1fr;
  gap: 16px;
  margin-top: 16px;
}
</style>
```

- [ ] **Step 5: Create basic components**

Create `frontend/src/components/AppHeader.vue`:

```vue
<template>
  <header class="header">
    <div class="logo">🎱 彩票助手</div>
    <nav class="nav-tabs">
      <button
        v-for="tab in tabs"
        :key="tab.value"
        :class="['tab', { active: lotteryType === tab.value }]"
        @click="$emit('update:lotteryType', tab.value)"
      >{{ tab.label }}</button>
    </nav>
  </header>
</template>

<script setup lang="ts">
import type { LotteryType } from '../api/types';

defineProps<{ lotteryType: LotteryType }>();
defineEmits<{ 'update:lotteryType': [type: LotteryType] }>();

const tabs = [
  { value: 'ssq' as LotteryType, label: '双色球' },
  { value: 'dlt' as LotteryType, label: '大乐透' },
  { value: 'fc3d' as LotteryType, label: '福彩3D' },
  { value: 'pl3' as LotteryType, label: '排列3' },
  { value: 'pl5' as LotteryType, label: '排列5' },
];
</script>

<style scoped>
.header {
  background: #2d2d2d;
  padding: 16px 20px;
  border-radius: 8px;
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.logo { color: #569cd6; font-size: 18px; font-weight: bold; }
.nav-tabs { display: flex; gap: 12px; }
.tab {
  background: none;
  border: none;
  color: #d4d4d4;
  cursor: pointer;
  padding: 6px 14px;
  border-radius: 4px;
  font-size: 14px;
}
.tab.active { background: #0e639c; color: white; }
.tab:hover { background: #404040; }
</style>
```

Create `frontend/src/components/SalesBanner.vue`:

```vue
<template>
  <div class="banner">
    <div class="info">
      <span class="issue">🎯 正在销售 第{{ currentIssue }}期</span>
      <span>⏰ 截止投注：{{ deadline }}</span>
      <span>📅 {{ schedule }}</span>
    </div>
    <button class="bet-btn">立即投注</button>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import type { LotteryType } from '../api/types';

const props = defineProps<{ type: LotteryType }>();

const schedule = computed(() => {
  const map: Record<string, string> = {
    ssq: '每周二、四、日 21:30开奖',
    dlt: '每周一、三、六 21:25开奖',
    fc3d: '每日 21:15开奖',
    pl3: '每日 21:15开奖',
    pl5: '每日 21:15开奖',
  };
  return map[props.type] ?? '';
});

const currentIssue = computed(() => {
  // Simple issue calculation - will be replaced with API call
  const now = new Date();
  return `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`;
});

const deadline = computed(() => {
  const now = new Date();
  now.setHours(21, 0, 0, 0);
  return now.toISOString().slice(0, 19).replace('T', ' ');
});
</script>

<style scoped>
.banner {
  background: linear-gradient(135deg, #e74c3c, #c0392b);
  padding: 12px 20px;
  border-radius: 8px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 16px;
}
.info { display: flex; gap: 24px; color: white; font-size: 14px; }
.issue { font-weight: bold; }
.bet-btn {
  background: rgba(255,255,255,0.2);
  color: white;
  border: 1px solid rgba(255,255,255,0.4);
  padding: 8px 20px;
  border-radius: 6px;
  cursor: pointer;
  font-weight: bold;
}
</style>
```

Create `frontend/src/components/LatestDraw.vue`:

```vue
<template>
  <div class="card" v-if="draw">
    <h3>最新开奖 - {{ typeName }} 第{{ draw.issue }}期</h3>
    <div class="balls">
      <template v-if="type === 'ssq'">
        <span v-for="n in parseJSON(draw.red_balls)" :key="n" class="ball red">{{ n }}</span>
        <span class="ball blue">{{ draw.blue_ball }}</span>
      </template>
      <template v-else-if="type === 'dlt'">
        <span v-for="n in parseJSON(draw.front_zone)" :key="n" class="ball red">{{ n }}</span>
        <span v-for="n in parseJSON(draw.back_zone)" :key="n" class="ball blue">{{ n }}</span>
      </template>
      <template v-else>
        <span v-for="n in parseJSON(draw.numbers)" :key="n" class="ball red">{{ n }}</span>
      </template>
    </div>
    <div class="meta">
      <span v-if="draw.draw_date">开奖日期：{{ draw.draw_date }}</span>
      <span v-if="draw.pool_amount">奖池：¥{{ formatMoney(draw.pool_amount) }}</span>
      <span v-if="draw.sales_amount">销售：¥{{ formatMoney(draw.sales_amount) }}</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, computed } from 'vue';
import type { LotteryType } from '../api/types';
import { getLatest } from '../api/client';

const props = defineProps<{ type: LotteryType }>();
const draw = ref<any>(null);

const typeName = computed(() => {
  const map: Record<string, string> = { ssq: '双色球', dlt: '大乐透', fc3d: '福彩3D', pl3: '排列3', pl5: '排列5' };
  return map[props.type] ?? '';
});

watch(() => props.type, async (t) => {
  draw.value = await getLatest(t);
}, { immediate: true });

function parseJSON(s: string) { try { return JSON.parse(s); } catch { return []; } }
function formatMoney(n: number) { return (n / 100000000).toFixed(2) + '亿'; }
</script>

<style scoped>
.card {
  background: #2d2d2d;
  padding: 20px;
  border-radius: 8px;
}
h3 { margin-bottom: 16px; font-size: 16px; }
.balls { display: flex; gap: 10px; margin-bottom: 16px; }
.ball {
  width: 45px; height: 45px;
  border-radius: 50%;
  display: flex; align-items: center; justify-content: center;
  font-weight: bold; font-size: 16px; color: white;
}
.ball.red { background: #e74c3c; }
.ball.blue { background: #3498db; }
.meta { display: flex; gap: 20px; color: #808080; font-size: 14px; }
</style>
```

Create `frontend/src/components/RecentDrawsTable.vue`:

```vue
<template>
  <div class="card">
    <h3>最近开奖记录</h3>
    <div class="table-wrap">
      <table>
        <thead>
          <tr>
            <th>期号</th>
            <th>开奖日期</th>
            <th>开奖号码</th>
            <th>销售额</th>
            <th>详情</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="d in draws" :key="d.issue">
            <td>{{ d.issue }}</td>
            <td>{{ d.draw_date }}</td>
            <td class="numbers">{{ formatNumbers(d) }}</td>
            <td>{{ d.sales_amount ? formatMoney(d.sales_amount) : '-' }}</td>
            <td><button class="detail-btn">查看</button></td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue';
import type { LotteryType } from '../api/types';
import { getHistory } from '../api/client';

const props = defineProps<{ type: LotteryType }>();
const draws = ref<any[]>([]);

watch(() => props.type, async (t) => {
  const result = await getHistory(t, 1, 5);
  draws.value = result.data ?? [];
}, { immediate: true });

function formatNumbers(d: any) {
  if (d.red_balls) {
    const red = JSON.parse(d.red_balls).join(' ');
    return `${red} + ${d.blue_ball}`;
  }
  if (d.front_zone) {
    const front = JSON.parse(d.front_zone).join(' ');
    const back = JSON.parse(d.back_zone).join(' ');
    return `${front} + ${back}`;
  }
  return JSON.parse(d.numbers).join(' ');
}

function formatMoney(n: number) { return (n / 100000000).toFixed(2) + '亿'; }
</script>

<style scoped>
.card { background: #2d2d2d; padding: 20px; border-radius: 8px; margin-top: 16px; }
h3 { margin-bottom: 16px; font-size: 16px; }
.table-wrap { overflow-x: auto; }
table { width: 100%; border-collapse: collapse; font-size: 13px; }
th, td { padding: 10px 8px; text-align: left; border-bottom: 1px solid #404040; }
th { color: #808080; font-weight: bold; }
.numbers { white-space: nowrap; }
.detail-btn {
  background: #0e639c; color: white; border: none;
  padding: 4px 12px; border-radius: 4px; cursor: pointer; font-size: 12px;
}
</style>
```

Create `frontend/src/components/QuickActions.vue`:

```vue
<template>
  <div class="card">
    <h3>快捷操作</h3>
    <div class="actions">
      <button v-for="action in actions" :key="action.label" class="action-btn" @click="action.handler">
        <span class="icon">{{ action.icon }}</span>
        <span>{{ action.label }}</span>
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { LotteryType } from '../api/types';

const props = defineProps<{ type: LotteryType }>();

const actions = [
  { icon: '🎯', label: '推荐号码', handler: () => {} },
  { icon: '📋', label: '号码查奖', handler: () => {} },
  { icon: '💰', label: '奖金计算', handler: () => {} },
  { icon: '🔧', label: '号码工具', handler: () => {} },
  { icon: '🎰', label: '投注工具', handler: () => {} },
  { icon: '📊', label: '数据分析', handler: () => {} },
  { icon: '📥', label: '拉取数据', handler: () => {} },
];
</script>

<style scoped>
.card { background: #2d2d2d; padding: 20px; border-radius: 8px; }
h3 { margin-bottom: 16px; font-size: 16px; }
.actions { display: flex; flex-direction: column; gap: 8px; }
.action-btn {
  display: flex; align-items: center; gap: 12px;
  background: #1e1e1e; border: 1px solid #404040; color: #d4d4d4;
  padding: 12px 16px; border-radius: 6px; cursor: pointer;
  font-size: 14px; text-align: left;
  transition: background 0.2s;
}
.action-btn:hover { background: #404040; }
.icon { font-size: 18px; }
</style>
```

- [ ] **Step 6: Verify frontend builds**

```bash
cd /Users/weidada/ai/cp/frontend && npm run build
```

Expected: Build succeeds.

- [ ] **Step 7: Commit**

```bash
git add frontend/
git commit -m "feat: initialize Vue 3 frontend with core components"
```

---

## Phase 6: Integration & Deployment Config

### Task 12: Wrangler config and deployment script

**Files:**
- Create: `deploy.sh`
- Modify: `worker/wrangler.toml` (finalized config)
- Create: `frontend/vite.config.ts` (proxy for dev)

- [ ] **Step 1: Create `frontend/vite.config.ts`**

```typescript
import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';

export default defineConfig({
  plugins: [vue()],
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:8787',
        changeOrigin: true,
      },
    },
  },
  build: {
    outDir: 'dist',
  },
});
```

- [ ] **Step 2: Create `deploy.sh`**

```bash
#!/bin/bash
set -e

echo "🎱 彩票助手 - 部署脚本"
echo "========================"

# Deploy Worker
echo "📦 Deploying Worker..."
cd worker
npm run deploy
cd ..

# Build and deploy Frontend
echo "🌐 Building Frontend..."
cd frontend
npm run build

echo "📤 Deploying to Cloudflare Pages..."
npx wrangler pages deploy dist --project-name=cp-lottery
cd ..

echo "✅ 部署完成!"
```

- [ ] **Step 3: Make deploy script executable**

```bash
chmod +x deploy.sh
```

- [ ] **Step 4: Commit**

```bash
git add deploy.sh frontend/vite.config.ts
git commit -m "feat: add deployment script and dev proxy config"
```

---

## Summary

This plan covers the complete lottery assistant implementation in 12 tasks across 6 phases:

| Phase | Tasks | Description |
|-------|-------|-------------|
| 1 | 1-3 | Project scaffolding, database schema, adapter tests |
| 2 | 4-6 | Core API routes (lottery data, analysis, tools) |
| 3 | 7-8 | Data source adapter, pull API with conflict detection |
| 4 | 9-10 | Webhook notifications, cron handler |
| 5 | 11 | Vue 3 frontend with all core components |
| 6 | 12 | Deployment configuration |

Each task produces working, testable code with TDD approach. The plan covers all spec requirements: SSQ/DLT/FC3D/PL3/PL5 support, draw queries, data analysis, number tools, webhook notifications, and Cloudflare deployment.
