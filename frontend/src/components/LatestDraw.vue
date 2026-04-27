<template>
  <div class="card" v-if="draw">
    <h3>最新开奖 - {{ typeName }} 第{{ draw.issue }}期</h3>
    <div class="balls">
      <template v-if="type === 'ssq'">
        <span v-for="n in parseBalls(draw.red_balls)" :key="n" class="ball red">{{ n }}</span>
        <span class="ball blue">{{ draw.blue_ball }}</span>
      </template>
      <template v-else-if="type === 'dlt'">
        <span v-for="n in parseBalls(draw.front_zone)" :key="n" class="ball red">{{ n }}</span>
        <span v-for="n in parseBalls(draw.back_zone)" :key="n" class="ball blue">{{ n }}</span>
      </template>
      <template v-else>
        <span v-for="n in parseBalls(draw.numbers)" :key="n" class="ball red">{{ n }}</span>
      </template>
    </div>
    <div class="meta">
      <span v-if="draw.draw_date">开奖日期：{{ draw.draw_date }}{{ draw.week ? '（' + draw.week + '）' : '' }}</span>
      <span v-if="draw.pool_amount">奖池金额：¥{{ formatMoney(draw.pool_amount) }}</span>
      <span v-if="draw.sales_amount">销售额：¥{{ formatMoney(draw.sales_amount) }}</span>
    </div>
    <div class="prize-section" v-if="prizeDetails.length">
      <table class="prize-table">
        <thead>
          <tr>
            <th>奖级</th>
            <th>中奖注数</th>
            <th>单注奖金</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="p in prizeDetails" :key="p.prize_level">
            <td>{{ p.prize_level }}</td>
            <td>{{ p.prize_count }} 注</td>
            <td class="amount">{{ p.prize_amount ? '¥' + formatPrize(p.prize_amount) : '-' }}</td>
          </tr>
        </tbody>
      </table>
    </div>
    <div class="locations" v-if="winningLocations.length">
      <div class="loc-label">一等奖中奖地区</div>
      <div class="loc-text">{{ locationText }}</div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, computed } from 'vue';
import type { LotteryType, PrizeDetail, WinningLocation } from '../api/types';
import { getLatest, getDrawDetail } from '../api/client';

const props = defineProps<{ type: LotteryType }>();
const draw = ref<any>(null);
const prizeDetails = ref<PrizeDetail[]>([]);
const winningLocations = ref<WinningLocation[]>([]);

const typeName = computed(() => {
  const map: Record<string, string> = { ssq: '双色球', dlt: '大乐透', fc3d: '福彩3D', pl3: '排列3', pl5: '排列5' };
  return map[props.type] ?? '';
});

const locationText = computed(() => {
  const level1 = winningLocations.value.filter(l => l.prize_level === '一等奖');
  if (!level1.length) return '';
  return level1.map(l => l.location + l.win_count + '注').join(' · ');
});

watch(() => props.type, async (t) => {
  draw.value = await getLatest(t);
  if (draw.value) {
    try {
      const detail = await getDrawDetail(t, draw.value.issue);
      prizeDetails.value = detail.prize_details ?? [];
      winningLocations.value = detail.winning_locations ?? [];
    } catch {
      prizeDetails.value = [];
      winningLocations.value = [];
    }
  }
}, { immediate: true });

function parseBalls(s: string): string[] {
  if (!s) return [];
  try { const arr = JSON.parse(s); if (Array.isArray(arr)) return arr; } catch {}
  return s.split(',').map(v => v.trim()).filter(Boolean);
}
function formatMoney(n: number) { return n.toLocaleString(); }
function formatPrize(n: number) { return n.toLocaleString(); }
</script>

<style scoped>
.card {
  background: #2d2d2d;
  padding: 20px;
  border-radius: 8px;
}
h3 { margin-bottom: 16px; font-size: 16px; }
.balls { display: flex; gap: 10px; margin-bottom: 16px; }
.ball {
  width: 45px; height: 45px;
  border-radius: 50%;
  display: flex; align-items: center; justify-content: center;
  font-weight: bold; font-size: 16px; color: white;
}
.ball.red { background: #e74c3c; }
.ball.blue { background: #3498db; }
.meta { display: flex; gap: 20px; color: #808080; font-size: 14px; margin-bottom: 16px; }
.prize-section { border-top: 1px solid #404040; padding-top: 15px; }
.prize-table { width: 100%; border-collapse: collapse; color: #d4d4d4; font-size: 13px; }
.prize-table th, .prize-table td { padding: 8px; text-align: left; border-bottom: 1px solid #404040; }
.prize-table th { font-weight: bold; color: #808080; }
.amount { color: #e74c3c; }
.locations { margin-top: 12px; padding-top: 12px; border-top: 1px solid #404040; }
.loc-label { color: #808080; font-size: 12px; margin-bottom: 6px; }
.loc-text { color: #d4d4d4; font-size: 12px; line-height: 1.6; }
</style>
