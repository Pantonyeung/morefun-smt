import type { NetworkOrder } from '../domain/types';

export interface OperationalTiming {
  elapsedMinutes: number;
  remainingMinutes: number;
  isFinalFiveMinutes: boolean;
  isExpired: boolean;
}

export function buildCategorySlots(categories: string[]): string[] {
  const unique = [...new Set(categories.filter(Boolean))];
  const visible = ['全部', ...unique.slice(0, 11)];
  if (unique.length > 11) visible.push('更多');
  while (visible.length < 13) visible.push('');
  return [...visible.slice(0, 13), '搜尋'];
}

export function getOperationalTiming(order: NetworkOrder, now: number, extensionMinutes = 0): OperationalTiming {
  const acceptedAt = String(order.raw.accepted_at || order.raw.acceptedAt || order.updatedAt || order.createdAt);
  const acceptedTime = Number.isFinite(Date.parse(acceptedAt)) ? Date.parse(acceptedAt) : Date.parse(order.createdAt);
  const elapsedMinutes = Math.max(0, Math.floor((now - acceptedTime) / 60_000));
  const remainingMinutes = Math.max(0, 30 + extensionMinutes - elapsedMinutes);
  return {
    elapsedMinutes,
    remainingMinutes,
    isFinalFiveMinutes: remainingMinutes > 0 && remainingMinutes <= 5,
    isExpired: remainingMinutes === 0,
  };
}

export function displayTableName(index: number): string {
  return index === 8 ? '外1' : `堂${index + 1}`;
}
