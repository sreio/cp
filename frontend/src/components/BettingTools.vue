<template>
  <div class="tools-page">
    <div class="page-header">
      <h2>🎰 投注工具</h2>
      <router-link to="/" class="back-link">← 返回首页</router-link>
    </div>

    <div class="tools-grid">
      <!-- 复式计算器 -->
      <div class="tool-card">
        <h3>🔢 复式计算器</h3>
        <p class="tool-desc">计算复式投注的注数和金额</p>
        <div class="tool-content">
          <div class="input-group" v-if="type === 'ssq'">
            <label>红球个数（6-16）</label>
            <input v-model.number="complex.redCount" type="number" min="6" max="16" />
          </div>
          <div class="input-group" v-if="type === 'ssq'">
            <label>蓝球个数（1-16）</label>
            <input v-model.number="complex.blueCount" type="number" min="1" max="16" />
          </div>
          <div class="input-group" v-if="type === 'dlt'">
            <label>前区个数（5-18）</label>
            <input v-model.number="complex.frontCount" type="number" min="5" max="18" />
          </div>
          <div class="input-group" v-if="type === 'dlt'">
            <label>后区个数（2-12）</label>
            <input v-model.number="complex.backCount" type="number" min="2" max="12" />
          </div>
          <button class="tool-btn" @click="calcComplex">计算</button>
          <div v-if="complexResult" class="calc-result">
            <div class="result-row">
              <span class="label">总注数：</span>
              <span class="value highlight">{{ complexResult.bets }} 注</span>
            </div>
            <div class="result-row">
              <span class="label">总金额：</span>
              <span class="value money">¥{{ complexResult.amount }}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- 胆拖计算器 -->
      <div class="tool-card">
        <h3>🎯 胆拖计算器</h3>
        <p class="tool-desc">计算胆拖投注的注数和金额</p>
        <div class="tool-content">
          <div class="input-group" v-if="type === 'ssq'">
            <label>红球胆码（1-5个，逗号分隔）</label>
            <input v-model="dantuo.danRed" placeholder="例: 01,05" />
          </div>
          <div class="input-group" v-if="type === 'ssq'">
            <label>红球拖码（逗号分隔）</label>
            <input v-model="dantuo.tuoRed" placeholder="例: 10,15,20,25" />
          </div>
          <div class="input-group" v-if="type === 'ssq'">
            <label>蓝球个数</label>
            <input v-model.number="dantuo.blueCount" type="number" min="1" max="16" />
          </div>
          <button class="tool-btn" @click="calcDantuo">计算</button>
          <div v-if="dantuoResult" class="calc-result">
            <div class="result-row">
              <span class="label">总注数：</span>
              <span class="value highlight">{{ dantuoResult.bets }} 注</span>
            </div>
            <div class="result-row">
              <span class="label">总金额：</span>
              <span class="value money">¥{{ dantuoResult.amount }}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- 奖金模拟器 -->
      <div class="tool-card">
        <h3>💰 奖金模拟器</h3>
        <p class="tool-desc">模拟不同中奖情况的奖金</p>
        <div class="tool-content">
          <div class="input-group">
            <label>选择中奖等级</label>
            <select v-model="prizeSim.level">
              <option v-for="l in prizeLevels" :key="l.value" :value="l.value">{{ l.label }}</option>
            </select>
          </div>
          <div class="input-group">
            <label>注数</label>
            <input v-model.number="prizeSim.count" type="number" min="1" />
          </div>
          <button class="tool-btn" @click="calcPrize">计算奖金</button>
          <div v-if="prizeSimResult" class="calc-result">
            <div class="result-row">
              <span class="label">预计奖金：</span>
              <span class="value money">¥{{ prizeSimResult.prize }}</span>
            </div>
            <div class="result-row">
              <span class="label">说明：</span>
              <span class="value">{{ prizeSimResult.desc }}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- 投注记录 -->
      <div class="tool-card">
        <h3>📝 投注记录</h3>
        <p class="tool-desc">记录和管理您的投注</p>
        <div class="tool-content">
          <div class="input-group">
            <label>号码（逗号分隔）</label>
            <input v-model="recordForm.numbers" placeholder="例: 01,05,12,18,25,33" />
          </div>
          <div class="input-group">
            <label>期号</label>
            <input v-model="recordForm.issue" placeholder="例: 2026001" />
          </div>
          <button class="tool-btn" @click="addRecord">添加记录</button>
          <div v-if="records.length" class="records-list">
            <div v-for="(r, i) in records" :key="i" class="record-item">
              <span class="record-issue">{{ r.issue }}</span>
              <span class="record-numbers">{{ r.numbers }}</span>
              <button class="delete-btn" @click="records.splice(i, 1)">×</button>
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

const props = withDefaults(defineProps<{ lotteryType?: LotteryType }>(), {
  lotteryType: 'ssq',
});

const type = computed(() => props.lotteryType);

// 复式计算器
const complex = ref({ redCount: 6, blueCount: 1, frontCount: 5, backCount: 2 });
const complexResult = ref<{ bets: number; amount: number } | null>(null);

function comb(n: number, k: number): number {
  if (k > n) return 0;
  if (k === 0 || k === n) return 1;
  let result = 1;
  for (let i = 0; i < k; i++) {
    result = result * (n - i) / (i + 1);
  }
  return Math.round(result);
}

function calcComplex() {
  let bets = 0;
  if (type.value === 'ssq') {
    bets = comb(complex.value.redCount, 6) * complex.value.blueCount;
  } else if (type.value === 'dlt') {
    bets = comb(complex.value.frontCount, 5) * comb(complex.value.backCount, 2);
  } else {
    bets = 1; // 小盘彩只有直选
  }
  complexResult.value = { bets, amount: bets * 2 };
}

// 胆拖计算器
const dantuo = ref({ danRed: '', tuoRed: '', blueCount: 1 });
const dantuoResult = ref<{ bets: number; amount: number } | null>(null);

function calcDantuo() {
  if (type.value !== 'ssq') return;
  const dan = dantuo.value.danRed.split(',').filter(Boolean).length;
  const tuo = dantuo.value.tuoRed.split(',').filter(Boolean).length;
  if (dan < 1 || dan > 5 || tuo < 1) {
    alert('请输入有效的胆码和拖码');
    return;
  }
  const bets = comb(tuo, 6 - dan) * dantuo.value.blueCount;
  dantuoResult.value = { bets, amount: bets * 2 };
}

// 奖金模拟器
const prizeLevels = computed(() => {
  if (type.value === 'ssq') {
    return [
      { value: '1', label: '一等奖' },
      { value: '2', label: '二等奖' },
      { value: '3', label: '三等奖' },
      { value: '4', label: '四等奖' },
      { value: '5', label: '五等奖' },
      { value: '6', label: '六等奖' },
    ];
  }
  if (type.value === 'dlt') {
    return [
      { value: '1', label: '一等奖' },
      { value: '2', label: '二等奖' },
      { value: '3', label: '三等奖' },
      { value: '4', label: '四等奖' },
      { value: '5', label: '五等奖' },
      { value: '6', label: '六等奖' },
      { value: '7', label: '七等奖' },
      { value: '8', label: '八等奖' },
      { value: '9', label: '九等奖' },
    ];
  }
  return [
    { value: '1', label: '一等奖（直选）' },
    { value: '2', label: '二等奖（组选3）' },
    { value: '3', label: '三等奖（组选6）' },
  ];
});

const prizeSim = ref({ level: '1', count: 1 });
const prizeSimResult = ref<{ prize: string; desc: string } | null>(null);

function calcPrize() {
  const prizeMap: Record<string, Record<string, { prize: number; desc: string }>> = {
    ssq: {
      '1': { prize: 5000000, desc: '浮动奖，最高1000万' },
      '2': { prize: 200000, desc: '浮动奖' },
      '3': { prize: 3000, desc: '固定奖' },
      '4': { prize: 200, desc: '固定奖' },
      '5': { prize: 10, desc: '固定奖' },
      '6': { prize: 5, desc: '固定奖' },
    },
    dlt: {
      '1': { prize: 10000000, desc: '浮动奖，最高1000万' },
      '2': { prize: 500000, desc: '浮动奖' },
      '3': { prize: 10000, desc: '浮动奖' },
      '4': { prize: 3000, desc: '固定奖' },
      '5': { prize: 300, desc: '固定奖' },
      '6': { prize: 200, desc: '固定奖' },
      '7': { prize: 100, desc: '固定奖' },
      '8': { prize: 15, desc: '固定奖' },
      '9': { prize: 5, desc: '固定奖' },
    },
    fc3d: {
      '1': { prize: 1040, desc: '直选' },
      '2': { prize: 346, desc: '组选3' },
      '3': { prize: 173, desc: '组选6' },
    },
  };

  const info = prizeMap[type.value]?.[prizeSim.value.level];
  if (info) {
    const total = info.prize * prizeSim.value.count;
    prizeSimResult.value = {
      prize: total.toLocaleString(),
      desc: info.desc,
    };
  }
}

// 投注记录
const recordForm = ref({ numbers: '', issue: '' });
const records = ref<{ numbers: string; issue: string }[]>([]);

function addRecord() {
  if (!recordForm.value.numbers || !recordForm.value.issue) {
    alert('请填写号码和期号');
    return;
  }
  records.value.unshift({ ...recordForm.value });
  recordForm.value = { numbers: '', issue: '' };
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
.input-group input, .input-group select {
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

.calc-result { margin-top: 8px; }
.result-row { margin-bottom: 6px; font-size: 13px; }
.result-row .label { color: #808080; }
.result-row .value { color: #d4d4d4; }
.result-row .value.highlight { color: #2ecc71; font-weight: bold; font-size: 18px; }
.result-row .value.money { color: #e74c3c; font-weight: bold; }

.records-list { max-height: 200px; overflow-y: auto; }
.record-item {
  display: flex; align-items: center; gap: 10px;
  padding: 8px; background: #1e1e1e; border-radius: 4px; margin-bottom: 6px;
}
.record-issue { color: #569cd6; font-size: 12px; }
.record-numbers { flex: 1; font-size: 12px; }
.delete-btn {
  background: none; border: none; color: #e74c3c; cursor: pointer;
  font-size: 16px; padding: 0 4px;
}

@media (max-width: 900px) {
  .tools-grid { grid-template-columns: 1fr; }
}
</style>
