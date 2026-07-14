import { describe, expect, it } from 'vitest';
import { canAddToCart, canSubmitOrder, classifyCompletion } from './completion';

const drinkPending = [{ kind: 'drink' as const, message: '請選擇飲品' }];

describe('More Fun completion model', () => {
  it('allows takeaway drink-pending items into cart but blocks payment', () => {
    expect(classifyCompletion(drinkPending, 'takeaway')).toBe('pending_allowed');
    expect(canAddToCart(drinkPending, 'takeaway')).toBe(true);
    expect(canSubmitOrder(drinkPending, 'takeaway')).toBe(false);
  });

  it('treats dine-in drink pending as a reminder that does not block table hold', () => {
    expect(classifyCompletion(drinkPending, 'dinein')).toBe('reminder_only');
    expect(canSubmitOrder(drinkPending, 'dinein')).toBe(true);
  });

  it('blocks sold-out, invalid and explicitly blocking combinations', () => {
    expect(canAddToCart([{ kind: 'sold_out', message: '已售罄' }])).toBe(false);
    expect(canAddToCart([{ kind: 'rice_ball', message: '跨價層不可雙拼', severity: 'blocking' }])).toBe(false);
  });

  it('allows complete items to be added and submitted', () => {
    expect(classifyCompletion([])).toBe('complete');
    expect(canAddToCart([])).toBe(true);
    expect(canSubmitOrder([])).toBe(true);
  });
});
