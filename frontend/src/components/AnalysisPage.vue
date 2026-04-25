<template>
  <div class="analysis-page">
    <div class="page-header">
      <h2>📊 数据分析</h2>
      <div class="type-selector">
        <button
          v-for="t in typeOptions"
          :key="t.value"
          :class="['type-btn', { active: currentType === t.value }]"
          @click="switchType(t.value)"
        >{{ t.label }}</button>
      </div>
      <router-link to="/" class="back-link">← 返回首页</router-link>
    </div>

    <div class="grid">
      <!-- 冷热号 -->
      <div class="card">
        <h3>冷热号统计（近{{ range }}期）</h3>
        <div class="range-selector">
          <button v-for="r in [10, 30, 50]" :key="r" :class="['range-btn', { active: range === r }]" @click="changeRange(r)">{{ r }}期</button>
        </div>
        <div class="hot-cold-grid">
          <div class="hot-section">
            <div class="section-label hot">🔥 热号（出现最多）</div>
            <div class="number-list">
              <div v-for="item in hotColdData.hot" :key="item.number" class="number-item hot">
                <span class="num">{{ item.number }}</span>
                <span class="count">{{ item.count }}次</span>
              </div>
            </div>
          </div>
          <div class="cold-section">
            <div class="section-label cold">❄️ 冷号（出现最少）</div>
            <div class="number-list">
              <div v-for="item in hotColdData.cold" :key="item.number" class="number-item cold">
                <span class="num">{{ item.number }}</span>
                <span class="count">{{ item.count }}次</span>
              </div>
            </div>
          </div>
        </div>
        <div ref="hotColdChart" class="chart"></div>
      </div>

      <!-- 遗漏值 -->
      <div class="card">
        <h3>遗漏值分析</h3>
        <div class="table-wrap">
          <table class="analysis-table">
            <thead>
              <tr>
                <th>号码</th>
                <th>当前遗漏</th>
                <th>平均遗漏</th>
                <th>遗漏比</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="item in missingData" :key="item.number">
                <td class="num-cell">{{ item.number }}</td>
                <td :class="{ highlight: item.missing > 10 }">{{ item.missing }}</td>
                <td>{{ item.avg_missing?.toFixed(1) }}</td>
                <td>
                  <div class="bar-wrap">
                    <div class="bar" :style="{ width: Math.min(item.missing * 5, 100) + '%' }"></div>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- 奇偶大小特征 -->
      <div class="card full-width">
        <h3>奇偶大小特征（近{{ range }}期）</h3>
        <div class="table-wrap">
          <table class="analysis-table">
            <thead>
              <tr>
                <th>期号</th>
                <th>奇数</th>
                <th>偶数</th>
                <th>大号</th>
                <th>小号</th>
                <th>和值</th>
                <th>奇偶比</th>
                <th>大小比</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="f in featuresData" :key="f.issue">
                <td>{{ f.issue }}</td>
                <td>{{ f.odd }}</td>
                <td>{{ f.even }}</td>
                <td>{{ f.big }}</td>
                <td>{{ f.small }}</td>
                <td class="highlight">{{ f.sum }}</td>
                <td>{{ f.odd }}:{{ f.even }}</td>
                <td>{{ f.big }}:{{ f.small }}</td>
              </tr>
            </tbody>
          </table>
        </div>
        <div ref="featuresChart" class="chart"></div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, nextTick } from 'vue';
import type { LotteryType } from '../api/types';
import { getHotCold, getMissing, getFeatures } from '../api/client';
import * as echarts from 'echarts';

const props = withDefaults(defineProps<{ lotteryType?: LotteryType }>(), {
  lotteryType: 'ssq',
});

const currentType = ref<LotteryType>(props.lotteryType);
const range = ref(30);
const hotColdData = ref<{ hot: any[]; cold: any[] }>({ hot: [], cold: [] });
const missingData = ref<any[]>([]);
const featuresData = ref<any[]>([]);
const hotColdChart = ref<HTMLElement>();
const featuresChart = ref<HTMLElement>();

const typeOptions = [
  { value: 'ssq' as LotteryType, label: '双色球' },
  { value: 'dlt' as LotteryType, label: '大乐透' },
  { value: 'fc3d' as LotteryType, label: '福彩3D' },
  { value: 'pl3' as LotteryType, label: '排列3' },
  { value: 'pl5' as LotteryType, label: '排列5' },
];

async function loadData() {
  const [hc, ms, ft] = await Promise.all([
    getHotCold(currentType.value, range.value).catch(() => ({ hot: [], cold: [] })),
    getMissing(currentType.value, range.value).catch(() => ({ numbers: [] })),
    getFeatures(currentType.value, range.value).catch(() => []),
  ]);
  hotColdData.value = hc;
  missingData.value = ms.numbers ?? ms;
  featuresData.value = Array.isArray(ft) ? ft : [];
  await nextTick();
  renderCharts();
}

function switchType(t: LotteryType) {
  currentType.value = t;
  loadData();
}

function changeRange(r: number) {
  range.value = r;
  loadData();
}

function renderCharts() {
  // Hot/Cold chart
  if (hotColdChart.value && hotColdData.value.hot.length) {
    const chart = echarts.init(hotColdChart.value, 'dark');
    const hotNums = hotColdData.value.hot.map(h => h.number);
    const hotCounts = hotColdData.value.hot.map(h => h.count);
    const coldNums = hotColdData.value.cold.map(c => c.number);
    const coldCounts = hotColdData.value.cold.map(c => c.count);
    chart.setOption({
      backgroundColor: 'transparent',
      tooltip: { trigger: 'axis' },
      legend: { data: ['热号', '冷号'], textStyle: { color: '#808080' } },
      xAxis: { type: 'category', data: [...hotNums, ...coldNums], axisLabel: { color: '#808080' } },
      yAxis: { type: 'value', axisLabel: { color: '#808080' } },
      series: [
        { name: '热号', type: 'bar', data: [...hotCounts, ...new Array(coldNums.length).fill(0)], itemStyle: { color: '#e74c3c' } },
        { name: '冷号', type: 'bar', data: [...new Array(hotNums.length).fill(0), ...coldCounts], itemStyle: { color: '#3498db' } },
      ],
    });
  }
  // Features chart
  if (featuresChart.value && featuresData.value.length) {
    const chart = echarts.init(featuresChart.value, 'dark');
    const issues = featuresData.value.map(f => f.issue);
    chart.setOption({
      backgroundColor: 'transparent',
      tooltip: { trigger: 'axis' },
      legend: { data: ['奇数', '偶数', '大号', '小号'], textStyle: { color: '#808080' } },
      xAxis: { type: 'category', data: issues, axisLabel: { color: '#808080', rotate: 45 } },
      yAxis: { type: 'value', axisLabel: { color: '#808080' } },
      series: [
        { name: '奇数', type: 'line', data: featuresData.value.map(f => f.odd), lineStyle: { color: '#e74c3c' }, itemStyle: { color: '#e74c3c' } },
        { name: '偶数', type: 'line', data: featuresData.value.map(f => f.even), lineStyle: { color: '#3498db' }, itemStyle: { color: '#3498db' } },
        { name: '大号', type: 'line', data: featuresData.value.map(f => f.big), lineStyle: { color: '#e67e22' }, itemStyle: { color: '#e67e22' } },
        { name: '小号', type: 'line', data: featuresData.value.map(f => f.small), lineStyle: { color: '#2ecc71' }, itemStyle: { color: '#2ecc71' } },
      ],
    });
  }
}

onMounted(loadData);
</script>

<style scoped>
.analysis-page { padding: 0; }
.page-header {
  display: flex; align-items: center; gap: 20px; margin-bottom: 20px;
  background: #2d2d2d; padding: 16px 20px; border-radius: 8px;
}
.page-header h2 { font-size: 18px; white-space: nowrap; }
.type-selector { display: flex; gap: 8px; flex-wrap: wrap; flex: 1; }
.type-btn {
  background: #1e1e1e; color: #d4d4d4; border: 1px solid #404040;
  padding: 6px 14px; border-radius: 4px; cursor: pointer; font-size: 13px;
}
.type-btn.active { background: #0e639c; color: white; border-color: #0e639c; }
.back-link { color: #808080; text-decoration: none; font-size: 14px; white-space: nowrap; }
.back-link:hover { color: #d4d4d4; }
.grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
.card { background: #2d2d2d; padding: 20px; border-radius: 8px; }
.card.full-width { grid-column: 1 / -1; }
h3 { font-size: 15px; margin-bottom: 12px; }
.range-selector { display: flex; gap: 8px; margin-bottom: 12px; }
.range-btn {
  background: #1e1e1e; color: #d4d4d4; border: 1px solid #404040;
  padding: 4px 12px; border-radius: 4px; cursor: pointer; font-size: 12px;
}
.range-btn.active { background: #0e639c; color: white; }
.hot-cold-grid { display: flex; gap: 20px; margin-bottom: 16px; }
.hot-section, .cold-section { flex: 1; }
.section-label { font-size: 13px; margin-bottom: 8px; font-weight: bold; }
.section-label.hot { color: #e74c3c; }
.section-label.cold { color: #3498db; }
.number-list { display: flex; flex-wrap: wrap; gap: 6px; }
.number-item {
  display: flex; align-items: center; gap: 4px;
  padding: 4px 8px; border-radius: 4px; font-size: 12px;
}
.number-item.hot { background: rgba(231,76,60,0.15); }
.number-item.cold { background: rgba(52,152,219,0.15); }
.num { font-weight: bold; }
.number-item.hot .num { color: #e74c3c; }
.number-item.cold .num { color: #3498db; }
.count { color: #808080; }
.chart { width: 100%; height: 250px; margin-top: 12px; }
.table-wrap { overflow-x: auto; }
.analysis-table { width: 100%; border-collapse: collapse; color: #d4d4d4; font-size: 13px; }
.analysis-table th, .analysis-table td { padding: 8px; text-align: left; border-bottom: 1px solid #404040; }
.analysis-table th { color: #808080; font-weight: bold; background: #1e1e1e; }
.num-cell { font-weight: bold; color: #569cd6; }
.highlight { color: #e74c3c; font-weight: bold; }
.bar-wrap { width: 100px; height: 12px; background: #1e1e1e; border-radius: 6px; overflow: hidden; }
.bar { height: 100%; background: linear-gradient(90deg, #3498db, #e74c3c); border-radius: 6px; transition: width 0.3s; }
</style>
