import { describe, expect, it } from 'vitest';
import type { NetworkOrder } from '../domain/types';
import { buildCategorySlots, displayTableName, getOperationalTiming } from './layoutPolicy';

const order: NetworkOrder = {
  id: 'o-1',
  orderNo: '#1',
  source: 'walk_in',
  status: 'accepted',
  total: 50,
  createdAt: '2026-07-17T10:00:00.000Z',
  updatedAt: '2026-07-17T10:00:00.000Z',
  itemCount: 1,
  issueCount: 0,
  raw: { accepted_at: '2026-07-17T10:00:00.000Z' },
};

describe('locked landscape policy', () => {
  it('keeps search as the final cell of a 2x7 category matrix', () => {
    const slots = buildCategorySlots(['套餐', '便當', '飯團']);
    expect(slots).toHaveLength(14);
    expect(slots[0]).toBe('全部');
    expect(slots[13]).toBe('搜尋');
  });

  it('calculates the formal-order 30 minute countdown', () => {
    const timing = getOperationalTiming(order, Date.parse('2026-07-17T10:27:00.000Z'));
    expect(timing.remainingMinutes).toBe(3);
    expect(timing.isFinalFiveMinutes).toBe(true);
    expect(timing.isExpired).toBe(false);
  });

  it('uses fixed dine-in table names', () => {
    expect(displayTableName(0)).toBe('堂1');
    expect(displayTableName(7)).toBe('堂8');
    expect(displayTableName(8)).toBe('外1');
  });
});
