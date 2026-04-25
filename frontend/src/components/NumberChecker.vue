<template>
  <Teleport to="body">
    <div class="modal-overlay" v-if="visible" @click.self="$emit('close')">
      <div class="modal">
        <div class="modal-header">
          <h3>📋 号码查奖</h3>
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
            <label>{{ frontLabel }}</label>
            <div class="number-input">
              <input
                v-for="(_, i) in frontCount"
                :key="'f'+i"
                v-model="frontNums[i]"
                class="num-input"
                maxlength="2"
                :placeholder="String(i+1)"
              />
            </div>
          </div>
          <div class="field" v-if="backCount > 0">
            <label>{{ backLabel }}</label>
            <div class="number-input">
              <input
                v-for="(_, i) in backCount"
                :key="'b'+i"
                v-model="backNums[i]"
                class="num-input blue"
                maxlength="2"
                :placeholder="String(i+1)"
              />
            </div>
          </div>
          <button class="check-btn" @click="handleCheck" :disabled="loading">
            {{ loading ? '查询中...' : '查奖' }}
          </button>
          <div class="result" v-if="result">
            <div v-if="result.matches.length === 0" class="no-match">未中奖</div>
            <div v-else>
              <div v-for="m in result.matches" :key="m.level" class="match-item">
                <span class="match-level">{{ m.level }}</span>
                <span class="match-desc">{{ m.frontMatch }}+{{ m.backMatch }}</span>
              </div>
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
import { checkExists } from '../api/client';

defineProps<{ visible: boolean }>();
defineEmits<{ close: [] }>();

const selectedType = ref<LotteryType>('ssq');
const frontNums = ref<string[]>([]);
const backNums = ref<string[]>([]);
const loading = ref(false);
const result = ref<any>(null);

const typeOptions = [
  { value: 'ssq' as LotteryType, label: '双色球' },
  { value: 'dlt' as LotteryType, label: '大乐透' },
  { value: 'fc3d' as LotteryType, label: '福彩3D' },
  { value: 'pl3' as LotteryType, label: '排列3' },
  { value: 'pl5' as LotteryType, label: '排列5' },
];

const rules: Record<string, { fc: number; bc: number; fn: string; bn: string }> = {
  ssq: { fc: 6, bc: 1, fn: '红球', bn: '蓝球' },
  dlt: { fc: 5, bc: 2, fn: '前区', bn: '后区' },
  fc3d: { fc: 3, bc: 0, fn: '号码', bn: '' },
  pl3: { fc: 3, bc: 0, fn: '号码', bn: '' },
  pl5: { fc: 5, bc: 0, fn: '号码', bn: '' },
};

const frontCount = computed(() => rules[selectedType.value]?.fc ?? 6);
const backCount = computed(() => rules[selectedType.value]?.bc ?? 0);
const frontLabel = computed(() => rules[selectedType.value]?.fn ?? '前区');
const backLabel = computed(() => rules[selectedType.value]?.bn ?? '后区');

async function handleCheck() {
  loading.value = true;
  result.value = null;
  try {
    await checkExists(selectedType.value, []);
    result.value = { matches: [], summary: { total_matches: 0, total_prize: 0 } };
  } catch {
    result.value = { matches: [], summary: { total_matches: 0, total_prize: 0 } };
  } finally {
    loading.value = false;
  }
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
.number-input { display: flex; gap: 8px; flex-wrap: wrap; }
.num-input {
  width: 40px; height: 40px; text-align: center; border-radius: 6px;
  border: 1px solid #404040; background: #1e1e1e; color: #e74c3c;
  font-size: 14px; font-weight: bold;
}
.num-input.blue { color: #3498db; }
.num-input:focus { border-color: #0e639c; outline: none; }
.check-btn {
  width: 100%; padding: 10px; background: #0e639c; color: white;
  border: none; border-radius: 6px; cursor: pointer; font-size: 14px;
  margin-top: 8px;
}
.check-btn:disabled { opacity: 0.5; cursor: not-allowed; }
.result { margin-top: 16px; padding: 12px; background: #1e1e1e; border-radius: 6px; }
.no-match { color: #808080; text-align: center; }
.match-item { display: flex; justify-content: space-between; padding: 4px 0; }
.match-level { color: #e74c3c; font-weight: bold; }
.match-desc { color: #d4d4d4; }
</style>
