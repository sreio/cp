import type { LotteryType, DataSource } from '../db/types';

export interface DrawData {
  type: LotteryType;
  issue: string;
  draw_date: string;
  week?: string;
  numbers: {
    front: string[];
    back: string[];
  };
  pool_amount?: number;
  sales_amount?: number;
  source: DataSource;
  prize_details?: PrizeDetailData[];
  winning_locations?: WinningLocationData[];
}

export interface PrizeDetailData {
  prize_level: string;
  prize_count: number;
  prize_amount: number;
  additional_count?: number;
  additional_amount?: number;
}

export interface WinningLocationData {
  prize_level: string;
  location: string;
  win_count: number;
  win_amount?: number;
}

export interface DataSourceAdapter {
  name: string;
  fetchLatest(type: LotteryType): Promise<DrawData | null>;
  fetchByIssue(type: LotteryType, issue: string): Promise<DrawData | null>;
  fetchByDateRange(type: LotteryType, startDate: string, endDate: string): Promise<DrawData[]>;
  fetchByIssues(type: LotteryType, issues: string[]): Promise<DrawData[]>;
}
