export type LotteryType = 'ssq' | 'dlt' | 'fc3d' | 'pl3' | 'pl5';

export interface SSQDraw {
  id: number;
  issue: string;
  draw_date: string;
  week: string | null;
  red_balls: string;
  blue_ball: string;
  pool_amount: number | null;
  sales_amount: number | null;
  source: string;
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
  source: string;
  prize_details: string | null;
  created_at: string;
  updated_at: string;
}

export interface SmallDraw {
  id: number;
  type: string;
  issue: string;
  draw_date: string;
  numbers: string;
  sales_amount: number | null;
  source: string;
  prize_details: string | null;
}

export interface PrizeDetail {
  prize_level: string;
  prize_count: number;
  prize_amount: number | null;
  additional_count: number;
  additional_amount: number | null;
}

export interface WinningLocation {
  prize_level: string;
  location: string;
  win_count: number;
  win_amount: number | null;
}

export interface PrizeLevelDef {
  level: string;
  front_match: string;
  back_match: string;
  description: string;
  prize_pool_under_800m: string;
  prize_pool_over_800m: string;
}
