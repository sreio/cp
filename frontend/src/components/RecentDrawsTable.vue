<template>
  <div class="card">
    <div class="table-header">
      <h3>最近开奖记录</h3>
      <div class="header-actions">
        <button class="view-more" @click="showMore = !showMore">
          {{ showMore ? '收起' : '查看更多 →' }}
        </button>
      </div>
    </div>
    <div class="table-wrap">
      <table>
        <thead>
          <tr class="header-row-1">
            <th rowspan="2">期号</th>
            <th rowspan="2">开奖日期</th>
            <th colspan="2">开奖号码</th>
            <th rowspan="2">总销售额<br>（元）</th>
            <th colspan="2">一等奖</th>
            <th colspan="2">二等奖</th>
            <th rowspan="2">奖池（元）</th>
            <th rowspan="2">详情</th>
          </tr>
          <tr class="header-row-2">
            <th>前区</th>
            <th>后区</th>
            <th>注数</th>
            <th>单注奖金<br>（元）</th>
            <th>注数</th>
            <th>单注奖金<br>（元）</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="d in displayDraws" :key="d.issue" class="draw-row">
            <td class="nowrap">{{ d.issue }}</td>
            <td class="nowrap">{{ d.draw_date }}</td>
            <td>
              <div class="ball-row">
                <span
                  v-for="n in getFrontBalls(d)"
                  :key="'f'+n"
                  class="mini-ball red"
                >{{ n }}</span>
              </div>
            </td>
            <td>
              <div class="ball-row">
                <span
                  v-for="n in getBackBalls(d)"
                  :key="'b'+n"
                  class="mini-ball blue"
                >{{ n }}</span>
              </div>
            </td>
            <td class="nowrap text-right">{{ d.sales_amount ? formatNum(d.sales_amount) : '-' }}</td>
            <td class="text-center">{{ getPrize(d, 1, 'count') }}</td>
            <td class="nowrap text-right prize-amount">{{ getPrize(d, 1, 'amount') }}</td>
            <td class="text-center">{{ getPrize(d, 2, 'count') }}</td>
            <td class="nowrap text-right prize-amount">{{ getPrize(d, 2, 'amount') }}</td>
            <td class="nowrap text-right prize-amount">{{ d.pool_amount ? formatNum(d.pool_amount) : '-' }}</td>
            <td class="text-center">
              <button class="detail-btn" @click="$emit('showDetail', d.issue)">详情</button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, computed } from 'vue';
import type { LotteryType, PrizeDetail } from '../api/types';
import { getHistory, getDrawDetail } from '../api/client';

const props = defineProps<{ type: LotteryType }>();
defineEmits<{ showDetail: [issue: string] }>();

interface DrawWithDetails {
  [key: string]: any;
  prizeDetails?: PrizeDetail[];
}

const draws = ref<DrawWithDetails[]>([]);
const showMore = ref(false);

const displayDraws = computed(() => {
  return showMore.value ? draws.value : draws.value.slice(0, 5);
});

watch(() => props.type, async (t) => {
  const size = showMore.value ? 20 : 5;
  const result = await getHistory(t, 1, size);
  const rawDraws: DrawWithDetails[] = result.data ?? [];
  // Fetch prize details for each draw
  for (const d of rawDraws) {
    try {
      const detail = await getDrawDetail(t, d.issue);
      d.prizeDetails = detail.prize_details ?? [];
    } catch {
      d.prizeDetails = [];
    }
  }
  draws.value = rawDraws;
}, { immediate: true });

watch(showMore, async (expanded) => {
  if (expanded && draws.value.length <= 5) {
    const result = await getHistory(props.type, 1, 20);
    const rawDraws: DrawWithDetails[] = result.data ?? [];
    for (const d of rawDraws) {
      try {
        const detail = await getDrawDetail(props.type, d.issue);
        d.prizeDetails = detail.prize_details ?? [];
      } catch {
        d.prizeDetails = [];
      }
    }
    draws.value = rawDraws;
  }
});

function splitBalls(s: string): string[] {
  if (!s) return [];
  try { const arr = JSON.parse(s); if (Array.isArray(arr)) return arr; } catch {}
  return s.split(',').map(v => v.trim()).filter(Boolean);
}

function getFrontBalls(d: DrawWithDetails): string[] {
  if (d.red_balls) return splitBalls(d.red_balls);
  if (d.front_zone) return splitBalls(d.front_zone);
  if (d.numbers) return splitBalls(d.numbers);
  return [];
}

function getBackBalls(d: DrawWithDetails): string[] {
  if (d.blue_ball) return [d.blue_ball];
  if (d.back_zone) return splitBalls(d.back_zone);
  return [];
}

function getPrize(d: DrawWithDetails, level: number, field: 'count' | 'amount'): string {
  const pd = d.prizeDetails?.find((p: PrizeDetail) => p.prize_level.includes(String(level === 1 ? '一' : '二')));
  if (!pd) return '-';
  if (field === 'count') {
    return pd.prize_count === 0 ? '—' : String(pd.prize_count);
  }
  if (pd.prize_amount === null || pd.prize_amount === 0) return '—';
  return formatNum(pd.prize_amount);
}

function formatNum(n: number): string {
  return n.toLocaleString();
}
</script>

<style scoped>
.card { background: #2d2d2d; padding: 20px; border-radius: 8px; margin-top: 16px; }
.table-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px; }
h3 { font-size: 16px; }
.header-actions { display: flex; gap: 10px; }
.view-more {
  background: #404040; color: #d4d4d4; border: none; padding: 6px 12px;
  border-radius: 4px; cursor: pointer; font-size: 12px;
}
.view-more:hover { background: #505050; }
.table-wrap { overflow-x: auto; }
table { width: 100%; border-collapse: collapse; color: #d4d4d4; font-size: 12px; min-width: 900px; }
th { padding: 10px 6px; text-align: center; font-weight: bold; color: #808080; background: #1e1e1e; border-bottom: 2px solid #404040; }
td { padding: 10px 6px; border-bottom: 1px solid #404040; }
.nowrap { white-space: nowrap; }
.text-right { text-align: right; }
.text-center { text-align: center; }
.prize-amount { color: #e74c3c; }
.ball-row { display: flex; gap: 3px; justify-content: center; flex-wrap: wrap; }
.mini-ball {
  width: 24px; height: 24px; border-radius: 50%;
  display: flex; align-items: center; justify-content: center;
  font-size: 10px; color: white; font-weight: bold;
}
.mini-ball.red { background: #e74c3c; }
.mini-ball.blue { background: #3498db; }
.detail-btn {
  background: #0e639c; color: white; border: none;
  padding: 4px 10px; border-radius: 4px; cursor: pointer; font-size: 11px;
}
.detail-btn:hover { background: #1177bb; }
</style>
