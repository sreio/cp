<template>
  <div class="banner">
    <div class="info">
      <span class="issue">🎯 正在销售 第{{ currentIssue }}期</span>
      <span>⏰ 截止投注：{{ deadline }}</span>
      <span>📅 {{ schedule }}</span>
    </div>
    <button class="bet-btn">立即投注</button>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import type { LotteryType } from '../api/types';

const props = defineProps<{ type: LotteryType }>();

const schedule = computed(() => {
  const map: Record<string, string> = {
    ssq: '每周二、四、日 21:30开奖',
    dlt: '每周一、三、六 21:25开奖',
    fc3d: '每日 21:15开奖',
    pl3: '每日 21:15开奖',
    pl5: '每日 21:15开奖',
  };
  return map[props.type] ?? '';
});

const currentIssue = computed(() => {
  const now = new Date();
  return `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`;
});

const deadline = computed(() => {
  const now = new Date();
  now.setHours(21, 0, 0, 0);
  return now.toISOString().slice(0, 19).replace('T', ' ');
});
</script>

<style scoped>
.banner {
  background: linear-gradient(135deg, #e74c3c, #c0392b);
  padding: 12px 20px;
  border-radius: 8px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 16px;
}
.info { display: flex; gap: 24px; color: white; font-size: 14px; }
.issue { font-weight: bold; }
.bet-btn {
  background: rgba(255,255,255,0.2);
  color: white;
  border: 1px solid rgba(255,255,255,0.4);
  padding: 8px 20px;
  border-radius: 6px;
  cursor: pointer;
  font-weight: bold;
}
</style>
