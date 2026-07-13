import type { ApiErrorShape, DeviceIdentity } from '../domain/types';

export interface StaffOrderDraftPayload {
  source: string;
  customer: { name: string; phone: string; note: string };
  pickup: { mode: 'pickup'; requested_time: string };
  payment_method_id: string;
  items: Array<{
    line_id: string;
    product_id: string;
    quantity: number;
    components: Array<{ code: string; quantity: number }>;
    selections: Record<string, string>;
    note: string;
  }>;
}

export interface OrderApiClient {
  health: () => Promise<Record<string, unknown>>;
  readCatalog: () => Promise<unknown>;
  createStaffOrder: (order: StaffOrderDraftPayload, idempotencyKey?: string) => Promise<any>;
  acceptOrder: (orderId: string) => Promise<any>;
  updateOrderStatus: (orderId: string, status: string) => Promise<any>;
  requestReprint: (orderId: string, reason: string) => Promise<any>;
  registerDevice: (body: Record<string, unknown>) => Promise<any>;
  heartbeat: (body: Record<string, unknown>) => Promise<any>;
}

export function createOrderApiClient(options: {
  baseUrl: string;
  getToken: () => Promise<string>;
  getDevice: () => DeviceIdentity;
  fetchFn?: typeof fetch;
}): OrderApiClient {
  const baseUrl = options.baseUrl.replace(/\/+$/, '');
  const fetchFn = options.fetchFn || fetch;

  async function publicCall(path: string) {
    if (!baseUrl) throw apiError('API_BASE_URL_REQUIRED', '尚未設定 Order API 網址', 503);
    const response = await fetchFn(`${baseUrl}${path}`, { headers: { Accept: 'application/json' } });
    return parseResponse(response);
  }

  async function staffCall(path: string, body: unknown, idempotencyKey?: string) {
    if (!baseUrl) throw apiError('API_BASE_URL_REQUIRED', '尚未設定 Order API 網址', 503);
    const token = await options.getToken();
    const device = options.getDevice();
    const headers: Record<string, string> = {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      'X-MoreFun-Surface': 'smt',
      'X-MoreFun-Device-Id': device.deviceId,
    };
    if (device.deviceNumber) headers['X-MoreFun-Device-Number'] = device.deviceNumber;
    if (idempotencyKey) headers['Idempotency-Key'] = idempotencyKey;
    const response = await fetchFn(`${baseUrl}${path}`, { method: 'POST', headers, body: JSON.stringify(body ?? {}) });
    return parseResponse(response);
  }

  return {
    health: () => publicCall('/health'),
    readCatalog: () => publicCall('/api/v1/catalog'),
    createStaffOrder: (order, idempotencyKey = crypto.randomUUID()) => staffCall('/api/v1/staff/orders', { order }, idempotencyKey),
    acceptOrder: (orderId) => staffCall(`/api/v1/staff/orders/${encodeURIComponent(orderId)}/accept`, {}),
    updateOrderStatus: (orderId, status) => staffCall(`/api/v1/staff/orders/${encodeURIComponent(orderId)}/status`, { status }),
    requestReprint: (orderId, reason) => staffCall(`/api/v1/staff/orders/${encodeURIComponent(orderId)}/reprint`, { reason }),
    registerDevice: (body) => staffCall('/api/v1/staff/devices/register', body),
    heartbeat: (body) => staffCall('/api/v1/staff/devices/heartbeat', body),
  };
}

async function parseResponse(response: Response) {
  const json = await response.json().catch(() => ({}));
  if (!response.ok || json?.ok === false) {
    const code = String(json?.error?.code || `HTTP_${response.status}`);
    const message = friendlyError(code, String(json?.error?.message || response.statusText || 'API 請求失敗'));
    throw apiError(code, message, response.status);
  }
  return json?.data ?? json;
}

function friendlyError(code: string, fallback: string): string {
  const messages: Record<string, string> = {
    ORDER_API_DISABLED: 'Staging 訂單寫入尚未啟用，訂單未送出。',
    AUTH_REQUIRED: '登入已過期，請重新登入。',
    STAFF_ROLE_FORBIDDEN: '目前帳戶沒有 SMT 操作權限。',
    DEVICE_NUMBER_CONFLICT: '此 SMT 裝置編號已被另一部裝置使用。',
    DEVICE_REVOKED: '此裝置已被撤銷，請聯絡管理員。',
    ORDER_INVALID: '訂單資料未完整，請檢查待補項目。',
    ORDER_TRANSITION_INVALID: '訂單狀態已變更，請重新整理後再操作。',
    CATALOG_COUNT_INVALID: 'Firebase 商品資料未通過完整性檢查。',
    CATALOG_MANIFEST_INVALID: 'Firebase 商品版本尚未正式提交。',
    IDEMPOTENCY_CONFLICT: '重複提交內容不一致，訂單未重複建立。',
  };
  return messages[code] || fallback;
}

function apiError(code: string, message: string, status: number): ApiErrorShape {
  const error = new Error(message) as ApiErrorShape;
  error.code = code;
  error.status = status;
  return error;
}
