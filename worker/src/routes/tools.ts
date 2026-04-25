import { Hono } from 'hono';
import type { LotteryType } from '../db/types';
import { generateNumbers, RULES } from '../services/lottery-rules';

type Bindings = { DB: D1Database };

export const toolsRouter = new Hono<{ Bindings: Bindings }>();

// 推荐号码
toolsRouter.post('/recommend', async (c) => {
  const body = await c.req.json<{ type: LotteryType; count?: number }>();
  if (!body.type || !RULES[body.type]) return c.json({ error: '无效的彩票类型' }, 400);

  const count = Math.min(body.count ?? 5, 20);
  const numbers = generateNumbers(body.type, count);
  return c.json({ type: body.type, numbers });
});

// 号码查奖
toolsRouter.post('/check-prize', async (c) => {
  const body = await c.req.json<{
    type: LotteryType;
    numbers: { front: string[]; back: string[] };
    issue_range?: string;
  }>();

  return c.json({ matches: [], summary: { total_matches: 0, total_prize: 0, best_match: null } });
});

// 奖金计算
toolsRouter.post('/prize-calc', async (c) => {
  const body = await c.req.json<{
    type: LotteryType;
    prize_level: string;
    count: number;
    additional?: boolean;
  }>();

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
