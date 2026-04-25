import { Hono } from 'hono';
import type { DatabaseAdapter } from '../db/adapter';
import type { LotteryType } from '../db/types';
import { checkExists, pullData, pullByDateRange } from '../services/pull-service';

type Bindings = { DB: D1Database };
type Variables = { db: DatabaseAdapter };

export const pullRouter = new Hono<{ Bindings: Bindings; Variables: Variables }>();

pullRouter.post('/check-exists', async (c) => {
  const body = await c.req.json<{ type: LotteryType; issues: string[] }>();
  if (!body.type || !body.issues?.length) return c.json({ error: 'type 和 issues 必填' }, 400);

  const db = c.get('db');
  const result = await checkExists(db, body.type, body.issues);
  return c.json(result);
});

pullRouter.post('/pull', async (c) => {
  const body = await c.req.json<{
    type: LotteryType;
    mode: 'issue' | 'date_range';
    issues?: string[];
    start_date?: string;
    end_date?: string;
    force_update?: boolean;
  }>();

  if (!body.type) return c.json({ error: 'type 必填' }, 400);

  const db = c.get('db');

  if (body.mode === 'issue' && body.issues?.length) {
    const result = await pullData(db, body.type, body.issues, body.force_update);
    return c.json(result);
  }

  if (body.mode === 'date_range' && body.start_date && body.end_date) {
    const result = await pullByDateRange(db, body.type, body.start_date, body.end_date, body.force_update);
    return c.json(result);
  }

  return c.json({ error: '无效的模式或缺少参数' }, 400);
});
