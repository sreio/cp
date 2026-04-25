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
