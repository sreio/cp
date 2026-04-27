<template>
  <div class="card">
    <div class="table-header">
      <h3>最近开奖记录</h3>
      <div class="header-info">
        <span class="total-count">共 {{ total }} 期</span>
      </div>
    </div>
    <div class="table-wrap">
      <table>
        <thead>
          <tr class="header-row-1">
            <th rowspan="2">期号</th>
            <th rowspan="2">开奖日期</th>
            <th colspan="2">开奖号码</th>
            <th rowspan="2">总销售额<br>（元）</th>
            <template v-if="type === 'dlt'">
              <th colspan="4">一等奖</th>
              <th colspan="4">二等奖</th>
            </template>
            <template v-else>
              <th colspan="2">一等奖</th>
              <th colspan="2">二等奖</th>
            </template>
            <th rowspan="2">奖池（元）</th>
            <th rowspan="2">详情</th>
          </tr>
          <tr class="header-row-2">
            <th>前区</th>
            <th>后区</th>
            <template v-if="type === 'dlt'">
              <th>注数</th>
              <th>单注奖金<br>（元）</th>
              <th>追加<br>注数</th>
              <th>单注奖金<br>（元）</th>
              <th>注数</th>
              <th>单注奖金<br>（元）</th>
              <th>追加<br>注数</th>
              <th>单注奖金<br>（元）</th>
            </template>
            <template v-else>
              <th>注数</th>
              <th>单注奖金<br>（元）</th>
              <th>注数</th>
              <th>单注奖金<br>（元）</th>
            </template>
          </tr>
        </thead>
        <tbody>
          <tr v-if="loading">
            <td :colspan="colspan" class="loading-cell">加载中...</td>
          </tr>
          <tr v-else-if="draws.length === 0">
            <td :colspan="colspan" class="empty-cell">暂无数据</td>
          </tr>
          <tr v-for="d in draws" :key="d.issue" class="draw-row">
            <td class="nowrap">{{ d.issue }}</td>
            <td class="nowrap">{{ d.draw_date }}</td>
            <td>
              <div class="ball-row">
                <span
                  v-for="n in getFrontBalls(d)"
                  :key="'f'+n"
                  class="mini-ball red"
                >{{ n }}</span>
              </div>
            </td>
            <td>
              <div class="ball-row">
                <span
                  v-for="n in getBackBalls(d)"
                  :key="'b'+n"
                  class="mini-ball blue"
                >{{ n }}</span>
              </div>
            </td>
            <td class="nowrap text-right">{{ d.sales_amount ? formatNum(d.sales_amount) : '-' }}</td>
            <template v-if="type === 'dlt'">
              <td class="text-center">{{ getPrize(d, 1, 'count') }}</td>
              <td class="nowrap text-right prize-amount">{{ getPrize(d, 1, 'amount') }}</td>
              <td class="text-center">{{ getPrize(d, 1, 'additional_count') }}</td>
              <td class="nowrap text-right prize-amount">{{ getPrize(d, 1, 'additional_amount') }}</td>
              <td class="text-center">{{ getPrize(d, 2, 'count') }}</td>
              <td class="nowrap text-right prize-amount">{{ getPrize(d, 2, 'amount') }}</td>
              <td class="text-center">{{ getPrize(d, 2, 'additional_count') }}</td>
              <td class="nowrap text-right prize-amount">{{ getPrize(d, 2, 'additional_amount') }}</td>
            </template>
            <template v-else>
              <td class="text-center">{{ getPrize(d, 1, 'count') }}</td>
              <td class="nowrap text-right prize-amount">{{ getPrize(d, 1, 'amount') }}</td>
              <td class="text-center">{{ getPrize(d, 2, 'count') }}</td>
              <td class="nowrap text-right prize-amount">{{ getPrize(d, 2, 'amount') }}</td>
            </template>
            <td class="nowrap text-right prize-amount">{{ d.pool_amount ? formatNum(d.pool_amount) : '-' }}</td>
            <td class="text-center">
              <button class="detail-btn" @click="$emit('showDetail', d.issue)">详情</button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- 分页控件 -->
    <div class="pagination" v-if="totalPages > 1">
      <button
        class="page-btn"
        :disabled="currentPage <= 1"
        @click="goToPage(1)"
      >首页</button>
      <button
        class="page-btn"
        :disabled="currentPage <= 1"
        @click="goToPage(currentPage - 1)"
      >上一页</button>

      <div class="page-numbers">
        <button
          v-for="p in visiblePages"
          :key="p"
          class="page-num"
          :class="{ active: p === currentPage, ellipsis: p === -1 }"
          :disabled="p === -1"
          @click="p !== -1 && goToPage(p)"
        >{{ p === -1 ? '...' : p }}</button>
      </div>

      <button
        class="page-btn"
        :disabled="currentPage >= totalPages"
        @click="goToPage(currentPage + 1)"
      >下一页</button>
      <button
        class="page-btn"
        :disabled="currentPage >= totalPages"
        @click="goToPage(totalPages)"
      >末页</button>

      <span class="page-info">{{ currentPage }} / {{ totalPages }}</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, computed } from 'vue';
import type { LotteryType, PrizeDetail } from '../api/types';
import { getHistory } from '../api/client';

const props = defineProps<{ type: LotteryType }>();
defineEmits<{ showDetail: [issue: string] }>();

interface DrawWithDetails {
  [key: string]: any;
  prizeDetails?: PrizeDetail[];
}

const draws = ref<DrawWithDetails[]>([]);
const total = ref(0);
const currentPage = ref(1);
const pageSize = ref(15);
const loading = ref(false);

const totalPages = computed(() => Math.ceil(total.value / pageSize.value));

// 根据彩票类型计算列数
const colspan = computed(() => props.type === 'dlt' ? 15 : 11);

// 计算可见页码
const visiblePages = computed(() => {
  const pages: number[] = [];
  const total = totalPages.value;
  const current = currentPage.value;

  if (total <= 7) {
    for (let i = 1; i <= total; i++) pages.push(i);
    return pages;
  }

  pages.push(1);

  if (current > 3) {
    pages.push(-1);
  }

  const start = Math.max(2, current - 1);
  const end = Math.min(total - 1, current + 1);
  for (let i = start; i <= end; i++) {
    pages.push(i);
  }

  if (current < total - 2) {
    pages.push(-1);
  }

  pages.push(total);

  return pages;
});

// 解析 prize_details JSON 字符串
function parsePrizeDetails(d: DrawWithDetails): PrizeDetail[] {
  if (!d.prize_details) return [];
  try {
    const details = JSON.parse(d.prize_details);
    return Array.isArray(details) ? details : [];
  } catch {
    return [];
  }
}

// 加载数据
async function loadData() {
  loading.value = true;
  try {
    const result = await getHistory(props.type, currentPage.value, pageSize.value);
    const rawDraws: DrawWithDetails[] = result.data ?? [];
    for (const d of rawDraws) {
      d.prizeDetails = parsePrizeDetails(d);
    }
    draws.value = rawDraws;
    total.value = result.total ?? 0;
  } catch (e) {
    console.error('加载开奖记录失败:', e);
    draws.value = [];
    total.value = 0;
  } finally {
    loading.value = false;
  }
}

function goToPage(page: number) {
  if (page < 1 || page > totalPages.value) return;
  currentPage.value = page;
  loadData();
}

watch(() => props.type, () => {
  currentPage.value = 1;
  loadData();
}, { immediate: true });

function splitBalls(s: string): string[] {
  if (!s) return [];
  try { const arr = JSON.parse(s); if (Array.isArray(arr)) return arr; } catch {}
  return s.split(',').map(v => v.trim()).filter(Boolean);
}

function getFrontBalls(d: DrawWithDetails): string[] {
  if (d.red_balls) return splitBalls(d.red_balls);
  if (d.front_zone) return splitBalls(d.front_zone);
  if (d.numbers) return splitBalls(d.numbers);
  return [];
}

function getBackBalls(d: DrawWithDetails): string[] {
  if (d.blue_ball) return [d.blue_ball];
  if (d.back_zone) return splitBalls(d.back_zone);
  return [];
}

function getPrize(d: DrawWithDetails, level: number, field: 'count' | 'amount' | 'additional_count' | 'additional_amount'): string {
  const pd = d.prizeDetails?.find((p: PrizeDetail) => p.prize_level.includes(String(level === 1 ? '一' : '二')));
  if (!pd) return '-';
  if (field === 'count') {
    return pd.prize_count === 0 ? '—' : String(pd.prize_count);
  }
  if (field === 'additional_count') {
    return pd.additional_count ? String(pd.additional_count) : '—';
  }
  if (field === 'additional_amount') {
    if (!pd.additional_amount || pd.additional_amount === 0) return '—';
    return formatNum(pd.additional_amount);
  }
  if (pd.prize_amount === null || pd.prize_amount === 0) return '—';
  return formatNum(pd.prize_amount);
}

function formatNum(n: number): string {
  return n.toLocaleString();
}
</script>

<style scoped>
.card { background: #2d2d2d; padding: 20px; border-radius: 8px; margin-top: 16px; }
.table-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px; }
h3 { font-size: 16px; }
.header-info { display: flex; gap: 10px; align-items: center; }
.total-count { color: #808080; font-size: 13px; }
.table-wrap { overflow-x: auto; }
table { width: 100%; border-collapse: collapse; color: #d4d4d4; font-size: 12px; min-width: 1000px; }
th { padding: 10px 6px; text-align: center; font-weight: bold; color: #808080; background: #1e1e1e; border-bottom: 2px solid #404040; }
td { padding: 10px 6px; border-bottom: 1px solid #404040; }
.nowrap { white-space: nowrap; }
.text-right { text-align: right; }
.text-center { text-align: center; }
.prize-amount { color: #e74c3c; }
.ball-row { display: flex; gap: 3px; justify-content: center; flex-wrap: wrap; }
.mini-ball {
  width: 24px; height: 24px; border-radius: 50%;
  display: flex; align-items: center; justify-content: center;
  font-size: 10px; color: white; font-weight: bold;
}
.mini-ball.red { background: #e74c3c; }
.mini-ball.blue { background: #3498db; }
.detail-btn {
  background: #0e639c; color: white; border: none;
  padding: 4px 10px; border-radius: 4px; cursor: pointer; font-size: 11px;
}
.detail-btn:hover { background: #1177bb; }
.loading-cell, .empty-cell {
  text-align: center; padding: 30px; color: #808080;
}

/* 分页样式 */
.pagination {
  display: flex; align-items: center; justify-content: center;
  gap: 8px; margin-top: 16px; padding-top: 16px;
  border-top: 1px solid #404040;
}
.page-btn {
  background: #404040; color: #d4d4d4; border: none;
  padding: 6px 12px; border-radius: 4px; cursor: pointer;
  font-size: 12px; transition: background 0.2s;
}
.page-btn:hover:not(:disabled) { background: #505050; }
.page-btn:disabled { opacity: 0.4; cursor: not-allowed; }
.page-numbers { display: flex; gap: 4px; }
.page-num {
  width: 32px; height: 32px; display: flex; align-items: center; justify-content: center;
  background: #404040; color: #d4d4d4; border: none; border-radius: 4px;
  cursor: pointer; font-size: 12px; transition: background 0.2s;
}
.page-num:hover:not(.active):not(.ellipsis) { background: #505050; }
.page-num.active { background: #0e639c; color: white; }
.page-num.ellipsis { background: transparent; cursor: default; }
.page-info { color: #808080; font-size: 12px; margin-left: 8px; }
</style>
