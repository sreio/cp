import type { DataSourceAdapter, DrawData, PrizeDetailData } from './types';
import type { LotteryType } from '../db/types';

// 官方 API 地址
const SSQ_API = 'https://www.cwl.gov.cn/cwl_admin/front/cwlkj/search/kjxx/findDrawNotice';
const DLT_API = 'https://webapi.sporttery.cn/gateway/lottery/getHistoryPageListV1.qry';

const DEFAULT_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
  'Accept': 'application/json, text/javascript, */*; q=0.01',
  'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
};

export class ThirdPartyAdapter implements DataSourceAdapter {
  name = 'official_api';
  private ssqApi: string;
  private dltApi: string;

  constructor(ssqApi?: string, dltApi?: string) {
    this.ssqApi = ssqApi || SSQ_API;
    this.dltApi = dltApi || DLT_API;
  }

  async fetchLatest(type: LotteryType): Promise<DrawData | null> {
    if (type === 'ssq') return this.fetchSSQ(1).then(d => d[0] ?? null);
    if (type === 'dlt') return this.fetchDLT(1, 1).then(d => d[0] ?? null);
    return null;
  }

  async fetchByIssue(type: LotteryType, issue: string): Promise<DrawData | null> {
    if (type === 'ssq') return this.fetchSSQByIssue(issue);
    if (type === 'dlt') return this.fetchDLTByIssue(issue);
    return null;
  }

  async fetchByDateRange(type: LotteryType, startDate: string, endDate: string): Promise<DrawData[]> {
    if (type === 'ssq') return this.fetchSSQByDateRange(startDate, endDate);
    if (type === 'dlt') return this.fetchDLTByDateRange(startDate, endDate);
    return [];
  }

  async fetchByIssues(type: LotteryType, issues: string[]): Promise<DrawData[]> {
    const results: DrawData[] = [];
    for (const issue of issues) {
      const draw = await this.fetchByIssue(type, issue);
      if (draw) results.push(draw);
    }
    return results;
  }

  // ========== 双色球 API ==========

  private async fetchSSQ(count: number): Promise<DrawData[]> {
    const params = new URLSearchParams({ name: 'ssq', issueCount: String(count) });
    const url = `${this.ssqApi}?${params}`;
    const resp = await this.request(url, 'ssq');
    if (!resp || resp.state !== 0) return [];
    return (resp.result ?? []).map((item: any) => this.normalizeSSQ(item));
  }

  private async fetchSSQByIssue(issue: string): Promise<DrawData | null> {
    const params = new URLSearchParams({ name: 'ssq', issueStart: issue, issueEnd: issue });
    const url = `${this.ssqApi}?${params}`;
    const resp = await this.request(url, 'ssq');
    if (!resp || resp.state !== 0 || !resp.result?.length) return null;
    return this.normalizeSSQ(resp.result[0]);
  }

  private async fetchSSQByDateRange(startDate: string, endDate: string): Promise<DrawData[]> {
    const params = new URLSearchParams({ name: 'ssq', dayStart: startDate, dayEnd: endDate });
    const url = `${this.ssqApi}?${params}`;
    const resp = await this.request(url, 'ssq');
    if (!resp || resp.state !== 0) return [];
    return (resp.result ?? []).map((item: any) => this.normalizeSSQ(item));
  }

  private normalizeSSQ(item: any): DrawData {
    const redStr: string = item.red ?? '';
    const blueStr: string = item.blue ?? '';
    const redBalls = redStr.split(',').map((s: string) => s.trim().padStart(2, '0'));
    const blueBalls = blueStr.split(',').map((s: string) => s.trim().padStart(2, '0'));

    const dateStr = (item.date ?? '').replace(/\(.*\)/, '').trim();

    const prizeDetails: PrizeDetailData[] = (item.prizegrades ?? []).map((g: any) => ({
      prize_level: this.getSSQPrizeLevel(g.type),
      prize_count: Number(g.typenum ?? 0),
      prize_amount: Number(g.typemoney ?? 0),
      additional_count: 0,
      additional_amount: 0,
    }));

    return {
      type: 'ssq',
      issue: String(item.code ?? ''),
      draw_date: dateStr,
      numbers: { front: redBalls, back: blueBalls },
      pool_amount: this.parseAmount(item.poolmoney),
      sales_amount: this.parseAmount(item.sales),
      source: 'official',
      prize_details: prizeDetails,
    };
  }

  private getSSQPrizeLevel(type: number): string {
    const map: Record<number, string> = { 1: '一等奖', 2: '二等奖', 3: '三等奖', 4: '四等奖', 5: '五等奖', 6: '六等奖' };
    return map[type] ?? `${type}等奖`;
  }

  // ========== 大乐透 API ==========

  public async fetchDLTPage(pageNo: number, pageSize: number): Promise<DrawData[]> {
    return this.fetchDLT(pageNo, pageSize);
  }

  private async fetchDLT(pageNo: number, pageSize: number): Promise<DrawData[]> {
    const params = new URLSearchParams({
      gameNo: '85',
      provinceId: '0',
      isVerify: '1',
      pageNo: String(pageNo),
      pageSize: String(pageSize),
    });
    const url = `${this.dltApi}?${params}`;
    const resp = await this.request(url, 'dlt');
    if (!resp || !resp.success) return [];
    const list = resp.value?.list ?? [];
    return list.map((item: any) => this.normalizeDLT(item));
  }

  private async fetchDLTByIssue(issue: string): Promise<DrawData | null> {
    const params = new URLSearchParams({
      gameNo: '85',
      provinceId: '0',
      isVerify: '1',
      pageNo: '1',
      pageSize: '1',
      lotteryDrawNum: issue,
    });
    const url = `${this.dltApi}?${params}`;
    const resp = await this.request(url, 'dlt');
    if (!resp || !resp.success) return null;
    const list = resp.value?.list ?? [];
    if (!list.length) return null;
    return this.normalizeDLT(list[0]);
  }

  private async fetchDLTByDateRange(startDate: string, endDate: string): Promise<DrawData[]> {
    const allDraws: DrawData[] = [];
    let pageNo = 1;
    const pageSize = 30;
    const maxPages = 20;

    while (pageNo <= maxPages) {
      const draws = await this.fetchDLT(pageNo, pageSize);
      if (!draws.length) break;

      for (const draw of draws) {
        if (draw.draw_date >= startDate && draw.draw_date <= endDate) {
          allDraws.push(draw);
        }
        if (draw.draw_date < startDate) {
          return allDraws;
        }
      }

      const lastDate = draws[draws.length - 1].draw_date;
      if (lastDate < startDate) break;

      pageNo++;
      await new Promise(r => setTimeout(r, 500));
    }

    return allDraws;
  }

  private normalizeDLT(item: any): DrawData {
    const result: string = item.lotteryDrawResult ?? '';
    let frontBalls: string[] = [];
    let backBalls: string[] = [];

    if (result.includes('#')) {
      const parts = result.split('#').map((s: string) => s.trim());
      frontBalls = parts[0].split(/\s+/).map((s: string) => s.padStart(2, '0'));
      backBalls = parts[1].split(/\s+/).map((s: string) => s.padStart(2, '0'));
    } else {
      const nums = result.split(/\s+/).filter(Boolean);
      frontBalls = nums.slice(0, 5).map((s: string) => s.padStart(2, '0'));
      backBalls = nums.slice(5, 7).map((s: string) => s.padStart(2, '0'));
    }

    const dateStr = (item.lotteryDrawTime ?? '').slice(0, 10);

    return {
      type: 'dlt',
      issue: String(item.lotteryDrawNum ?? ''),
      draw_date: dateStr,
      numbers: { front: frontBalls, back: backBalls },
      pool_amount: this.parseAmount(item.lotteryPoolAmount),
      sales_amount: this.parseAmount(item.lotterySaleAmount),
      source: 'official',
      prize_details: [],
    };
  }

  // ========== 工具方法 ==========

  private async request(url: string, type: string): Promise<any> {
    const headers: Record<string, string> = { ...DEFAULT_HEADERS };

    if (type === 'ssq') {
      headers['Referer'] = 'https://www.cwl.gov.cn/';
      headers['Origin'] = 'https://www.cwl.gov.cn';
    } else {
      headers['Referer'] = 'https://www.sporttery.cn/';
      headers['Origin'] = 'https://www.sporttery.cn';
    }

    try {
      const resp = await fetch(url, {
        headers,
        signal: AbortSignal.timeout(15000),
      });

      if (!resp.ok) {
        const text = await resp.text().catch(() => '');
        // 检测 WAF 拦截
        if (resp.status === 403 || text.includes('EdgeOne') || text.includes('安全策略')) {
          throw new Error(`官方 API 被 WAF 拦截 (HTTP ${resp.status})。如果在中国大陆本地运行，应该可以正常访问。`);
        }
        throw new Error(`HTTP ${resp.status}`);
      }

      const text = await resp.text();
      // 检测 WAF 返回的 HTML 页面
      if (text.includes('EdgeOne') || text.includes('安全策略') || text.includes('请求已被拦截')) {
        throw new Error('官方 API 被 WAF 拦截。如果在中国大陆本地运行，应该可以正常访问。');
      }

      return JSON.parse(text);
    } catch (err) {
      if (err instanceof SyntaxError) {
        throw new Error('官方 API 返回了非 JSON 响应（可能被 WAF 拦截）');
      }
      throw err;
    }
  }

  private parseAmount(val: any): number | undefined {
    if (!val) return undefined;
    const str = String(val).replace(/,/g, '');
    const num = parseInt(str, 10);
    return isNaN(num) ? undefined : num;
  }
}
