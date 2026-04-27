<template>
  <div class="tools-page">
    <div class="page-header">
      <h2>🔧 号码工具</h2>
      <router-link to="/" class="back-link">← 返回首页</router-link>
    </div>

    <div class="tools-grid">
      <!-- 随机选号 -->
      <div class="tool-card">
        <h3>🎲 随机选号</h3>
        <p class="tool-desc">随机生成一组号码</p>
        <div class="tool-content">
          <div class="generated-numbers" v-if="randomNumbers.length">
            <div class="number-display">
              <span v-for="n in randomNumbers" :key="n" class="ball red">{{ n }}</span>
            </div>
          </div>
          <button class="tool-btn" @click="generateRandom">生成号码</button>
        </div>
      </div>

      <!-- 号码对比 -->
      <div class="tool-card">
        <h3>🔍 号码对比</h3>
        <p class="tool-desc">对比两组号码的差异</p>
        <div class="tool-content">
          <div class="input-group">
            <label>号码组1（逗号分隔）</label>
            <input v-model="compareInput1" placeholder="例: 01,05,12,18,25,33" />
          </div>
          <div class="input-group">
            <label>号码组2（逗号分隔）</label>
            <input v-model="compareInput2" placeholder="例: 02,05,15,18,20,30" />
          </div>
          <button class="tool-btn" @click="compareNumbers">对比</button>
          <div v-if="compareResult" class="compare-result">
            <div class="result-item">
              <span class="label">相同号码：</span>
              <span class="value highlight">{{ compareResult.same.join(', ') || '无' }}</span>
            </div>
            <div class="result-item">
              <span class="label">仅在组1：</span>
              <span class="value">{{ compareResult.only1.join(', ') || '无' }}</span>
            </div>
            <div class="result-item">
              <span class="label">仅在组2：</span>
              <span class="value">{{ compareResult.only2.join(', ') || '无' }}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- 号码统计 -->
      <div class="tool-card">
        <h3>📊 号码频率统计</h3>
        <p class="tool-desc">统计号码在历史中的出现频率</p>
        <div class="tool-content">
          <div class="input-group">
            <label>号码（逗号分隔，留空则统计所有号码）</label>
            <input v-model="freqInput" placeholder="例: 01,05,12" />
          </div>
          <button class="tool-btn" @click="checkFrequency" :disabled="loading.freq">
            {{ loading.freq ? '查询中...' : '查询频率' }}
          </button>
          <div v-if="freqResult.length" class="freq-result">
            <div v-for="item in freqResult" :key="item.number" class="freq-item">
              <span class="ball red small">{{ item.number }}</span>
              <span class="freq-bar">
                <span class="bar-fill" :style="{ width: (item.count / maxFreq * 100) + '%' }"></span>
              </span>
              <span class="freq-count">{{ item.count }}次</span>
            </div>
          </div>
        </div>
      </div>

      <!-- 号码遗漏 -->
      <div class="tool-card">
        <h3>⏳ 号码遗漏查询</h3>
        <p class="tool-desc">查询号码当前遗漏期数</p>
        <div class="tool-content">
          <button class="tool-btn" @click="checkMissing" :disabled="loading.missing">
            {{ loading.missing ? '查询中...' : '查询遗漏' }}
          </button>
          <div v-if="missingResult.length" class="missing-result">
            <div v-for="item in missingResult" :key="item.number" class="missing-item">
              <span class="ball red small">{{ item.number }}</span>
              <span class="missing-info">
                <span>当前遗漏: <strong>{{ item.current }}</strong> 期</span>
                <span>平均遗漏: <strong>{{ item.average }}</strong> 期</span>
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import type { LotteryType } from '../api/types';
import { getHotCold, getMissing } from '../api/client';

const props = withDefaults(defineProps<{ lotteryType?: LotteryType }>(), {
  lotteryType: 'ssq',
});

// 随机选号
const randomNumbers = ref<string[]>([]);

function generateRandom() {
  const max = props.lotteryType === 'ssq' ? 33 : props.lotteryType === 'dlt' ? 35 : 9;
  const count = props.lotteryType === 'ssq' ? 6 : props.lotteryType === 'dlt' ? 5 : 3;
  const nums = new Set<string>();
  while (nums.size < count) {
    const n = String(Math.floor(Math.random() * max) + 1).padStart(2, '0');
    nums.add(n);
  }
  randomNumbers.value = [...nums].sort();
}

// 号码对比
const compareInput1 = ref('');
const compareInput2 = ref('');
const compareResult = ref<{ same: string[]; only1: string[]; only2: string[] } | null>(null);

function compareNumbers() {
  const arr1 = compareInput1.value.split(',').map(s => s.trim()).filter(Boolean);
  const arr2 = compareInput2.value.split(',').map(s => s.trim()).filter(Boolean);
  const set1 = new Set(arr1);
  const set2 = new Set(arr2);
  const same = arr1.filter(n => set2.has(n));
  const only1 = arr1.filter(n => !set2.has(n));
  const only2 = arr2.filter(n => !set1.has(n));
  compareResult.value = { same, only1, only2 };
}

// 号码频率
const freqInput = ref('');
const freqResult = ref<{ number: string; count: number }[]>([]);
const loading = ref({ freq: false, missing: false });

const maxFreq = computed(() => Math.max(...freqResult.value.map(f => f.count), 1));

async function checkFrequency() {
  loading.value.freq = true;
  try {
    const data = await getHotCold(props.lotteryType, 50);
    const allNumbers = [...(data.hot || []), ...(data.cold || [])];
    const filterNums = freqInput.value ? freqInput.value.split(',').map(s => s.trim()) : [];
    freqResult.value = filterNums.length
      ? allNumbers.filter(n => filterNums.includes(n.number))
      : allNumbers.sort((a, b) => b.count - a.count).slice(0, 20);
  } catch {
    freqResult.value = [];
  } finally {
    loading.value.freq = false;
  }
}

// 号码遗漏
const missingResult = ref<{ number: string; current: number; average: number }[]>([]);

async function checkMissing() {
  loading.value.missing = true;
  try {
    const data = await getMissing(props.lotteryType, 30);
    missingResult.value = (data.numbers || data || []).slice(0, 20);
  } catch {
    missingResult.value = [];
  } finally {
    loading.value.missing = false;
  }
}
</script>

<style scoped>
.tools-page { padding: 20px; }
.page-header {
  display: flex; justify-content: space-between; align-items: center;
  margin-bottom: 24px; padding-bottom: 16px; border-bottom: 1px solid #404040;
}
h2 { font-size: 20px; }
.back-link { color: #569cd6; text-decoration: none; font-size: 14px; }
.back-link:hover { text-decoration: underline; }

.tools-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 20px; }

.tool-card {
  background: #2d2d2d; border-radius: 8px; padding: 20px;
}
.tool-card h3 { font-size: 16px; margin-bottom: 8px; }
.tool-desc { color: #808080; font-size: 13px; margin-bottom: 16px; }
.tool-content { display: flex; flex-direction: column; gap: 12px; }

.input-group { display: flex; flex-direction: column; gap: 4px; }
.input-group label { font-size: 12px; color: #808080; }
.input-group input {
  background: #1e1e1e; border: 1px solid #404040; color: #d4d4d4;
  padding: 8px 12px; border-radius: 4px; font-size: 13px;
}

.tool-btn {
  background: #0e639c; color: white; border: none;
  padding: 10px 16px; border-radius: 6px; cursor: pointer;
  font-size: 14px; transition: background 0.2s;
}
.tool-btn:hover { background: #1177bb; }
.tool-btn:disabled { opacity: 0.5; cursor: not-allowed; }

.generated-numbers { margin-bottom: 8px; }
.number-display { display: flex; gap: 8px; flex-wrap: wrap; }
.ball {
  width: 36px; height: 36px; border-radius: 50%;
  display: flex; align-items: center; justify-content: center;
  font-size: 14px; font-weight: bold; color: white;
}
.ball.red { background: #e74c3c; }
.ball.blue { background: #3498db; }
.ball.small { width: 28px; height: 28px; font-size: 12px; }

.compare-result { margin-top: 8px; }
.result-item { margin-bottom: 6px; font-size: 13px; }
.result-item .label { color: #808080; }
.result-item .value { color: #d4d4d4; }
.result-item .value.highlight { color: #2ecc71; font-weight: bold; }

.freq-result { max-height: 300px; overflow-y: auto; }
.freq-item { display: flex; align-items: center; gap: 10px; margin-bottom: 8px; }
.freq-bar {
  flex: 1; height: 16px; background: #1e1e1e; border-radius: 4px; overflow: hidden;
}
.bar-fill {
  height: 100%; background: linear-gradient(90deg, #3498db, #2ecc71);
  border-radius: 4px; transition: width 0.3s;
}
.freq-count { font-size: 12px; color: #808080; min-width: 40px; text-align: right; }

.missing-result { max-height: 300px; overflow-y: auto; }
.missing-item { display: flex; align-items: center; gap: 12px; margin-bottom: 8px; }
.missing-info { display: flex; gap: 16px; font-size: 12px; color: #808080; }
.missing-info strong { color: #d4d4d4; }

@media (max-width: 900px) {
  .tools-grid { grid-template-columns: 1fr; }
}
</style>
