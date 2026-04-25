import { Hono } from 'hono';
import type { DatabaseAdapter } from '../db/adapter';
import type { LotteryType } from '../db/types';
import { checkExists, pullData, pullByDateRange, processBatch } from '../services/pull-service';
import { createTask, getTask, cancelTask, estimateTotal } from '../services/task-manager';

const VALID_TYPES: LotteryType[] = ['ssq', 'dlt', 'fc3d', 'pl3', 'pl5'];

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

// ========== 异步批量拉取 ==========

// 启动全量拉取任务
pullRouter.post('/pull-all', async (c) => {
  const body = await c.req.json<{ type: LotteryType }>();
  if (!body.type || !VALID_TYPES.includes(body.type)) {
    return c.json({ error: '无效的彩票类型' }, 400);
  }

  const total = estimateTotal(body.type);
  const task = createTask(body.type, total);

  return c.json({ task_id: task.id });
});

// 查询任务进度
pullRouter.get('/pull-task/:id', async (c) => {
  const id = c.req.param('id');
  const task = getTask(id);
  if (!task) return c.json({ error: '任务不存在' }, 404);

  // 返回公开字段（不返回内部状态）
  return c.json({
    id: task.id,
    type: task.type,
    status: task.status,
    total: task.total,
    processed: task.processed,
    pulled: task.pulled,
    skipped: task.skipped,
    errors: task.errors,
  });
});

// 处理一批数据（前端轮询调用）
pullRouter.post('/pull-task/:id/process', async (c) => {
  const id = c.req.param('id');
  const task = getTask(id);
  if (!task) return c.json({ error: '任务不存在' }, 404);
  if (task.status !== 'running') return c.json(task);

  const db = c.get('db');
  const result = await processBatch(db, id);

  return c.json({
    id: result!.id,
    type: result!.type,
    status: result!.status,
    total: result!.total,
    processed: result!.processed,
    pulled: result!.pulled,
    skipped: result!.skipped,
    errors: result!.errors,
  });
});

// 取消任务
pullRouter.post('/pull-task/:id/cancel', async (c) => {
  const id = c.req.param('id');
  const success = cancelTask(id);
  if (!success) return c.json({ error: '任务不存在或已完成' }, 404);
  return c.json({ success: true });
});
