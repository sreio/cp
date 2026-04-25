export type LotteryType = 'ssq' | 'dlt' | 'fc3d' | 'pl3' | 'pl5';
export type DataSource = 'official' | 'third_party' | 'manual';

export interface SSQDraw {
  id: number;
  issue: string;
  draw_date: string;
  week: string | null;
  red_balls: string;
  blue_ball: string;
  pool_amount: number | null;
  sales_amount: number | null;
  source: DataSource;
  prize_details: string | null;
  created_at: string;
  updated_at: string;
}

export interface DLTDraw {
  id: number;
  issue: string;
  draw_date: string;
  week: string | null;
  front_zone: string;
  back_zone: string;
  pool_amount: number | null;
  sales_amount: number | null;
  source: DataSource;
  prize_details: string | null;
  created_at: string;
  updated_at: string;
}

export interface SmallDraw {
  id: number;
  type: LotteryType;
  issue: string;
  draw_date: string;
  numbers: string;
  sales_amount: number | null;
  source: DataSource;
  prize_details: string | null;
  created_at: string;
  updated_at: string;
}

export interface PrizeDetail {
  id: number;
  lottery_type: LotteryType;
  issue: string;
  prize_level: string;
  prize_count: number;
  prize_amount: number | null;
  additional_count: number;
  additional_amount: number | null;
  created_at: string;
}

export interface WinningLocation {
  id: number;
  lottery_type: LotteryType;
  issue: string;
  prize_level: string;
  location: string;
  win_count: number;
  win_amount: number | null;
  created_at: string;
}

export interface Webhook {
  id: number;
  name: string;
  type: 'dingtalk' | 'wechat' | 'feishu' | 'generic';
  url: string;
  secret: string | null;
  enabled: number;
  events: string;
  created_at: string;
  updated_at: string;
}

export interface PrizeLevel {
  level: string;
  front_match: number;
  back_match: number;
  description: string;
  prize_pool_under_800m: string | number;
  prize_pool_over_800m: string | number;
}
