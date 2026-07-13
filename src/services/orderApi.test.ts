import { describe, expect, it, vi } from 'vitest';
import { createOrderApiClient } from './orderApi';

const device = { surface: 'smt' as const, deviceId: 'smt-1234567890abcdef', deviceNumber: 'SMT-01' };

describe('order API client', () => {
  it('adds Firebase token, SMT surface, device and idempotency headers', async () => {
    const fetchFn = vi.fn(async (_url: string | URL | Request, init?: RequestInit) => new Response(JSON.stringify({ ok: true, data: { order: { order_id: 'MF-1' } } }), { status: 201, headers: { 'Content-Type': 'application/json' } }));
    const client = createOrderApiClient({ baseUrl: 'https://api.example', getToken: async () => 'token', getDevice: () => device, fetchFn: fetchFn as typeof fetch });
    await client.createStaffOrder({ source: 'smt', customer: { name: '', phone: '', note: '' }, pickup: { mode: 'pickup', requested_time: 'asap' }, payment_method_id: 'cash', items: [{ line_id: 'line-1', product_id: 'p1', quantity: 1, components: [], selections: {}, note: '' }] }, 'idempotency-key-123456');
    const [, init] = fetchFn.mock.calls[0];
    expect((init?.headers as Record<string, string>)['X-MoreFun-Surface']).toBe('smt');
    expect((init?.headers as Record<string, string>)['X-MoreFun-Device-Number']).toBe('SMT-01');
    expect((init?.headers as Record<string, string>)['Idempotency-Key']).toBe('idempotency-key-123456');
  });

  it('keeps backend disabled errors explicit', async () => {
    const fetchFn = vi.fn(async () => new Response(JSON.stringify({ ok: false, error: { code: 'ORDER_API_DISABLED', message: 'disabled' } }), { status: 503, headers: { 'Content-Type': 'application/json' } }));
    const client = createOrderApiClient({ baseUrl: 'https://api.example', getToken: async () => 'token', getDevice: () => device, fetchFn: fetchFn as typeof fetch });
    await expect(client.acceptOrder('MF-1')).rejects.toMatchObject({ code: 'ORDER_API_DISABLED', message: 'Staging 訂單寫入尚未啟用，訂單未送出。' });
  });
});
