import axios from 'axios';
import type { LotteryType, SSQDraw, DLTDraw, SmallDraw } from './types';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE || '/api',
  timeout: 10000,
});

export async function getLatest(type: LotteryType) {
  const { data } = await api.get<SSQDraw | DLTDraw | SmallDraw>('/lottery/latest', { params: { type } });
  return data;
}

export async function getHistory(type: LotteryType, page = 1, size = 20) {
  const { data } = await api.get('/lottery/history', { params: { type, page, size } });
  return data;
}

export async function getDrawDetail(type: LotteryType, issue: string) {
  const { data } = await api.get(`/lottery/draw/${type}/${issue}`);
  return data;
}

export async function getPrizeLevels(type: LotteryType) {
  const { data } = await api.get('/lottery/prize-levels', { params: { type } });
  return data;
}

export async function recommendNumbers(type: LotteryType, count = 5) {
  const { data } = await api.post('/tools/recommend', { type, count });
  return data;
}

export async function getHotCold(type: LotteryType, range = 30) {
  const { data } = await api.get('/analysis/hot-cold', { params: { type, range } });
  return data;
}

export async function getMissing(type: LotteryType, range = 30) {
  const { data } = await api.get('/analysis/missing', { params: { type, range } });
  return data;
}

export async function getFeatures(type: LotteryType, range = 30) {
  const { data } = await api.get('/analysis/features', { params: { type, range } });
  return data;
}

export async function checkExists(type: LotteryType, issues: string[]) {
  const { data } = await api.post('/lottery/check-exists', { type, issues });
  return data;
}

export async function pullData(params: {
  type: LotteryType;
  mode: 'issue' | 'date_range';
  issues?: string[];
  start_date?: string;
  end_date?: string;
  force_update?: boolean;
}) {
  const { data } = await api.post('/lottery/pull', params);
  return data;
}

// 异步批量拉取
export async function pullAllHistory(type: LotteryType) {
  const { data } = await api.post('/lottery/pull-all', { type });
  return data as { task_id: string };
}

export async function getPullTask(taskId: string) {
  const { data } = await api.get(`/lottery/pull-task/${taskId}`);
  return data as {
    id: string;
    type: LotteryType;
    status: 'running' | 'completed' | 'failed' | 'cancelled';
    total: number;
    processed: number;
    pulled: number;
    skipped: number;
    errors: string[];
  };
}

export async function processPullBatch(taskId: string) {
  const { data } = await api.post(`/lottery/pull-task/${taskId}/process`);
  return data;
}

export async function cancelPullTask(taskId: string) {
  const { data } = await api.post(`/lottery/pull-task/${taskId}/cancel`);
  return data;
}
