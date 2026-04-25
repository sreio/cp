import type { LotteryType } from '../db/types';

export interface LotteryRules {
  type: LotteryType;
  frontCount: number;
  frontMax: number;
  backCount: number;
  backMax: number;
  name: string;
}

export const RULES: Record<LotteryType, LotteryRules> = {
  ssq: { type: 'ssq', frontCount: 6, frontMax: 33, backCount: 1, backMax: 16, name: '双色球' },
  dlt: { type: 'dlt', frontCount: 5, frontMax: 35, backCount: 2, backMax: 12, name: '大乐透' },
  fc3d: { type: 'fc3d', frontCount: 3, frontMax: 10, backCount: 0, backMax: 0, name: '福彩3D' },
  pl3: { type: 'pl3', frontCount: 3, frontMax: 10, backCount: 0, backMax: 0, name: '排列3' },
  pl5: { type: 'pl5', frontCount: 5, frontMax: 10, backCount: 0, backMax: 0, name: '排列5' },
};

export function generateNumbers(type: LotteryType, count: number = 1): string[][] {
  const rules = RULES[type];
  const results: string[][] = [];

  for (let i = 0; i < count; i++) {
    const front = pickRandom(rules.frontCount, rules.frontMax, type === 'ssq' || type === 'dlt');
    const back = rules.backCount > 0 ? pickRandom(rules.backCount, rules.backMax, true) : [];
    results.push([...front, ...back]);
  }
  return results;
}

function pickRandom(count: number, max: number, padZero: boolean): string[] {
  const nums = new Set<number>();
  while (nums.size < count) {
    nums.add(Math.floor(Math.random() * max) + 1);
  }
  return [...nums]
    .sort((a, b) => a - b)
    .map(n => padZero ? String(n).padStart(2, '0') : String(n));
}

export function checkPrize(
  type: LotteryType,
  userNumbers: { front: string[]; back: string[] },
  drawNumbers: { front: string[]; back: string[] },
): { level: string; frontMatch: number; backMatch: number } | null {
  const frontMatch = userNumbers.front.filter(n => drawNumbers.front.includes(n)).length;
  const backMatch = userNumbers.back.filter(n => drawNumbers.back.includes(n)).length;

  const levels = getPrizeLevels(type);
  for (const lvl of levels) {
    if (frontMatch >= lvl.front && backMatch >= lvl.back) {
      return { level: lvl.name, frontMatch, backMatch };
    }
  }
  return null;
}

function getPrizeLevels(type: LotteryType) {
  const levels: Record<string, { name: string; front: number; back: number }[]> = {
    ssq: [
      { name: '一等奖', front: 6, back: 1 },
      { name: '二等奖', front: 6, back: 0 },
      { name: '三等奖', front: 5, back: 1 },
      { name: '四等奖', front: 5, back: 0 },
      { name: '五等奖', front: 4, back: 1 },
      { name: '六等奖', front: 3, back: 1 },
      { name: '六等奖', front: 2, back: 1 },
      { name: '六等奖', front: 1, back: 1 },
      { name: '六等奖', front: 0, back: 1 },
    ],
    dlt: [
      { name: '一等奖', front: 5, back: 2 },
      { name: '二等奖', front: 5, back: 1 },
      { name: '三等奖', front: 5, back: 0 },
      { name: '四等奖', front: 4, back: 2 },
      { name: '四等奖', front: 4, back: 1 },
      { name: '五等奖', front: 4, back: 0 },
      { name: '五等奖', front: 3, back: 2 },
      { name: '六等奖', front: 3, back: 1 },
      { name: '六等奖', front: 2, back: 2 },
      { name: '七等奖', front: 3, back: 0 },
      { name: '七等奖', front: 2, back: 1 },
      { name: '七等奖', front: 1, back: 2 },
      { name: '七等奖', front: 0, back: 2 },
    ],
    fc3d: [{ name: '直选', front: 3, back: 0 }],
    pl3: [{ name: '直选', front: 3, back: 0 }],
    pl5: [{ name: '一等奖', front: 5, back: 0 }],
  };
  return levels[type] ?? [];
}
