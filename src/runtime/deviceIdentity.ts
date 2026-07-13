import type { DeviceIdentity } from '../domain/types';

const DEVICE_ID_KEY = 'morefun.smt.device_id';
const DEVICE_NUMBER_KEY = 'morefun.smt.device_number';

export function getDeviceIdentity(): DeviceIdentity {
  let deviceId = localStorage.getItem(DEVICE_ID_KEY) || '';
  if (!deviceId) {
    deviceId = `smt-${crypto.randomUUID().replace(/[^a-z0-9]/gi, '').slice(0, 48)}`;
    localStorage.setItem(DEVICE_ID_KEY, deviceId);
  }
  return {
    surface: 'smt',
    deviceId,
    deviceNumber: localStorage.getItem(DEVICE_NUMBER_KEY) || '',
  };
}

export function setDeviceNumber(value: string): DeviceIdentity {
  const normalized = value.trim().toUpperCase();
  if (!/^SMT-\d{2,3}$/.test(normalized)) throw new Error('裝置編號格式必須為 SMT-01');
  localStorage.setItem(DEVICE_NUMBER_KEY, normalized);
  return getDeviceIdentity();
}

export function clearDeviceNumber() {
  localStorage.removeItem(DEVICE_NUMBER_KEY);
}
