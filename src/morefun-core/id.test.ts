import { afterEach, describe, expect, it, vi } from 'vitest';
import { createClientId, installRandomUuidFallback } from './id';

afterEach(() => vi.unstubAllGlobals());

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
    vi.restoreAllMocks();
  });
});

describe('installRandomUuidFallback', () => {
  it('adds randomUUID for older Android WebViews without replacing existing crypto fields', () => {
    const cryptoObject = { getRandomValues: () => 'kept' };
    vi.stubGlobal('crypto', cryptoObject);
    installRandomUuidFallback();
    expect(globalThis.crypto.getRandomValues).toBe(cryptoObject.getRandomValues);
    expect(typeof globalThis.crypto.randomUUID).toBe('function');
    expect(globalThis.crypto.randomUUID()).toMatch(/^[a-z0-9-]+$/i);
  });

  it('keeps the native randomUUID implementation when available', () => {
    const native = () => 'native-uuid';
    vi.stubGlobal('crypto', { randomUUID: native });
    installRandomUuidFallback();
    expect(globalThis.crypto.randomUUID).toBe(native);
  });
});
