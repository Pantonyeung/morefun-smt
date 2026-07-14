import { afterEach, describe, expect, it, vi } from 'vitest';
import { createClientId } from './id';

afterEach(() => vi.restoreAllMocks());

describe('createClientId', () => {
  it('uses randomUUID when the runtime provides it', () => {
    vi.stubGlobal('crypto', { randomUUID: () => 'uuid-123' });
    expect(createClientId('cart')).toBe('cart-uuid-123');
  });

  it('creates unique fallback ids when randomUUID is unavailable', () => {
    vi.stubGlobal('crypto', {});
    vi.spyOn(Date, 'now').mockReturnValue(1_700_000_000_000);
    vi.spyOn(Math, 'random').mockReturnValue(0.25);
    const first = createClientId('cart');
    const second = createClientId('cart');
    expect(first).toMatch(/^cart-/);
    expect(second).toMatch(/^cart-/);
    expect(first).not.toBe(second);
  });
});
