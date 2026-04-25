<template>
  <div class="prize-hover-trigger">
    <span class="trigger-label">🏆 奖级查询</span>
    <div class="popup">
      <div class="popup-header">
        <span class="popup-title">🏆 奖级查询</span>
        <div class="type-tabs">
          <button
            v-for="t in typeOptions"
            :key="t.value"
            :class="['type-btn', { active: selectedType === t.value }]"
            @click="selectedType = t.value"
          >{{ t.label }}</button>
        </div>
      </div>
      <div class="table-wrap">
        <table v-if="selectedType === 'dlt'">
          <thead>
            <tr class="header-row-1">
              <th rowspan="2">奖等</th>
              <th colspan="2">中奖条件</th>
              <th rowspan="2">中奖说明</th>
              <th colspan="2">单注奖金分配</th>
            </tr>
            <tr class="header-row-2">
              <th>前区</th>
              <th>后区</th>
              <th>奖池8亿以下</th>
              <th>奖池8亿以上</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="row in dltPrizes" :key="row.level" :class="row.rowClass">
              <td class="level-cell" :rowspan="row.span" v-if="row.span">{{ row.level }}</td>
              <td><div class="ball-dots"><span v-for="i in row.front" :key="'f'+i" class="dot red">✓</span></div></td>
              <td><div class="ball-dots"><span v-for="i in row.back" :key="'b'+i" class="dot blue">✓</span></div></td>
              <td>{{ row.desc }}</td>
              <td :rowspan="row.prizeSpan" v-if="row.prizeSpan" :style="{ color: row.color }">{{ row.under }}</td>
              <td :rowspan="row.prizeSpan" v-if="row.prizeSpan" :style="{ color: row.color }">{{ row.over }}</td>
            </tr>
          </tbody>
        </table>
        <table v-else-if="selectedType === 'ssq'">
          <thead>
            <tr class="header-row-1">
              <th rowspan="2">奖等</th>
              <th colspan="2">中奖条件</th>
              <th rowspan="2">中奖说明</th>
              <th rowspan="2">单注奖金</th>
            </tr>
            <tr class="header-row-2">
              <th>红球</th>
              <th>蓝球</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="row in ssqPrizes" :key="row.level">
              <td class="level-cell" :style="{ color: row.color }">{{ row.level }}</td>
              <td><div class="ball-dots"><span v-for="i in row.red" :key="'r'+i" class="dot red">✓</span></div></td>
              <td><div class="ball-dots"><span v-for="i in row.blue" :key="'b'+i" class="dot blue">✓</span></div></td>
              <td>{{ row.desc }}</td>
              <td :style="{ color: row.color }">{{ row.prize }}</td>
            </tr>
          </tbody>
        </table>
        <table v-else>
          <thead>
            <tr>
              <th>奖等</th>
              <th>中奖条件</th>
              <th>单注奖金</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="row in smallPrizes" :key="row.level">
              <td class="level-cell" :style="{ color: row.color }">{{ row.level }}</td>
              <td>{{ row.desc }}</td>
              <td :style="{ color: row.color }">{{ row.prize }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';

const selectedType = ref('dlt');

const typeOptions = [
  { value: 'dlt', label: '大乐透' },
  { value: 'ssq', label: '双色球' },
  { value: 'fc3d', label: '福彩3D' },
];

const dltPrizes = [
  { level: '一等奖', span: 1, front: 5, back: 2, desc: '中5+2', under: '浮动奖 最高1000万', over: '浮动奖 最高1800万', color: '#e74c3c', prizeSpan: 1, rowClass: '' },
  { level: '二等奖', span: 1, front: 5, back: 1, desc: '中5+1', under: '浮动奖', over: '浮动奖 追加多80%', color: '#e67e22', prizeSpan: 1, rowClass: '' },
  { level: '三等奖', span: 2, front: 5, back: 0, desc: '中5+0', under: '5,000元', over: '6,666元', color: '#f1c40f', prizeSpan: 2, rowClass: '' },
  { level: '', span: 0, front: 4, back: 2, desc: '中4+2', under: '', over: '', color: '', prizeSpan: 0, rowClass: '' },
  { level: '四等奖', span: 1, front: 4, back: 1, desc: '中4+1', under: '300元', over: '380元', color: '#2ecc71', prizeSpan: 1, rowClass: '' },
  { level: '五等奖', span: 2, front: 3, back: 2, desc: '中3+2', under: '150元', over: '200元', color: '#3498db', prizeSpan: 2, rowClass: '' },
  { level: '', span: 0, front: 4, back: 0, desc: '中4+0', under: '', over: '', color: '', prizeSpan: 0, rowClass: '' },
  { level: '六等奖', span: 2, front: 3, back: 1, desc: '中3+1', under: '15元', over: '18元', color: '#9b59b6', prizeSpan: 2, rowClass: '' },
  { level: '', span: 0, front: 2, back: 2, desc: '中2+2', under: '', over: '', color: '', prizeSpan: 0, rowClass: '' },
  { level: '七等奖', span: 4, front: 3, back: 0, desc: '中3+0', under: '5元', over: '7元', color: '#1abc9c', prizeSpan: 4, rowClass: '' },
  { level: '', span: 0, front: 1, back: 2, desc: '中1+2', under: '', over: '', color: '', prizeSpan: 0, rowClass: '' },
  { level: '', span: 0, front: 2, back: 1, desc: '中2+1', under: '', over: '', color: '', prizeSpan: 0, rowClass: '' },
  { level: '', span: 0, front: 0, back: 2, desc: '中0+2', under: '', over: '', color: '', prizeSpan: 0, rowClass: '' },
];

const ssqPrizes = [
  { level: '一等奖', red: 6, blue: 1, desc: '中6+1', prize: '浮动奖 最高1000万', color: '#e74c3c' },
  { level: '二等奖', red: 6, blue: 0, desc: '中6+0', prize: '浮动奖', color: '#e67e22' },
  { level: '三等奖', red: 5, blue: 1, desc: '中5+1', prize: '3,000元', color: '#f1c40f' },
  { level: '四等奖', red: 5, blue: 0, desc: '中5+0', prize: '200元', color: '#2ecc71' },
  { level: '四等奖', red: 4, blue: 1, desc: '中4+1', prize: '200元', color: '#2ecc71' },
  { level: '五等奖', red: 4, blue: 0, desc: '中4+0', prize: '10元', color: '#3498db' },
  { level: '五等奖', red: 3, blue: 1, desc: '中3+1', prize: '10元', color: '#3498db' },
  { level: '六等奖', red: 2, blue: 1, desc: '中2+1', prize: '5元', color: '#9b59b6' },
  { level: '六等奖', red: 1, blue: 1, desc: '中1+1', prize: '5元', color: '#9b59b6' },
  { level: '六等奖', red: 0, blue: 1, desc: '中0+1', prize: '5元', color: '#9b59b6' },
];

const smallPrizes = [
  { level: '一等奖', desc: '直选 3位全中', prize: '1,040元', color: '#e74c3c' },
  { level: '二等奖', desc: '组选3 任意顺序', prize: '346元', color: '#e67e22' },
  { level: '三等奖', desc: '组选6 任意顺序', prize: '173元', color: '#f1c40f' },
];
</script>

<style scoped>
.prize-hover-trigger { position: relative; cursor: pointer; }
.trigger-label { color: #e74c3c; font-weight: bold; cursor: pointer; }
.popup {
  display: none; position: absolute; top: 100%; right: 0; margin-top: 12px;
  background: #2d2d2d; border: 1px solid #404040; border-radius: 8px;
  padding: 20px; width: 780px; box-shadow: 0 8px 32px rgba(0,0,0,0.5); z-index: 100;
}
.prize-hover-trigger:hover .popup { display: block; }
.popup:hover { display: block; }
.popup-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px; }
.popup-title { color: #d4d4d4; font-size: 14px; font-weight: bold; }
.type-tabs { display: flex; gap: 8px; }
.type-btn {
  background: #404040; color: #d4d4d4; border: none; padding: 6px 14px;
  border-radius: 4px; cursor: pointer; font-size: 12px;
}
.type-btn.active { background: #0e639c; color: white; }
.table-wrap { overflow-x: auto; }
table { width: 100%; border-collapse: collapse; color: #d4d4d4; font-size: 12px; }
th { padding: 8px 6px; text-align: center; font-weight: bold; color: #808080; background: #1e1e1e; border-bottom: 2px solid #404040; }
td { padding: 8px 6px; text-align: center; border-bottom: 1px solid #404040; }
.level-cell { font-weight: bold; background: #1e1e1e; }
.ball-dots { display: flex; gap: 2px; justify-content: center; }
.dot {
  width: 20px; height: 20px; border-radius: 50%; display: flex;
  align-items: center; justify-content: center; font-size: 9px; color: white;
}
.dot.red { background: #e74c3c; }
.dot.blue { background: #3498db; }
</style>
