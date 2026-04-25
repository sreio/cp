import { Hono } from 'hono';
import type { DatabaseAdapter } from '../db/adapter';
import type { LotteryType } from '../db/types';
import { analyzeHotCold, analyzeMissing, analyzeFeatures } from '../services/analysis';

type Bindings = { DB: D1Database };
type Variables = { db: DatabaseAdapter };

export const analysisRouter = new Hono<{ Bindings: Bindings; Variables: Variables }>();

const VALID_TYPES: LotteryType[] = ['ssq', 'dlt', 'fc3d', 'pl3', 'pl5'];

analysisRouter.get('/hot-cold', async (c) => {
  const type = c.req.query('type') as LotteryType;
  const range = parseInt(c.req.query('range') ?? '30');
  if (!VALID_TYPES.includes(type)) return c.json({ error: '无效的彩票类型' }, 400);

  const db = c.get('db');
  const draws = await db.getDrawsForAnalysis(type, range);
  return c.json(analyzeHotCold(draws as any, type));
});

analysisRouter.get('/missing', async (c) => {
  const type = c.req.query('type') as LotteryType;
  const range = parseInt(c.req.query('range') ?? '30');
  if (!VALID_TYPES.includes(type)) return c.json({ error: '无效的彩票类型' }, 400);

  const db = c.get('db');
  const draws = await db.getDrawsForAnalysis(type, range);
  return c.json(analyzeMissing(draws as any, type));
});

analysisRouter.get('/features', async (c) => {
  const type = c.req.query('type') as LotteryType;
  const range = parseInt(c.req.query('range') ?? '30');
  if (!VALID_TYPES.includes(type)) return c.json({ error: '无效的彩票类型' }, 400);

  const db = c.get('db');
  const draws = await db.getDrawsForAnalysis(type, range);
  return c.json(analyzeFeatures(draws as any, type));
});

analysisRouter.get('/trend', async (c) => {
  const type = c.req.query('type') as LotteryType;
  const range = parseInt(c.req.query('range') ?? '30');
  if (!VALID_TYPES.includes(type)) return c.json({ error: '无效的彩票类型' }, 400);

  const db = c.get('db');
  const draws = await db.getDrawsForAnalysis(type, range);
  return c.json({ draws });
});
