import type { NetworkOrder, NetworkOrderStatus } from './types';

export type OperationalBucket = 'new' | 'active' | 'exception' | 'archive';

export interface OperationalClassification {
  bucket: OperationalBucket;
  ageMinutes: number;
  suggestedStatus?: NetworkOrderStatus;
  label: string;
}

export function classifyOperationalOrder(
  order: NetworkOrder,
  now = new Date(),
  readyAfterMinutes = 15,
  archiveAfterMinutes = 30,
): OperationalClassification {
  const created = new Date(order.createdAt).getTime();
  const ageMinutes = Number.isFinite(created) ? Math.max(0, Math.floor((now.getTime() - created) / 60_000)) : 0;

  if (order.status === 'abnormal' || order.issueCount > 0) {
    return { bucket: 'exception', ageMinutes, label: '需處理' };
  }
  if (order.status === 'cancelled' || order.status === 'completed') {
    return { bucket: 'archive', ageMinutes, label: '已歸檔' };
  }
  if (order.status === 'pending') {
    return { bucket: 'new', ageMinutes, label: '新單' };
  }
  if (ageMinutes >= archiveAfterMinutes) {
    return { bucket: 'archive', ageMinutes, suggestedStatus: 'completed', label: '自動歸檔' };
  }
  if (ageMinutes >= readyAfterMinutes && order.status !== 'ready') {
    return { bucket: 'active', ageMinutes, suggestedStatus: 'ready', label: '可取餐' };
  }
  return { bucket: 'active', ageMinutes, label: order.status === 'ready' ? '可取餐' : '處理中' };
}
