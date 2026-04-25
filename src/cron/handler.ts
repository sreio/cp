import type { D1Database } from '@cloudflare/workers-types';
import { D1Adapter } from '../db/d1-adapter';
import { ThirdPartyAdapter } from '../adapters/third-party';
import { notifyNewDraw } from '../services/webhook-service';
import type { LotteryType } from '../db/types';

const LOTTERY_SCHEDULE: Record<string, { type: LotteryType; name: string }> = {
  '30 13 * * 0,2,4': { type: 'ssq', name: '双色球' },
  '25 13 * * 1,3,5': { type: 'dlt', name: '大乐透' },
  '15 13 * * *': { type: 'fc3d', name: '福彩3D' },
};

export async function handleScheduled(env: { DB: D1Database }) {
  const db = new D1Adapter(env.DB);
  const adapter = new ThirdPartyAdapter();

  for (const [, config] of Object.entries(LOTTERY_SCHEDULE)) {
    try {
      const latest = await adapter.fetchLatest(config.type);
      if (!latest) continue;

      const existing = await db.checkDrawExists(config.type, [latest.issue]);
      if (existing.length > 0) continue;

      if (config.type === 'ssq') {
        await db.insertSSQDraw({
          issue: latest.issue,
          draw_date: latest.draw_date,
          week: latest.week ?? null,
          red_balls: JSON.stringify(latest.numbers.front),
          blue_ball: latest.numbers.back[0] ?? '00',
          pool_amount: latest.pool_amount ?? null,
          sales_amount: latest.sales_amount ?? null,
          source: 'official',
          prize_details: latest.prize_details ? JSON.stringify(latest.prize_details) : null,
        });
      } else if (config.type === 'dlt') {
        await db.insertDLTDraw({
          issue: latest.issue,
          draw_date: latest.draw_date,
          week: latest.week ?? null,
          front_zone: JSON.stringify(latest.numbers.front),
          back_zone: JSON.stringify(latest.numbers.back),
          pool_amount: latest.pool_amount ?? null,
          sales_amount: latest.sales_amount ?? null,
          source: 'official',
          prize_details: latest.prize_details ? JSON.stringify(latest.prize_details) : null,
        });
      } else {
        await db.insertSmallDraw({
          type: config.type,
          issue: latest.issue,
          draw_date: latest.draw_date,
          numbers: JSON.stringify([...latest.numbers.front, ...latest.numbers.back]),
          sales_amount: latest.sales_amount ?? null,
          source: 'official',
          prize_details: latest.prize_details ? JSON.stringify(latest.prize_details) : null,
        });
      }

      await notifyNewDraw(db, latest);
    } catch (err) {
      console.error(`定时任务失败 ${config.name}:`, err);
    }
  }
}
