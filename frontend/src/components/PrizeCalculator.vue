<template>
  <Teleport to="body">
    <div class="modal-overlay" v-if="visible" @click.self="$emit('close')">
      <div class="modal">
        <div class="modal-header">
          <h3>💰 奖金计算</h3>
          <button class="close-btn" @click="$emit('close')">×</button>
        </div>
        <div class="modal-body">
          <div class="field">
            <label>彩票类型</label>
            <div class="type-selector">
              <button
                v-for="t in typeOptions"
                :key="t.value"
                :class="['type-btn', { active: selectedType === t.value }]"
                @click="selectedType = t.value"
              >{{ t.label }}</button>
            </div>
          </div>
          <div class="field">
            <label>奖等</label>
            <div class="type-selector">
              <button
                v-for="l in prizeLevels"
                :key="l"
                :class="['type-btn', { active: selectedLevel === l }]"
                @click="selectedLevel = l"
              >{{ l }}</button>
            </div>
          </div>
          <div class="field">
            <label>中奖注数</label>
            <input v-model.number="count" type="number" min="1" class="text-input" />
          </div>
          <div class="field" v-if="isDLT">
            <label class="checkbox-label">
              <input type="checkbox" v-model="additional" />
              追加投注
            </label>
          </div>
          <button class="calc-btn" @click="handleCalc" :disabled="loading">
            {{ loading ? '计算中...' : '计算奖金' }}
          </button>
          <div class="result" v-if="result">
            <div class="result-row">
              <span class="result-label">单注奖金</span>
              <span class="result-value">¥{{ result.per_prize.toLocaleString() }}</span>
            </div>
            <div class="result-row">
              <span class="result-label">中奖注数</span>
              <span class="result-value">{{ result.count }} 注</span>
            </div>
            <div class="result-divider"></div>
            <div class="result-row total">
              <span class="result-label">总奖金</span>
              <span class="result-value highlight">¥{{ result.total.toLocaleString() }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import type { LotteryType } from '../api/types';

defineProps<{ visible: boolean }>();
defineEmits<{ close: [] }>();

const selectedType = ref<LotteryType>('ssq');
const selectedLevel = ref('一等奖');
const count = ref(1);
const additional = ref(false);
const loading = ref(false);
const result = ref<{ prize_level: string; per_prize: number; count: number; total: number } | null>(null);

const typeOptions = [
  { value: 'ssq' as LotteryType, label: '双色球' },
  { value: 'dlt' as LotteryType, label: '大乐透' },
  { value: 'fc3d' as LotteryType, label: '福彩3D' },
  { value: 'pl3' as LotteryType, label: '排列3' },
  { value: 'pl5' as LotteryType, label: '排列5' },
];

const prizeLevelsMap: Record<string, string[]> = {
  ssq: ['一等奖', '二等奖', '三等奖', '四等奖', '五等奖', '六等奖'],
  dlt: ['一等奖', '二等奖', '三等奖', '四等奖', '五等奖', '六等奖', '七等奖'],
  fc3d: ['一等奖', '二等奖', '三等奖'],
  pl3: ['一等奖', '二等奖', '三等奖'],
  pl5: ['一等奖'],
};

const prizeAmounts: Record<string, Record<string, number>> = {
  ssq: { '一等奖': 5000000, '二等奖': 88888, '三等奖': 3000, '四等奖': 200, '五等奖': 10, '六等奖': 5 },
  dlt: { '一等奖': 10000000, '二等奖': 200000, '三等奖': 10000, '四等奖': 300, '五等奖': 150, '六等奖': 15, '七等奖': 5 },
  fc3d: { '一等奖': 1040, '二等奖': 346, '三等奖': 173 },
  pl3: { '一等奖': 1040, '二等奖': 346, '三等奖': 173 },
  pl5: { '一等奖': 100000 },
};

const prizeLevels = computed(() => prizeLevelsMap[selectedType.value] ?? []);
const isDLT = computed(() => selectedType.value === 'dlt');

async function handleCalc() {
  loading.value = true;
  const perPrize = prizeAmounts[selectedType.value]?.[selectedLevel.value] ?? 0;
  const bonus = additional.value ? Math.floor(perPrize * 0.8) : 0;
  result.value = {
    prize_level: selectedLevel.value,
    per_prize: perPrize + bonus,
    count: count.value,
    total: (perPrize + bonus) * count.value,
  };
  loading.value = false;
}
</script>

<style scoped>
.modal-overlay {
  position: fixed; top: 0; left: 0; right: 0; bottom: 0;
  background: rgba(0,0,0,0.7); z-index: 200;
  display: flex; align-items: center; justify-content: center;
}
.modal {
  background: #2d2d2d; border-radius: 8px; width: 480px;
  max-height: 80vh; overflow-y: auto;
}
.modal-header {
  display: flex; justify-content: space-between; align-items: center;
  padding: 16px 20px; border-bottom: 1px solid #404040;
}
.modal-header h3 { font-size: 16px; }
.close-btn {
  background: none; border: none; color: #808080; font-size: 24px;
  cursor: pointer; line-height: 1;
}
.modal-body { padding: 20px; }
.field { margin-bottom: 16px; }
.field label { display: block; color: #808080; font-size: 13px; margin-bottom: 8px; }
.type-selector { display: flex; gap: 8px; flex-wrap: wrap; }
.type-btn {
  background: #1e1e1e; color: #d4d4d4; border: 1px solid #404040;
  padding: 6px 14px; border-radius: 4px; cursor: pointer; font-size: 13px;
}
.type-btn.active { background: #0e639c; color: white; border-color: #0e639c; }
.text-input {
  width: 100%; padding: 8px 12px; border-radius: 6px;
  border: 1px solid #404040; background: #1e1e1e; color: #d4d4d4; font-size: 14px;
}
.text-input:focus { border-color: #0e639c; outline: none; }
.checkbox-label { display: flex; align-items: center; gap: 8px; color: #d4d4d4; cursor: pointer; }
.calc-btn {
  width: 100%; padding: 10px; background: #0e639c; color: white;
  border: none; border-radius: 6px; cursor: pointer; font-size: 14px;
}
.calc-btn:disabled { opacity: 0.5; cursor: not-allowed; }
.result { margin-top: 16px; padding: 16px; background: #1e1e1e; border-radius: 6px; }
.result-row { display: flex; justify-content: space-between; padding: 6px 0; }
.result-label { color: #808080; }
.result-value { color: #d4d4d4; }
.result-value.highlight { color: #e74c3c; font-size: 18px; font-weight: bold; }
.result-divider { border-top: 1px solid #404040; margin: 8px 0; }
.result-row.total { padding-top: 8px; }
</style>
