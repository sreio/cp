import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { D1Adapter } from './db/d1-adapter';
import { lotteryRouter } from './routes/lottery';
import { analysisRouter } from './routes/analysis';
import { toolsRouter } from './routes/tools';
import { pullRouter } from './routes/pull';
import { webhookRouter } from './routes/webhooks';

type Bindings = {
  DB: D1Database;
  ENVIRONMENT: string;
};

const app = new Hono<{ Bindings: Bindings }>();

app.use('*', cors());

// 注入数据库适配器到上下文
app.use('*', async (c, next) => {
  const adapter = new D1Adapter(c.env.DB);
  c.set('db', adapter as any);
  await next();
});

app.get('/api/health', (c) => c.json({ status: 'ok' }));

app.route('/api/lottery', lotteryRouter);
app.route('/api/analysis', analysisRouter);
app.route('/api/tools', toolsRouter);
app.route('/api/lottery', pullRouter);
app.route('/api/webhooks', webhookRouter);

export default {
  fetch: app.fetch,
  async scheduled(event: ScheduledEvent, env: Bindings) {
    const { handleScheduled } = await import('./cron/handler');
    await handleScheduled(env);
  },
};
