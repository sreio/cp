<template>
  <div class="card" v-if="draw">
    <h3>最新开奖 - {{ typeName }} 第{{ draw.issue }}期</h3>
    <div class="balls">
      <template v-if="type === 'ssq'">
        <span v-for="n in parseJSON(draw.red_balls)" :key="n" class="ball red">{{ n }}</span>
        <span class="ball blue">{{ draw.blue_ball }}</span>
      </template>
      <template v-else-if="type === 'dlt'">
        <span v-for="n in parseJSON(draw.front_zone)" :key="n" class="ball red">{{ n }}</span>
        <span v-for="n in parseJSON(draw.back_zone)" :key="n" class="ball blue">{{ n }}</span>
      </template>
      <template v-else>
        <span v-for="n in parseJSON(draw.numbers)" :key="n" class="ball red">{{ n }}</span>
      </template>
    </div>
    <div class="meta">
      <span v-if="draw.draw_date">开奖日期：{{ draw.draw_date }}</span>
      <span v-if="draw.pool_amount">奖池：¥{{ formatMoney(draw.pool_amount) }}</span>
      <span v-if="draw.sales_amount">销售：¥{{ formatMoney(draw.sales_amount) }}</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, computed } from 'vue';
import type { LotteryType } from '../api/types';
import { getLatest } from '../api/client';

const props = defineProps<{ type: LotteryType }>();
const draw = ref<any>(null);

const typeName = computed(() => {
  const map: Record<string, string> = { ssq: '双色球', dlt: '大乐透', fc3d: '福彩3D', pl3: '排列3', pl5: '排列5' };
  return map[props.type] ?? '';
});

watch(() => props.type, async (t) => {
  draw.value = await getLatest(t);
}, { immediate: true });

function parseJSON(s: string) { try { return JSON.parse(s); } catch { return []; } }
function formatMoney(n: number) { return (n / 100000000).toFixed(2) + '亿'; }
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
.meta { display: flex; gap: 20px; color: #808080; font-size: 14px; }
</style>
