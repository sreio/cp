<template>
  <div class="card">
    <h3>最近开奖记录</h3>
    <div class="table-wrap">
      <table>
        <thead>
          <tr>
            <th>期号</th>
            <th>开奖日期</th>
            <th>开奖号码</th>
            <th>销售额</th>
            <th>详情</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="d in draws" :key="d.issue">
            <td>{{ d.issue }}</td>
            <td>{{ d.draw_date }}</td>
            <td class="numbers">{{ formatNumbers(d) }}</td>
            <td>{{ d.sales_amount ? formatMoney(d.sales_amount) : '-' }}</td>
            <td><button class="detail-btn">查看</button></td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue';
import type { LotteryType } from '../api/types';
import { getHistory } from '../api/client';

const props = defineProps<{ type: LotteryType }>();
const draws = ref<any[]>([]);

watch(() => props.type, async (t) => {
  const result = await getHistory(t, 1, 5);
  draws.value = result.data ?? [];
}, { immediate: true });

function formatNumbers(d: any) {
  if (d.red_balls) {
    const red = JSON.parse(d.red_balls).join(' ');
    return `${red} + ${d.blue_ball}`;
  }
  if (d.front_zone) {
    const front = JSON.parse(d.front_zone).join(' ');
    const back = JSON.parse(d.back_zone).join(' ');
    return `${front} + ${back}`;
  }
  return JSON.parse(d.numbers).join(' ');
}

function formatMoney(n: number) { return (n / 100000000).toFixed(2) + '亿'; }
</script>

<style scoped>
.card { background: #2d2d2d; padding: 20px; border-radius: 8px; margin-top: 16px; }
h3 { margin-bottom: 16px; font-size: 16px; }
.table-wrap { overflow-x: auto; }
table { width: 100%; border-collapse: collapse; font-size: 13px; }
th, td { padding: 10px 8px; text-align: left; border-bottom: 1px solid #404040; }
th { color: #808080; font-weight: bold; }
.numbers { white-space: nowrap; }
.detail-btn {
  background: #0e639c; color: white; border: none;
  padding: 4px 12px; border-radius: 4px; cursor: pointer; font-size: 12px;
}
</style>
