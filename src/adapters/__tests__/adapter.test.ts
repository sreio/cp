import { describe, it, expect } from 'vitest';
import { ThirdPartyAdapter } from '../third-party';

describe('ThirdPartyAdapter', () => {
  it('应能解析双色球 opencode 格式的号码', () => {
    const adapter = new ThirdPartyAdapter();
    const result = (adapter as any).parseNumbers('ssq', {
      opencode: '01,02,03,04,05,06+07',
    });
    expect(result.front).toEqual(['01', '02', '03', '04', '05', '06']);
    expect(result.back).toEqual(['07']);
  });

  it('应能解析大乐透号码', () => {
    const adapter = new ThirdPartyAdapter();
    const result = (adapter as any).parseNumbers('dlt', {
      front_zone: [1, 2, 3, 4, 5],
      back_zone: [1, 2],
    });
    expect(result.front).toEqual(['01', '02', '03', '04', '05']);
    expect(result.back).toEqual(['01', '02']);
  });

  it('应能解析小盘彩号码', () => {
    const adapter = new ThirdPartyAdapter();
    const result = (adapter as any).parseNumbers('fc3d', {
      numbers: [1, 2, 3],
    });
    expect(result.front).toEqual(['1', '2', '3']);
    expect(result.back).toEqual([]);
  });
});
