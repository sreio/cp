<template>
  <div id="app">
    <AppHeader v-model:lottery-type="currentType" />
    <SalesBanner :type="currentType" />
    <main class="main-content">
      <div class="left-panel">
        <LatestDraw :type="currentType" />
        <RecentDrawsTable :type="currentType" />
      </div>
      <div class="right-panel">
        <QuickActions :type="currentType" />
      </div>
    </main>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import type { LotteryType } from './api/types';
import AppHeader from './components/AppHeader.vue';
import SalesBanner from './components/SalesBanner.vue';
import LatestDraw from './components/LatestDraw.vue';
import RecentDrawsTable from './components/RecentDrawsTable.vue';
import QuickActions from './components/QuickActions.vue';

const currentType = ref<LotteryType>('ssq');
</script>

<style>
* { margin: 0; padding: 0; box-sizing: border-box; }
body {
  background: #1e1e1e;
  color: #d4d4d4;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
}
#app {
  max-width: 1400px;
  margin: 0 auto;
  padding: 16px;
}
.main-content {
  display: grid;
  grid-template-columns: 2fr 1fr;
  gap: 16px;
  margin-top: 16px;
}
</style>
