import type { DatabaseAdapter } from '../db/adapter';
import type { LotteryType } from '../db/types';
import type { DrawData } from '../adapters/types';
import { ThirdPartyAdapter } from '../adapters/third-party';
import { getTask, updateTask, type PullTask } from './task-manager';

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

      // 使用官方 API
      try {
        const adapter = new ThirdPartyAdapter();
        drawData = await adapter.fetchByIssue(type, issue);
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : '未知错误';
        result.errors.push(`期号 ${issue}: ${errorMsg}`);
        continue;
      }

      if (!drawData) {
        result.errors.push(`期号 ${issue}: 数据源中未找到`);
        continue;
      }

      await saveDraw(db, { ...drawData, source: 'official' });

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

  // 使用官方 API
  try {
    const adapter = new ThirdPartyAdapter();
    draws = await adapter.fetchByDateRange(type, startDate, endDate);
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : '未知错误';
    result.success = false;
    result.errors.push(`拉取失败: ${errorMsg}`);
    return result;
  }

  for (const drawData of draws) {
    try {
      const existing = await db.checkDrawExists(type, [drawData.issue]);

      if (existing.length > 0 && !forceUpdate) {
        result.skipped++;
        continue;
      }

      await saveDraw(db, { ...drawData, source: 'official' });

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

// ========== 异步批量拉取 ==========

// 每批处理数量
const BATCH_SIZE = 10;
// 批次间延迟（ms）
const DELAY_BETWEEN_BATCHES: Record<LotteryType, number> = {
  ssq: 1500,
  dlt: 2000,
  fc3d: 500,
  pl3: 500,
  pl5: 500,
};

function sleep(ms: number): Promise<void> {
  return new Promise(r => setTimeout(r, ms));
}

/**
 * 处理一批数据（由前端轮询调用）
 * 每次调用处理 BATCH_SIZE 期，更新任务进度
 */
export async function processBatch(db: DatabaseAdapter, taskId: string): Promise<PullTask | null> {
  const task = getTask(taskId);
  if (!task || task.status !== 'running') return task ?? null;

  const { type } = task;
  const adapter = new ThirdPartyAdapter();

  try {
    let draws: DrawData[] = [];
    let usedAdapter = '';

    if (type === 'ssq') {
      // 双色球：按 issue 范围拉取，cursor = year * 1000 + seq
      const cursor = task._cursor ?? (2003 * 1000 + 1);
      const issues = generateSSQIssues(cursor, BATCH_SIZE);
      if (issues.length === 0) {
        task.status = 'completed';
        return task;
      }

      // 使用官方 API 拉取（添加风控缓冲）
      for (let i = 0; i < issues.length; i++) {
        // 每 3 个请求加 1 秒延迟，避免触发风控
        if (i > 0 && i % 3 === 0) {
          await sleep(1000);
        }
        try {
          const draw = await adapter.fetchByIssue(type, issues[i]);
          if (draw) {
            draws.push({ ...draw, source: 'official' });
            usedAdapter = 'official';
          }
        } catch (err) {
          // 官方 API 失败，记录错误但继续
          const errorMsg = err instanceof Error ? err.message : '未知错误';
          if (!task.errors.some(e => e.includes('官方 API'))) {
            task.errors.push(`官方 API 错误: ${errorMsg}`);
          }
        }
      }

      // 更新 cursor 到最后一个 issue 的下一个
      const lastIssue = issues[issues.length - 1];
      const lastYear = parseInt(lastIssue.slice(0, 4));
      const lastSeq = parseInt(lastIssue.slice(4));
      const maxSeq = getMaxSeq(lastYear);
      if (lastSeq >= maxSeq) {
        task._cursor = (lastYear + 1) * 1000 + 1;
      } else {
        task._cursor = lastYear * 1000 + lastSeq + 1;
      }

    } else if (type === 'dlt') {
      // 大乐透：按页拉取
      const pageNo = (task._cursor ?? 0) + 1;
      try {
        const pageDraws = await adapter.fetchDLTPage(pageNo, 30);
        draws = pageDraws.map(d => ({ ...d, source: 'official' }));
        usedAdapter = 'official';
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : '未知错误';
        task.errors.push(`大乐透 API 错误: ${errorMsg}`);
      }
      task._cursor = pageNo;
      if (draws.length === 0) {
        task.status = 'completed';
        return task;
      }

    } else {
      // FC3D/PL3/PL5：暂不支持官方 API
      task.errors.push(`${type} 暂不支持官方 API，请手动添加数据`);
      task.status = 'completed';
      return task;
    }

    // 保存到数据库
    for (const draw of draws) {
      try {
        const existing = await db.checkDrawExists(type, [draw.issue]);
        if (existing.length > 0) {
          task.skipped++;
        } else {
          await saveDraw(db, draw);
          task.pulled++;
        }
        task.processed++;
      } catch (err) {
        task.errors.push(`期号 ${draw.issue}: ${err instanceof Error ? err.message : '未知错误'}`);
        task.processed++;
      }
    }

    // 更新任务
    updateTask(taskId, {
      processed: task.processed,
      pulled: task.pulled,
      skipped: task.skipped,
      errors: task.errors,
      _cursor: task._cursor,
    });

  } catch (err) {
    task.errors.push(`批次处理失败: ${err instanceof Error ? err.message : '未知错误'}`);
    // 不设置为 failed，允许重试
  }

  return task;
}

/**
 * 生成双色球 issue 列表
 * 双色球 issue 格式：YYYYNNN（年份+序号）
 * _cursor 格式：year * 1000 + seq
 */
function generateSSQIssues(cursor: number, count: number): string[] {
  const issues: string[] = [];
  const now = new Date();
  const currentYear = now.getFullYear();

  // 从 cursor 解析年份和序号
  let year = Math.floor(cursor / 1000);
  let seq = cursor % 1000;

  // 初始值
  if (year < 2003) { year = 2003; seq = 1; }

  while (issues.length < count && year <= currentYear) {
    const maxSeq = getMaxSeq(year);
    if (seq <= maxSeq) {
      issues.push(`${year}${String(seq).padStart(3, '0')}`);
    }
    seq++;
    if (seq > maxSeq) {
      year++;
      seq = 1;
    }
  }

  return issues;
}

function getMaxSeq(year: number): number {
  if (year === 2003) return 77; // 2003 年从第 77 期开始
  return 153; // 每年大约 153 期（每周二、四、日开奖）
}
