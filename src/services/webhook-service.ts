import type { DatabaseAdapter } from '../db/adapter';
import type { DrawData } from '../adapters/types';

export async function notifyNewDraw(db: DatabaseAdapter, draw: DrawData) {
  const webhooks = await db.getWebhooks();
  const enabled = webhooks.filter(w => w.enabled && JSON.parse(w.events).includes('draw.new'));

  for (const webhook of enabled) {
    try {
      await sendNotification(webhook, draw);
    } catch (err) {
      console.error(`Webhook ${webhook.id} 发送失败:`, err);
    }
  }
}

async function sendNotification(webhook: any, draw: DrawData) {
  const message = formatMessage(draw);

  switch (webhook.type) {
    case 'dingtalk':
      await sendDingtalk(webhook.url, webhook.secret, message);
      break;
    case 'wechat':
      await sendWechat(webhook.url, message);
      break;
    case 'feishu':
      await sendFeishu(webhook.url, webhook.secret, message);
      break;
    case 'generic':
      await sendGeneric(webhook.url, { event: 'draw.new', data: draw, message });
      break;
  }
}

function formatMessage(draw: DrawData): string {
  const front = draw.numbers.front.join(' ');
  const back = draw.numbers.back.join(' ');
  const pool = draw.pool_amount ? `奖池: ¥${(draw.pool_amount / 100000000).toFixed(2)}亿` : '';
  return `🎱 ${draw.type.toUpperCase()} 第${draw.issue}期开奖\n前区: ${front}\n后区: ${back}\n${pool}`;
}

async function sendDingtalk(url: string, secret: string | null, text: string) {
  let finalUrl = url;
  if (secret) {
    const timestamp = Date.now();
    const sign = await hmacSha256(secret, `${timestamp}\n${secret}`);
    finalUrl += `&timestamp=${timestamp}&sign=${encodeURIComponent(sign)}`;
  }

  await fetch(finalUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      msgtype: 'markdown',
      markdown: { title: '开奖通知', text },
    }),
  });
}

async function sendWechat(url: string, text: string) {
  await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      msgtype: 'markdown',
      markdown: { content: text },
    }),
  });
}

async function sendFeishu(url: string, secret: string | null, text: string) {
  await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      msg_type: 'text',
      content: { text },
    }),
  });
}

async function sendGeneric(url: string, payload: unknown) {
  await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
}

async function hmacSha256(secret: string, message: string): Promise<string> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw', encoder.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']
  );
  const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(message));
  return btoa(String.fromCharCode(...new Uint8Array(signature)));
}
