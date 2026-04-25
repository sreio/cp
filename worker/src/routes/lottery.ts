import { Hono } from 'hono';
import type { DatabaseAdapter } from '../db/adapter';
import type { LotteryType } from '../db/types';

type Bindings = { DB: D1Database };
type Variables = { db: DatabaseAdapter };

export const lotteryRouter = new Hono<{ Bindings: Bindings; Variables: Variables }>();

const VALID_TYPES: LotteryType[] = ['ssq', 'dlt', 'fc3d', 'pl3', 'pl5'];

// 最新开奖
lotteryRouter.get('/latest', async (c) => {
  const type = c.req.query('type') as LotteryType;
  if (!VALID_TYPES.includes(type)) return c.json({ error: '无效的彩票类型' }, 400);

  const db = c.get('db');
  if (type === 'ssq') return c.json(await db.getSSQLatest());
  if (type === 'dlt') return c.json(await db.getDLTLatest());
  return c.json(await db.getSmallLatest(type));
});

// 历史开奖（分页）
lotteryRouter.get('/history', async (c) => {
  const type = c.req.query('type') as LotteryType;
  const page = parseInt(c.req.query('page') ?? '1');
  const size = parseInt(c.req.query('size') ?? '20');
  if (!VALID_TYPES.includes(type)) return c.json({ error: '无效的彩票类型' }, 400);

  const db = c.get('db');
  if (type === 'ssq') return c.json(await db.getSSQHistory(page, size));
  if (type === 'dlt') return c.json(await db.getDLTHistory(page, size));
  return c.json(await db.getSmallHistory(type, page, size));
});

// 单期详情
lotteryRouter.get('/draw/:type/:issue', async (c) => {
  const type = c.req.param('type') as LotteryType;
  const issue = c.req.param('issue');
  if (!VALID_TYPES.includes(type)) return c.json({ error: '无效的彩票类型' }, 400);

  const db = c.get('db');
  let draw;
  if (type === 'ssq') draw = await db.getSSQByIssue(issue);
  else if (type === 'dlt') draw = await db.getDLTByIssue(issue);
  else draw = await db.getSmallByIssue(type, issue);

  if (!draw) return c.json({ error: '未找到' }, 404);

  const details = await db.getPrizeDetails(type, issue);
  const locations = await db.getWinningLocations(type, issue);
  return c.json({ draw, prize_details: details, winning_locations: locations });
});

// 奖级定义
lotteryRouter.get('/prize-levels', async (c) => {
  const type = c.req.query('type') as LotteryType;
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
