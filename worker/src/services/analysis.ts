import type { SSQDraw, DLTDraw, SmallDraw, LotteryType } from '../db/types';

export interface HotColdResult {
  hot: { number: string; count: number }[];
  cold: { number: string; count: number }[];
}

export interface MissingResult {
  numbers: { number: string; missing: number; avg_missing: number }[];
}

export function analyzeHotCold(draws: (SSQDraw | DLTDraw | SmallDraw)[], type: LotteryType): HotColdResult {
  const countMap = new Map<string, number>();

  for (const draw of draws) {
    const numbers = extractNumbers(draw, type);
    for (const n of numbers) {
      countMap.set(n, (countMap.get(n) ?? 0) + 1);
    }
  }

  const sorted = [...countMap.entries()]
    .map(([number, count]) => ({ number, count }))
    .sort((a, b) => b.count - a.count);

  return {
    hot: sorted.slice(0, 10),
    cold: sorted.slice(-10).reverse(),
  };
}

export function analyzeMissing(draws: (SSQDraw | DLTDraw | SmallDraw)[], type: LotteryType): MissingResult {
  const lastSeen = new Map<string, number>();
  const totalMissing = new Map<string, number>();
  const appearCount = new Map<string, number>();

  const reversed = [...draws].reverse();
  for (let i = 0; i < reversed.length; i++) {
    const numbers = extractNumbers(reversed[i], type);
    for (const n of numbers) {
      if (lastSeen.has(n)) {
        const gap = i - lastSeen.get(n)!;
        totalMissing.set(n, (totalMissing.get(n) ?? 0) + gap);
        appearCount.set(n, (appearCount.get(n) ?? 0) + 1);
      }
      lastSeen.set(n, i);
    }
  }

  const numbers = getAllPossibleNumbers(type);
  return {
    numbers: numbers.map(n => {
      const last = lastSeen.get(n);
      const missing = last !== undefined ? draws.length - 1 - last : draws.length;
      const count = appearCount.get(n) ?? 0;
      const avg_missing = count > 0 ? (totalMissing.get(n) ?? 0) / count : 0;
      return { number: n, missing, avg_missing: Math.round(avg_missing * 10) / 10 };
    }),
  };
}

export function analyzeFeatures(draws: (SSQDraw | DLTDraw | SmallDraw)[], type: LotteryType) {
  return draws.map(draw => {
    const numbers = extractNumbers(draw, type);
    const ints = numbers.map(Number);
    const odd = ints.filter(n => n % 2 === 1).length;
    const even = ints.length - odd;
    const big = ints.filter(n => type === 'ssq' ? n > 16 : type === 'dlt' ? n > 12 : n > 4).length;
    const small = ints.length - big;
    return { issue: (draw as any).issue, odd, even, big, small, sum: ints.reduce((a, b) => a + b, 0) };
  });
}

function parseBalls(s: string): string[] {
  if (!s) return [];
  try { const arr = JSON.parse(s); if (Array.isArray(arr)) return arr.map(String); } catch {}
  return s.split(',').map(v => v.trim()).filter(Boolean);
}

function extractNumbers(draw: SSQDraw | DLTDraw | SmallDraw, type: LotteryType): string[] {
  if (type === 'ssq') return parseBalls((draw as SSQDraw).red_balls);
  if (type === 'dlt') return parseBalls((draw as DLTDraw).front_zone);
  return parseBalls((draw as SmallDraw).numbers);
}

function getAllPossibleNumbers(type: LotteryType): string[] {
  if (type === 'ssq') return Array.from({ length: 33 }, (_, i) => String(i + 1).padStart(2, '0'));
  if (type === 'dlt') return Array.from({ length: 35 }, (_, i) => String(i + 1).padStart(2, '0'));
  return Array.from({ length: 10 }, (_, i) => String(i));
}
