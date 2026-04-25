<template>
  <Teleport to="body">
    <div class="modal-overlay" v-if="visible" @click.self="$emit('close')">
      <div class="modal">
        <div class="modal-header">
          <h3>{{ typeName }} 第{{ issue }}期 详情</h3>
          <button class="close-btn" @click="$emit('close')">×</button>
        </div>
        <div class="modal-body" v-if="loading">
          <div class="loading">加载中...</div>
        </div>
        <div class="modal-body" v-else-if="detail">
          <div class="balls">
            <template v-if="type === 'ssq'">
              <span v-for="n in splitBalls(detail.draw?.red_balls)" :key="n" class="ball red">{{ n }}</span>
              <span class="ball blue">{{ detail.draw?.blue_ball }}</span>
            </template>
            <template v-else-if="type === 'dlt'">
              <span v-for="n in splitBalls(detail.draw?.front_zone)" :key="n" class="ball red">{{ n }}</span>
              <span v-for="n in splitBalls(detail.draw?.back_zone)" :key="n" class="ball blue">{{ n }}</span>
            </template>
            <template v-else>
              <span v-for="n in splitBalls(detail.draw?.numbers)" :key="n" class="ball red">{{ n }}</span>
            </template>
          </div>
          <div class="meta">
            <span>开奖日期：{{ detail.draw?.draw_date }}</span>
            <span v-if="detail.draw?.pool_amount">奖池：¥{{ formatMoney(detail.draw.pool_amount) }}</span>
          </div>
          <div class="section" v-if="detail.prize_details?.length">
            <h4>奖级详情</h4>
            <table class="detail-table">
              <thead>
                <tr>
                  <th>奖级</th>
                  <th>中奖注数</th>
                  <th>单注奖金</th>
                  <th>追加注数</th>
                  <th>追加单注奖金</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="p in detail.prize_details" :key="p.prize_level">
                  <td>{{ p.prize_level }}</td>
                  <td>{{ p.prize_count }}</td>
                  <td class="amount">{{ p.prize_amount ? '¥' + p.prize_amount.toLocaleString() : '-' }}</td>
                  <td>{{ p.additional_count || '-' }}</td>
                  <td class="amount">{{ p.additional_amount ? '¥' + p.additional_amount.toLocaleString() : '-' }}</td>
                </tr>
              </tbody>
            </table>
          </div>
          <div class="section" v-if="detail.winning_locations?.length">
            <h4>中奖地区</h4>
            <div class="locations">
              <div v-for="loc in detail.winning_locations" :key="loc.prize_level + loc.location" class="loc-item">
                <span class="loc-level">{{ loc.prize_level }}</span>
                <span class="loc-place">{{ loc.location }}</span>
                <span class="loc-count">{{ loc.win_count }}注</span>
                <span class="loc-amount" v-if="loc.win_amount">¥{{ loc.win_amount.toLocaleString() }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, watch, computed } from 'vue';
import type { LotteryType } from '../api/types';
import { getDrawDetail } from '../api/client';

const props = defineProps<{ visible: boolean; type: LotteryType; issue: string }>();
defineEmits<{ close: [] }>();

const detail = ref<any>(null);
const loading = ref(false);

const typeName = computed(() => {
  const map: Record<string, string> = { ssq: '双色球', dlt: '大乐透', fc3d: '福彩3D', pl3: '排列3', pl5: '排列5' };
  return map[props.type] ?? '';
});

watch(() => [props.visible, props.issue], async () => {
  if (!props.visible || !props.issue) return;
  loading.value = true;
  try {
    detail.value = await getDrawDetail(props.type, props.issue);
  } catch {
    detail.value = null;
  } finally {
    loading.value = false;
  }
});

function splitBalls(s: string): string[] {
  if (!s) return [];
  try { const arr = JSON.parse(s); if (Array.isArray(arr)) return arr; } catch {}
  return s.split(',').map(v => v.trim()).filter(Boolean);
}
function formatMoney(n: number) { return (n / 100000000).toFixed(2) + '亿'; }
</script>

<style scoped>
.modal-overlay {
  position: fixed; top: 0; left: 0; right: 0; bottom: 0;
  background: rgba(0,0,0,0.7); z-index: 200;
  display: flex; align-items: center; justify-content: center;
}
.modal {
  background: #2d2d2d; border-radius: 8px; width: 640px;
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
.loading { text-align: center; color: #808080; padding: 20px; }
.balls { display: flex; gap: 10px; margin-bottom: 16px; }
.ball {
  width: 45px; height: 45px; border-radius: 50%;
  display: flex; align-items: center; justify-content: center;
  font-weight: bold; font-size: 16px; color: white;
}
.ball.red { background: #e74c3c; }
.ball.blue { background: #3498db; }
.meta { display: flex; gap: 20px; color: #808080; font-size: 14px; margin-bottom: 16px; }
.section { margin-top: 16px; }
.section h4 { font-size: 14px; margin-bottom: 10px; }
.detail-table { width: 100%; border-collapse: collapse; color: #d4d4d4; font-size: 13px; }
.detail-table th, .detail-table td { padding: 8px; text-align: left; border-bottom: 1px solid #404040; }
.detail-table th { color: #808080; font-weight: bold; }
.amount { color: #e74c3c; }
.locations { display: flex; flex-direction: column; gap: 6px; }
.loc-item { display: flex; gap: 12px; font-size: 13px; }
.loc-level { color: #e74c3c; font-weight: bold; min-width: 50px; }
.loc-place { color: #d4d4d4; }
.loc-count { color: #808080; }
.loc-amount { color: #e74c3c; }
</style>
