<template>
  <header class="header">
    <div class="logo">🎱 彩票助手</div>
    <nav class="nav-tabs">
      <button
        v-for="tab in tabs"
        :key="tab.value"
        :class="['tab', { active: lotteryType === tab.value }]"
        @click="$emit('update:lotteryType', tab.value)"
      >{{ tab.label }}</button>
    </nav>
  </header>
</template>

<script setup lang="ts">
import type { LotteryType } from '../api/types';

defineProps<{ lotteryType: LotteryType }>();
defineEmits<{ 'update:lotteryType': [type: LotteryType] }>();

const tabs = [
  { value: 'ssq' as LotteryType, label: '双色球' },
  { value: 'dlt' as LotteryType, label: '大乐透' },
  { value: 'fc3d' as LotteryType, label: '福彩3D' },
  { value: 'pl3' as LotteryType, label: '排列3' },
  { value: 'pl5' as LotteryType, label: '排列5' },
];
</script>

<style scoped>
.header {
  background: #2d2d2d;
  padding: 16px 20px;
  border-radius: 8px;
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.logo { color: #569cd6; font-size: 18px; font-weight: bold; }
.nav-tabs { display: flex; gap: 12px; }
.tab {
  background: none;
  border: none;
  color: #d4d4d4;
  cursor: pointer;
  padding: 6px 14px;
  border-radius: 4px;
  font-size: 14px;
}
.tab.active { background: #0e639c; color: white; }
.tab:hover { background: #404040; }
</style>
