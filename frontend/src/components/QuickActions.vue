<template>
  <div class="card">
    <h3>快捷操作</h3>
    <div class="actions">
      <button class="action-btn primary" @click="handleRecommend" :disabled="loading.recommend">
        <span class="icon">🎯</span>
        <span>{{ loading.recommend ? '推荐中...' : '推荐号码' }}</span>
      </button>
      <button class="action-btn" @click="showNumberChecker = true">
        <span class="icon">📋</span>
        <span>号码查奖</span>
      </button>
      <button class="action-btn" @click="showPrizeCalc = true">
        <span class="icon">💰</span>
        <span>奖金计算</span>
      </button>
      <button class="action-btn" @click="showTip('号码工具功能开发中')">
        <span class="icon">🔧</span>
        <span>号码工具</span>
      </button>
      <button class="action-btn" @click="showTip('投注工具功能开发中')">
        <span class="icon">🎰</span>
        <span>投注工具</span>
      </button>
      <router-link to="/analysis" class="action-btn">
        <span class="icon">📊</span>
        <span>数据分析</span>
      </router-link>
      <button class="action-btn" @click="handlePull" :disabled="loading.pull">
        <span class="icon">📥</span>
        <span>{{ loading.pull ? '拉取中...' : '拉取数据' }}</span>
      </button>
    </div>
    <div v-if="result" class="result">
      <div class="result-header">
        <span>{{ resultTitle }}</span>
        <button class="close-result" @click="result = ''">×</button>
      </div>
      <pre>{{ result }}</pre>
    </div>
    <div v-if="tip" class="tip" @click="tip = ''">{{ tip }}</div>

    <NumberChecker :visible="showNumberChecker" @close="showNumberChecker = false" />
    <PrizeCalculator :visible="showPrizeCalc" @close="showPrizeCalc = false" />
  </div>
</template>

<script setup lang="ts">
import { ref, reactive } from 'vue';
import type { LotteryType } from '../api/types';
import { recommendNumbers, pullData } from '../api/client';
import NumberChecker from './NumberChecker.vue';
import PrizeCalculator from './PrizeCalculator.vue';

const props = defineProps<{ type: LotteryType }>();

const result = ref('');
const resultTitle = ref('');
const tip = ref('');
const showNumberChecker = ref(false);
const showPrizeCalc = ref(false);
const loading = reactive({ recommend: false, pull: false });

function showTip(msg: string) {
  tip.value = msg;
  setTimeout(() => { tip.value = ''; }, 2000);
}

async function handleRecommend() {
  loading.recommend = true;
  result.value = '';
  resultTitle.value = '推荐号码';
  try {
    const data = await recommendNumbers(props.type, 5);
    result.value = data.numbers.map((nums: string[], i: number) =>
      `第${i + 1}组: ${nums.join(' ')}`
    ).join('\n');
  } catch (e: any) {
    result.value = '推荐失败: ' + (e.message || e);
  } finally {
    loading.recommend = false;
  }
}

async function handlePull() {
  loading.pull = true;
  result.value = '';
  resultTitle.value = '拉取数据';
  try {
    const now = new Date();
    const end = now.toISOString().slice(0, 10);
    const start = new Date(now.getTime() - 30 * 86400000).toISOString().slice(0, 10);
    const data = await pullData({
      type: props.type,
      mode: 'date_range',
      start_date: start,
      end_date: end,
    });
    result.value = `成功: ${data.pulled} 条\n跳过: ${data.skipped} 条\n更新: ${data.updated} 条`;
    if (data.errors?.length) {
      result.value += '\n错误:\n' + data.errors.join('\n');
    }
  } catch (e: any) {
    result.value = '拉取失败: ' + (e.message || e);
  } finally {
    loading.pull = false;
  }
}
</script>

<style scoped>
.card { background: #2d2d2d; padding: 20px; border-radius: 8px; }
h3 { margin-bottom: 16px; font-size: 16px; }
.actions { display: flex; flex-direction: column; gap: 8px; }
.action-btn {
  display: flex; align-items: center; gap: 12px;
  background: #1e1e1e; border: 1px solid #404040; color: #d4d4d4;
  padding: 12px 16px; border-radius: 6px; cursor: pointer;
  font-size: 14px; text-align: left; text-decoration: none;
  transition: background 0.2s;
}
.action-btn:hover { background: #404040; }
.action-btn.primary { background: #0e639c; border-color: #0e639c; color: white; }
.action-btn.primary:hover { background: #1177bb; }
.action-btn:disabled { opacity: 0.5; cursor: not-allowed; }
.icon { font-size: 18px; }
.result {
  margin-top: 16px; padding: 12px;
  background: #1e1e1e; border-radius: 6px;
  max-height: 200px; overflow-y: auto;
}
.result-header {
  display: flex; justify-content: space-between; align-items: center;
  margin-bottom: 8px; color: #808080; font-size: 13px;
}
.close-result {
  background: none; border: none; color: #808080; cursor: pointer; font-size: 18px;
}
.result pre {
  font-size: 13px; color: #98c379;
  white-space: pre-wrap; word-break: break-all;
}
.tip {
  margin-top: 12px; padding: 10px; text-align: center;
  background: #1e1e1e; border-radius: 6px; color: #808080; font-size: 13px;
  cursor: pointer;
}
</style>
