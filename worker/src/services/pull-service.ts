import type { DatabaseAdapter } from '../db/adapter';
import type { LotteryType } from '../db/types';
import type { DrawData } from '../adapters/types';
import { ThirdPartyAdapter } from '../adapters/third-party';
import { LocalMockAdapter } from '../adapters/local-mock';

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
  const result: PullResult = { success: true, pulled: 0, skipped: 0, updated: 0, errors: [] };

  for (const issue of issues) {
    try {
      const existing = await db.checkDrawExists(type, [issue]);

      if (existing.length > 0 && !forceUpdate) {
        result.skipped++;
        continue;
      }

      let drawData: DrawData | null = null;
      let usedAdapter = '';

      // 尝试使用官方 API
      try {
        const adapter = new ThirdPartyAdapter();
        drawData = await adapter.fetchByIssue(type, issue);
        usedAdapter = 'official';
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : '未知错误';
        console.warn(`官方 API 失败，使用本地模拟数据: ${errorMsg}`);

        // 回退到本地模拟数据
        try {
          const mockAdapter = new LocalMockAdapter();
          drawData = await mockAdapter.fetchByIssue(type, issue);
          usedAdapter = 'local_mock';
          if (!result.errors.some(e => e.includes('提示:'))) {
            result.errors.push(`提示: 官方 API 不可用（${errorMsg}），已使用模拟数据`);
          }
        } catch (mockErr) {
          result.errors.push(`期号 ${issue}: ${errorMsg}`);
          continue;
        }
      }

      if (!drawData) {
        result.errors.push(`期号 ${issue}: 数据源中未找到`);
        continue;
      }

      await saveDraw(db, { ...drawData, source: usedAdapter });

      if (existing.length > 0) {
        result.updated++;
      } else {
        result.pulled++;
      }
    } catch (err) {
      result.errors.push(`期号 ${issue}: ${err instanceof Error ? err.message : '未知错误'}`);
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
  const result: PullResult = { success: true, pulled: 0, skipped: 0, updated: 0, errors: [] };

  let draws: DrawData[] = [];
  let usedAdapter = '';

  // 尝试使用官方 API
  try {
    const adapter = new ThirdPartyAdapter();
    draws = await adapter.fetchByDateRange(type, startDate, endDate);
    usedAdapter = 'official';
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : '未知错误';
    console.warn(`官方 API 失败，使用本地模拟数据: ${errorMsg}`);

    // 回退到本地模拟数据
    try {
      const mockAdapter = new LocalMockAdapter();
      draws = await mockAdapter.fetchByDateRange(type, startDate, endDate);
      usedAdapter = 'local_mock';
      result.errors.push(`提示: 官方 API 不可用（${errorMsg}），已使用模拟数据`);
    } catch (mockErr) {
      result.success = false;
      result.errors.push(`拉取失败: ${errorMsg}`);
      return result;
    }
  }

  for (const drawData of draws) {
    try {
      const existing = await db.checkDrawExists(type, [drawData.issue]);

      if (existing.length > 0 && !forceUpdate) {
        result.skipped++;
        continue;
      }

      await saveDraw(db, { ...drawData, source: usedAdapter });

      if (existing.length > 0) result.updated++;
      else result.pulled++;
    } catch (err) {
      result.errors.push(`期号 ${drawData.issue}: ${err instanceof Error ? err.message : '未知错误'}`);
    }
  }

  return result;
}

async function saveDraw(db: DatabaseAdapter, draw: DrawData) {
  const { type, issue, draw_date, week, numbers, pool_amount, sales_amount, source, prize_details } = draw;

  // 将号码数组转换为逗号分隔的字符串格式
  const frontStr = numbers.front.join(',');
  const backStr = numbers.back.join(',');

  if (type === 'ssq') {
    await db.insertSSQDraw({
      issue, draw_date, week: week ?? null,
      red_balls: frontStr,
      blue_ball: numbers.back[0] ?? '00',
      pool_amount: pool_amount ?? null,
      sales_amount: sales_amount ?? null,
      source,
      prize_details: prize_details ? JSON.stringify(prize_details) : null,
    });
  } else if (type === 'dlt') {
    await db.insertDLTDraw({
      issue, draw_date, week: week ?? null,
      front_zone: frontStr,
      back_zone: backStr,
      pool_amount: pool_amount ?? null,
      sales_amount: sales_amount ?? null,
      source,
      prize_details: prize_details ? JSON.stringify(prize_details) : null,
    });
  } else {
    await db.insertSmallDraw({
      type, issue, draw_date,
      numbers: frontStr,
      sales_amount: sales_amount ?? null,
      source,
      prize_details: prize_details ? JSON.stringify(prize_details) : null,
    });
  }

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
