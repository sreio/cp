<template>
  <div id="app">
    <AppHeader v-model:lottery-type="currentType" />
    <router-view :lottery-type="currentType" />
  </div>
</template>

<script setup lang="ts">
import { ref, provide } from 'vue';
import type { LotteryType } from './api/types';
import AppHeader from './components/AppHeader.vue';

const currentType = ref<LotteryType>('ssq');
provide('lotteryType', currentType);
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
</style>
