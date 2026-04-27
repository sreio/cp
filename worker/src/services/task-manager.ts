import type { LotteryType } from '../db/types';

export interface PullTask {
  id: string;
  type: LotteryType;
  status: 'running' | 'completed' | 'failed' | 'cancelled';
  total: number;
  processed: number;
  pulled: number;
  skipped: number;
  errors: string[];
  created_at: number;
  _cursor?: number; // 内部状态：当前处理位置
}

// 内存存储（Workers 单实例）
const tasks = new Map<string, PullTask>();

function generateId(): string {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}

export function createTask(type: LotteryType, total: number): PullTask {
  const task: PullTask = {
    id: generateId(),
    type,
    status: 'running',
    total,
    processed: 0,
    pulled: 0,
    skipped: 0,
    errors: [],
    created_at: Date.now(),
    _cursor: type === 'ssq' ? 2003 * 1000 + 1 : 0,
  };
  tasks.set(task.id, task);
  return task;
}

export function getTask(id: string): PullTask | undefined {
  return tasks.get(id);
}

export function updateTask(id: string, updates: Partial<PullTask>): void {
  const task = tasks.get(id);
  if (task) {
    Object.assign(task, updates);
  }
}

export function cancelTask(id: string): boolean {
  const task = tasks.get(id);
  if (!task || task.status !== 'running') return false;
  task.status = 'cancelled';
  return true;
}

export function estimateTotal(type: LotteryType): number {
  const now = new Date();
  const currentYear = now.getFullYear();

  switch (type) {
    case 'ssq':
      // 2003 年开始，每年约 153 期
      return (currentYear - 2003 + 1) * 153;
    case 'dlt':
      // 2007 年开始，每年约 153 期
      return (currentYear - 2007 + 1) * 153;
    case 'fc3d':
    case 'pl3':
      // 每天开奖，每年 365 期
      return (currentYear - 2004 + 1) * 365;
    case 'pl5':
      return (currentYear - 2004 + 1) * 365;
    default:
      return 0;
  }
}
