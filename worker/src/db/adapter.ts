import type { SSQDraw, DLTDraw, SmallDraw, PrizeDetail, WinningLocation, Webhook, LotteryType, DataSource } from './types';

export interface DatabaseAdapter {
  getSSQLatest(): Promise<SSQDraw | null>;
  getSSQHistory(page: number, size: number): Promise<{ data: SSQDraw[]; total: number }>;
  getSSQByIssue(issue: string): Promise<SSQDraw | null>;
  insertSSQDraw(draw: Omit<SSQDraw, 'id' | 'created_at' | 'updated_at'>): Promise<void>;
  updateSSQDraw(issue: string, draw: Partial<SSQDraw>): Promise<void>;

  getDLTLatest(): Promise<DLTDraw | null>;
  getDLTHistory(page: number, size: number): Promise<{ data: DLTDraw[]; total: number }>;
  getDLTByIssue(issue: string): Promise<DLTDraw | null>;
  insertDLTDraw(draw: Omit<DLTDraw, 'id' | 'created_at' | 'updated_at'>): Promise<void>;
  updateDLTDraw(issue: string, draw: Partial<DLTDraw>): Promise<void>;

  getSmallLatest(type: LotteryType): Promise<SmallDraw | null>;
  getSmallHistory(type: LotteryType, page: number, size: number): Promise<{ data: SmallDraw[]; total: number }>;
  getSmallByIssue(type: LotteryType, issue: string): Promise<SmallDraw | null>;
  insertSmallDraw(draw: Omit<SmallDraw, 'id' | 'created_at' | 'updated_at'>): Promise<void>;

  getPrizeDetails(lottery_type: LotteryType, issue: string): Promise<PrizeDetail[]>;
  insertPrizeDetail(detail: Omit<PrizeDetail, 'id' | 'created_at'>): Promise<void>;

  getWinningLocations(lottery_type: LotteryType, issue: string): Promise<WinningLocation[]>;
  insertWinningLocation(loc: Omit<WinningLocation, 'id' | 'created_at'>): Promise<void>;

  getDrawsForAnalysis(lottery_type: LotteryType, range: number): Promise<(SSQDraw | DLTDraw | SmallDraw)[]>;

  checkDrawExists(lottery_type: LotteryType, issues: string[]): Promise<{ issue: string; source: string; draw_date: string }[]>;

  getWebhooks(): Promise<Webhook[]>;
  getWebhookById(id: number): Promise<Webhook | null>;
  createWebhook(webhook: Omit<Webhook, 'id' | 'created_at' | 'updated_at'>): Promise<number>;
  updateWebhook(id: number, webhook: Partial<Webhook>): Promise<void>;
  deleteWebhook(id: number): Promise<void>;
}
