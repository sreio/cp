<template>
  <Teleport to="body">
    <div class="modal-overlay" v-if="visible">
      <div class="modal">
        <div class="modal-header">
          <h3>📥 拉取全部历史数据</h3>
          <button class="close-btn" @click="handleClose">×</button>
        </div>
        <div class="modal-body">
          <div class="info-row">
            <span class="label">彩票类型</span>
            <span class="value">{{ typeName }}</span>
          </div>
          <div class="info-row">
            <span class="label">状态</span>
            <span :class="['status', statusClass]">{{ statusText }}</span>
          </div>

          <div class="progress-section">
            <div class="progress-bar-wrap">
              <div class="progress-bar" :style="{ width: progressPercent + '%' }"></div>
            </div>
            <div class="progress-text">{{ progressPercent }}%</div>
          </div>

          <div class="stats">
            <div class="stat-item">
              <span class="stat-value">{{ task.processed }}</span>
              <span class="stat-label">已处理</span>
            </div>
            <div class="stat-item">
              <span class="stat-value">{{ task.total }}</span>
              <span class="stat-label">总计</span>
            </div>
            <div class="stat-item green">
              <span class="stat-value">{{ task.pulled }}</span>
              <span class="stat-label">新增</span>
            </div>
            <div class="stat-item gray">
              <span class="stat-value">{{ task.skipped }}</span>
              <span class="stat-label">跳过</span>
            </div>
          </div>

          <div class="errors" v-if="task.errors.length > 0">
            <div class="errors-header">错误信息（{{ task.errors.length }}）</div>
            <div class="errors-list">
              <div v-for="(err, i) in task.errors.slice(0, 5)" :key="i" class="error-item">{{ err }}</div>
              <div v-if="task.errors.length > 5" class="error-more">...还有 {{ task.errors.length - 5 }} 条错误</div>
            </div>
          </div>

          <div class="actions">
            <button
              v-if="task.status === 'running'"
              class="cancel-btn"
              @click="handleCancel"
            >取消</button>
            <button
              v-else
              class="done-btn"
              @click="handleClose"
            >完成</button>
          </div>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, computed, onUnmounted, watch } from 'vue';
import type { LotteryType } from '../api/types';
import { pullAllHistory, processPullBatch, cancelPullTask } from '../api/client';

const props = defineProps<{
  visible: boolean;
  type: LotteryType;
}>();
const emit = defineEmits<{ close: [] }>();

const task = ref({
  id: '',
  type: '' as LotteryType,
  status: 'running' as 'running' | 'completed' | 'failed' | 'cancelled',
  total: 0,
  processed: 0,
  pulled: 0,
  skipped: 0,
  errors: [] as string[],
});

let pollTimer: ReturnType<typeof setInterval> | null = null;

const typeName = computed(() => {
  const map: Record<string, string> = { ssq: '双色球', dlt: '大乐透', fc3d: '福彩3D', pl3: '排列3', pl5: '排列5' };
  return map[task.value.type] ?? '';
});

const progressPercent = computed(() => {
  if (task.value.total === 0) return 0;
  return Math.min(Math.round((task.value.processed / task.value.total) * 100), 100);
});

const statusClass = computed(() => {
  switch (task.value.status) {
    case 'running': return 'running';
    case 'completed': return 'completed';
    case 'failed': return 'failed';
    case 'cancelled': return 'cancelled';
    default: return '';
  }
});

const statusText = computed(() => {
  switch (task.value.status) {
    case 'running': return '拉取中...';
    case 'completed': return '已完成';
    case 'failed': return '失败';
    case 'cancelled': return '已取消';
    default: return '';
  }
});

watch(() => props.visible, async (val) => {
  if (val) {
    await startPull();
  } else {
    stopPoll();
  }
});

async function startPull() {
  try {
    const result = await pullAllHistory(props.type);
    task.value.id = result.task_id;
    task.value.type = props.type;
    task.value.status = 'running';
    startPoll();
  } catch (err) {
    task.value.status = 'failed';
    task.value.errors.push(`启动失败: ${err instanceof Error ? err.message : '未知错误'}`);
  }
}

function startPoll() {
  stopPoll();
  pollTimer = setInterval(async () => {
    if (!task.value.id) return;
    try {
      const data = await processPullBatch(task.value.id);
      task.value = { ...task.value, ...data };
      if (data.status !== 'running') {
        stopPoll();
      }
    } catch {
      // 忽略轮询错误，继续重试
    }
  }, 2000);
}

function stopPoll() {
  if (pollTimer) {
    clearInterval(pollTimer);
    pollTimer = null;
  }
}

async function handleCancel() {
  if (task.value.id) {
    try {
      await cancelPullTask(task.value.id);
    } catch {}
  }
  task.value.status = 'cancelled';
  stopPoll();
}

function handleClose() {
  stopPoll();
  emit('close');
}

onUnmounted(stopPoll);
</script>

<style scoped>
.modal-overlay {
  position: fixed; top: 0; left: 0; right: 0; bottom: 0;
  background: rgba(0,0,0,0.7); z-index: 200;
  display: flex; align-items: center; justify-content: center;
}
.modal {
  background: #2d2d2d; border-radius: 8px; width: 480px;
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
.info-row {
  display: flex; justify-content: space-between; align-items: center;
  margin-bottom: 12px; font-size: 14px;
}
.label { color: #808080; }
.value { color: #d4d4d4; font-weight: bold; }
.status { font-weight: bold; }
.status.running { color: #f39c12; }
.status.completed { color: #2ecc71; }
.status.failed { color: #e74c3c; }
.status.cancelled { color: #808080; }

.progress-section {
  display: flex; align-items: center; gap: 12px; margin: 20px 0;
}
.progress-bar-wrap {
  flex: 1; height: 20px; background: #1e1e1e; border-radius: 10px;
  overflow: hidden;
}
.progress-bar {
  height: 100%; background: linear-gradient(90deg, #2ecc71, #27ae60);
  border-radius: 10px; transition: width 0.3s;
}
.progress-text {
  color: #2ecc71; font-weight: bold; font-size: 14px; min-width: 40px;
  text-align: right;
}

.stats {
  display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px;
  margin: 16px 0;
}
.stat-item {
  text-align: center; padding: 12px; background: #1e1e1e; border-radius: 6px;
}
.stat-value {
  display: block; font-size: 20px; font-weight: bold; color: #d4d4d4;
}
.stat-item.green .stat-value { color: #2ecc71; }
.stat-item.gray .stat-value { color: #808080; }
.stat-label {
  display: block; font-size: 12px; color: #808080; margin-top: 4px;
}

.errors {
  margin: 16px 0; background: #1e1e1e; border-radius: 6px; padding: 12px;
}
.errors-header { color: #e74c3c; font-size: 13px; margin-bottom: 8px; }
.errors-list { max-height: 100px; overflow-y: auto; }
.error-item { font-size: 12px; color: #808080; margin-bottom: 4px; }
.error-more { font-size: 12px; color: #606060; }

.actions { display: flex; justify-content: flex-end; gap: 8px; margin-top: 16px; }
.cancel-btn, .done-btn {
  padding: 8px 20px; border: none; border-radius: 6px; cursor: pointer;
  font-size: 14px;
}
.cancel-btn { background: #404040; color: #d4d4d4; }
.cancel-btn:hover { background: #505050; }
.done-btn { background: #0e639c; color: white; }
.done-btn:hover { background: #1177bb; }
</style>
