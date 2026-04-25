import type { DataSourceAdapter, DrawData, PrizeDetailData } from './types';
import type { LotteryType } from '../db/types';

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
