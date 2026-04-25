import { Hono } from 'hono';
import type { DatabaseAdapter } from '../db/adapter';

type Bindings = { DB: D1Database };
type Variables = { db: DatabaseAdapter };

export const webhookRouter = new Hono<{ Bindings: Bindings; Variables: Variables }>();

webhookRouter.get('/', async (c) => {
  const db = c.get('db');
  const webhooks = await db.getWebhooks();
  return c.json(webhooks);
});

webhookRouter.post('/', async (c) => {
  const body = await c.req.json();
  const db = c.get('db');
  const id = await db.createWebhook({
    name: body.name,
    type: body.type,
    url: body.url,
    secret: body.secret ?? null,
    enabled: body.enabled ? 1 : 0,
    events: JSON.stringify(body.events ?? ['draw.new']),
  });
  return c.json({ id, ...body }, 201);
});

webhookRouter.put('/:id', async (c) => {
  const id = parseInt(c.req.param('id'));
  const body = await c.req.json();
  const db = c.get('db');
  await db.updateWebhook(id, {
    name: body.name,
    type: body.type,
    url: body.url,
    secret: body.secret,
    enabled: body.enabled ? 1 : 0,
    events: body.events ? JSON.stringify(body.events) : undefined,
  });
  return c.json({ id, ...body });
});

webhookRouter.delete('/:id', async (c) => {
  const id = parseInt(c.req.param('id'));
  const db = c.get('db');
  await db.deleteWebhook(id);
  return c.json({ deleted: true });
});

webhookRouter.post('/:id/test', async (c) => {
  const id = parseInt(c.req.param('id'));
  const db = c.get('db');
  const webhook = await db.getWebhookById(id);
  if (!webhook) return c.json({ error: '未找到' }, 404);

  try {
    const testMessage = '🎱 测试通知 - 彩票助手 Webhook 连接正常';
    if (webhook.type === 'generic') {
      await fetch(webhook.url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ event: 'test', message: testMessage }),
      });
    }
    return c.json({ success: true });
  } catch (err) {
    return c.json({ success: false, error: err instanceof Error ? err.message : '未知错误' }, 500);
  }
});
