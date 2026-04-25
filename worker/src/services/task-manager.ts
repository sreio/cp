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
  // 内部状态：用于分批处理
  _cursor?: number; // 当前处理到的 issue 编号或页码
  _lastIssue?: string; // 上次处理的 issue
}

// 全局任务存储（Workers 单实例）
const tasks = new Map<string, PullTask>();

// 任务过期时间（30 分钟）
const TASK_TTL = 30 * 60 * 1000;

function generateId(): string {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}

// 清理过期任务
function cleanup() {
  const now = Date.now();
  for (const [id, task] of tasks) {
    if (now - task.created_at > TASK_TTL) {
      tasks.delete(id);
    }
  }
}

export function createTask(type: LotteryType, total: number): PullTask {
  cleanup();
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
    _cursor: 0,
  };
  tasks.set(task.id, task);
  return task;
}

export function getTask(id: string): PullTask | null {
  return tasks.get(id) ?? null;
}

export function cancelTask(id: string): boolean {
  const task = tasks.get(id);
  if (!task) return false;
  if (task.status === 'running') {
    task.status = 'cancelled';
  }
  return true;
}

export function updateTask(id: string, updates: Partial<PullTask>): void {
  const task = tasks.get(id);
  if (!task) return;
  Object.assign(task, updates);
}

// 每个彩种的预估总期数
export function estimateTotal(type: LotteryType): number {
  switch (type) {
    case 'ssq': return 3500;   // 双色球 2003 年至今
    case 'dlt': return 2500;   // 大乐透 2007 年至今
    case 'fc3d': return 8000;  // 福彩3D 2004 年至今
    case 'pl3': return 8000;   // 排列3 2004 年至今
    case 'pl5': return 8000;   // 排列5 2004 年至今
    default: return 5000;
  }
}
