<template>
  <div>
    <SalesBanner :type="currentType" />
    <main class="main-content">
      <div class="left-panel">
        <LatestDraw :type="currentType" />
        <RecentDrawsTable :type="currentType" @show-detail="openDetail" />
      </div>
      <div class="right-panel">
        <QuickActions :type="currentType" />
      </div>
    </main>
    <DrawDetail
      :visible="detailVisible"
      :type="currentType"
      :issue="detailIssue"
      @close="detailVisible = false"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import type { LotteryType } from '../api/types';
import SalesBanner from './SalesBanner.vue';
import LatestDraw from './LatestDraw.vue';
import RecentDrawsTable from './RecentDrawsTable.vue';
import QuickActions from './QuickActions.vue';
import DrawDetail from './DrawDetail.vue';

const props = withDefaults(defineProps<{ lotteryType?: LotteryType }>(), {
  lotteryType: 'ssq',
});
const currentType = computed(() => props.lotteryType);

const detailVisible = ref(false);
const detailIssue = ref('');

function openDetail(issue: string) {
  detailIssue.value = issue;
  detailVisible.value = true;
}
</script>

<style scoped>
.main-content {
  display: grid;
  grid-template-columns: 2fr 1fr;
  gap: 16px;
  margin-top: 16px;
}
</style>
