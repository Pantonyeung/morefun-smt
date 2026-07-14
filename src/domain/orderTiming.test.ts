import { describe, expect, it } from 'vitest';
import { classifyOperationalOrder } from './orderTiming';
import type { NetworkOrder } from './types';

const base: NetworkOrder = {
  id: 'o1', orderNo: 'A001', source: 'customer_app', status: 'accepted', total: 100,
  createdAt: '2026-07-14T04:00:00.000Z', updatedAt: '2026-07-14T04:00:00.000Z', itemCount: 2, issueCount: 0, raw: {},
};

describe('classifyOperationalOrder', () => {
  it('keeps pending orders in the new queue', () => {
    expect(classifyOperationalOrder({ ...base, status: 'pending' }, new Date('2026-07-14T04:05:00Z'))).toMatchObject({ bucket: 'new' });
  });

  it('marks accepted orders ready after 15 minutes and archived after 30 minutes', () => {
    expect(classifyOperationalOrder(base, new Date('2026-07-14T04:16:00Z'))).toMatchObject({ bucket: 'active', suggestedStatus: 'ready' });
    expect(classifyOperationalOrder({ ...base, status: 'ready' }, new Date('2026-07-14T04:31:00Z'))).toMatchObject({ bucket: 'archive', suggestedStatus: 'completed' });
  });

  it('always isolates abnormal orders', () => {
    expect(classifyOperationalOrder({ ...base, status: 'abnormal', issueCount: 1 }, new Date('2026-07-14T05:00:00Z'))).toMatchObject({ bucket: 'exception' });
  });
});
