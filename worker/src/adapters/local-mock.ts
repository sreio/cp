import type { DataSourceAdapter, DrawData, PrizeDetailData } from './types';
import type { LotteryType } from '../db/types';

export class LocalMockAdapter implements DataSourceAdapter {
  name = 'local_mock';

  async fetchLatest(type: LotteryType): Promise<DrawData | null> {
    const draws = this.generateDraws(type, 1);
    return draws.length > 0 ? draws[0] : null;
  }

  async fetchByIssue(type: LotteryType, issue: string): Promise<DrawData | null> {
    return this.generateDraw(type, issue);
  }

  async fetchByDateRange(type: LotteryType, startDate: string, endDate: string): Promise<DrawData[]> {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const days = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
    const count = Math.min(Math.max(days, 1), 100);
    return this.generateDraws(type, count, start);
  }

  async fetchByIssues(type: LotteryType, issues: string[]): Promise<DrawData[]> {
    return issues.map(issue => this.generateDraw(type, issue)).filter(Boolean) as DrawData[];
  }

  private generateDraws(type: LotteryType, count: number, startDate?: Date): DrawData[] {
    const draws: DrawData[] = [];
    const baseDate = startDate || new Date();

    for (let i = 0; i < count; i++) {
      const date = new Date(baseDate);
      date.setDate(date.getDate() - i * (type === 'ssq' || type === 'dlt' ? 3 : 1));
      const issue = this.generateIssue(type, date);
      const numbers = this.generateNumbers(type);

      draws.push({
        type,
        issue,
        draw_date: date.toISOString().slice(0, 10),
        week: ['日', '一', '二', '三', '四', '五', '六'][date.getDay()],
        numbers,
        pool_amount: Math.floor(Math.random() * 500000000) + 100000000,
        sales_amount: Math.floor(Math.random() * 400000000) + 200000000,
        source: 'local_mock',
        prize_details: this.generatePrizeDetails(type),
      });
    }

    return draws;
  }

  private generateDraw(type: LotteryType, issue: string): DrawData | null {
    const date = this.parseIssueDate(type, issue);
    if (!date) return null;

    return {
      type,
      issue,
      draw_date: date.toISOString().slice(0, 10),
      week: ['日', '一', '二', '三', '四', '五', '六'][date.getDay()],
      numbers: this.generateNumbers(type),
      pool_amount: Math.floor(Math.random() * 500000000) + 100000000,
      sales_amount: Math.floor(Math.random() * 400000000) + 200000000,
      source: 'local_mock',
      prize_details: this.generatePrizeDetails(type),
    };
  }

  private generateIssue(type: LotteryType, date: Date): string {
    const year = date.getFullYear();
    const dayOfYear = Math.floor((date.getTime() - new Date(year, 0, 0).getTime()) / (1000 * 60 * 60 * 24));
    const seq = String(dayOfYear).padStart(3, '0');

    if (type === 'ssq' || type === 'dlt') {
      return `${year}${seq}`;
    }
    return `${year}${seq}`;
  }

  private parseIssueDate(type: LotteryType, issue: string): Date | null {
    if (issue.length < 7) return null;
    const year = parseInt(issue.slice(0, 4));
    const dayOfYear = parseInt(issue.slice(4));
    if (isNaN(year) || isNaN(dayOfYear)) return null;

    const date = new Date(year, 0, 1);
    date.setDate(date.getDate() + dayOfYear - 1);
    return date;
  }

  private generateNumbers(type: LotteryType): { front: string[]; back: string[] } {
    if (type === 'ssq') {
      const front = this.randomPick(6, 1, 33).map(n => String(n).padStart(2, '0'));
      const back = [String(Math.floor(Math.random() * 16) + 1).padStart(2, '0')];
      return { front, back };
    }
    if (type === 'dlt') {
      const front = this.randomPick(5, 1, 35).map(n => String(n).padStart(2, '0'));
      const back = this.randomPick(2, 1, 12).map(n => String(n).padStart(2, '0'));
      return { front, back };
    }
    if (type === 'fc3d' || type === 'pl3') {
      const front = Array.from({ length: 3 }, () => String(Math.floor(Math.random() * 10)));
      return { front, back: [] };
    }
    if (type === 'pl5') {
      const front = Array.from({ length: 5 }, () => String(Math.floor(Math.random() * 10)));
      return { front, back: [] };
    }
    return { front: [], back: [] };
  }

  private randomPick(count: number, min: number, max: number): number[] {
    const nums = new Set<number>();
    while (nums.size < count) {
      nums.add(Math.floor(Math.random() * (max - min + 1)) + min);
    }
    return [...nums].sort((a, b) => a - b);
  }

  private generatePrizeDetails(type: LotteryType): PrizeDetailData[] {
    if (type === 'ssq') {
      return [
        { prize_level: '一等奖', prize_count: Math.floor(Math.random() * 5) + 1, prize_amount: 5000000, additional_count: 0, additional_amount: 0 },
        { prize_level: '二等奖', prize_count: Math.floor(Math.random() * 50) + 10, prize_amount: 88888, additional_count: 0, additional_amount: 0 },
        { prize_level: '三等奖', prize_count: Math.floor(Math.random() * 200) + 50, prize_amount: 3000, additional_count: 0, additional_amount: 0 },
      ];
    }
    if (type === 'dlt') {
      return [
        { prize_level: '一等奖', prize_count: Math.floor(Math.random() * 3) + 1, prize_amount: 10000000, additional_count: Math.floor(Math.random() * 2), additional_amount: 6000000 },
        { prize_level: '二等奖', prize_count: Math.floor(Math.random() * 30) + 5, prize_amount: 500000, additional_count: Math.floor(Math.random() * 10), additional_amount: 300000 },
        { prize_level: '三等奖', prize_count: Math.floor(Math.random() * 100) + 20, prize_amount: 5000, additional_count: 0, additional_amount: 0 },
      ];
    }
    return [];
  }
}
