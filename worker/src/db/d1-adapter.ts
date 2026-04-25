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

  async getPrizeDetails(lottery_type: LotteryType, issue: string) {
    return this.all<PrizeDetail>(this.db.prepare('SELECT * FROM prize_details WHERE lottery_type = ? AND issue = ?').bind(lottery_type, issue));
  }

  async insertPrizeDetail(detail: Omit<PrizeDetail, 'id' | 'created_at'>) {
    await this.db.prepare(
      'INSERT INTO prize_details (lottery_type, issue, prize_level, prize_count, prize_amount, additional_count, additional_amount) VALUES (?, ?, ?, ?, ?, ?, ?)'
    ).bind(detail.lottery_type, detail.issue, detail.prize_level, detail.prize_count, detail.prize_amount, detail.additional_count, detail.additional_amount).run();
  }

  async getWinningLocations(lottery_type: LotteryType, issue: string) {
    return this.all<WinningLocation>(this.db.prepare('SELECT * FROM winning_locations WHERE lottery_type = ? AND issue = ?').bind(lottery_type, issue));
  }

  async insertWinningLocation(loc: Omit<WinningLocation, 'id' | 'created_at'>) {
    await this.db.prepare(
      'INSERT INTO winning_locations (lottery_type, issue, prize_level, location, win_count, win_amount) VALUES (?, ?, ?, ?, ?, ?)'
    ).bind(loc.lottery_type, loc.issue, loc.prize_level, loc.location, loc.win_count, loc.win_amount).run();
  }

  async getDrawsForAnalysis(lottery_type: LotteryType, range: number) {
    const table = lottery_type === 'ssq' ? 'ssq_draws' : lottery_type === 'dlt' ? 'dlt_draws' : 'small_draws';
    const where = lottery_type === 'fc3d' || lottery_type === 'pl3' || lottery_type === 'pl5' ? 'WHERE type = ?' : '';
    const params = where ? [lottery_type, range] : [range];
    const sql = `SELECT * FROM ${table} ${where} ORDER BY draw_date DESC LIMIT ?`;
    return this.all(sql).bind(...params);
  }

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
