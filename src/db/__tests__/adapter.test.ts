import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import Database from 'better-sqlite3';
import { D1Adapter } from '../d1-adapter';
import { readFileSync } from 'fs';
import { resolve } from 'path';

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

  describe('双色球开奖记录', () => {
    it('应能插入和查询双色球开奖记录', async () => {
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

    it('应能获取最新开奖记录', async () => {
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

    it('应能分页查询历史记录', async () => {
      const result = await adapter.getSSQHistory(1, 10);
      expect(result.data.length).toBe(2);
      expect(result.total).toBe(2);
    });

    it('应能更新开奖记录', async () => {
      await adapter.updateSSQDraw('2024001', { pool_amount: 2500000000 });
      const draw = await adapter.getSSQByIssue('2024001');
      expect(draw!.pool_amount).toBe(2500000000);
    });
  });

  describe('大乐透开奖记录', () => {
    it('应能插入和查询大乐透开奖记录', async () => {
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

  describe('小盘彩开奖记录', () => {
    it('应能插入和查询福彩3D开奖记录', async () => {
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

  describe('数据存在性检查', () => {
    it('应返回已存在的开奖记录', async () => {
      const result = await adapter.checkDrawExists('ssq', ['2024001', '2024002', '2024999']);
      expect(result.length).toBe(2);
      expect(result.map(r => r.issue)).toContain('2024001');
      expect(result.map(r => r.issue)).toContain('2024002');
    });
  });

  describe('Webhook', () => {
    it('应能创建和查询 Webhook', async () => {
      const id = await adapter.createWebhook({
        name: '测试钉钉',
        type: 'dingtalk',
        url: 'https://oapi.dingtalk.com/robot/send?access_token=xxx',
        secret: 'test',
        enabled: 1,
        events: '["draw.new"]',
      });

      const webhooks = await adapter.getWebhooks();
      expect(webhooks.length).toBe(1);
      expect(webhooks[0].name).toBe('测试钉钉');

      await adapter.deleteWebhook(id);
      const after = await adapter.getWebhooks();
      expect(after.length).toBe(0);
    });
  });
});
