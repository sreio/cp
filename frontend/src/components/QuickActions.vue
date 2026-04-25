<template>
  <div class="card">
    <h3>快捷操作</h3>
    <div class="actions">
      <button v-for="action in actions" :key="action.label" class="action-btn" @click="action.handler">
        <span class="icon">{{ action.icon }}</span>
        <span>{{ action.label }}</span>
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { LotteryType } from '../api/types';

const props = defineProps<{ type: LotteryType }>();

const actions = [
  { icon: '🎯', label: '推荐号码', handler: () => {} },
  { icon: '📋', label: '号码查奖', handler: () => {} },
  { icon: '💰', label: '奖金计算', handler: () => {} },
  { icon: '🔧', label: '号码工具', handler: () => {} },
  { icon: '🎰', label: '投注工具', handler: () => {} },
  { icon: '📊', label: '数据分析', handler: () => {} },
  { icon: '📥', label: '拉取数据', handler: () => {} },
];
</script>

<style scoped>
.card { background: #2d2d2d; padding: 20px; border-radius: 8px; }
h3 { margin-bottom: 16px; font-size: 16px; }
.actions { display: flex; flex-direction: column; gap: 8px; }
.action-btn {
  display: flex; align-items: center; gap: 12px;
  background: #1e1e1e; border: 1px solid #404040; color: #d4d4d4;
  padding: 12px 16px; border-radius: 6px; cursor: pointer;
  font-size: 14px; text-align: left;
  transition: background 0.2s;
}
.action-btn:hover { background: #404040; }
.icon { font-size: 18px; }
</style>
