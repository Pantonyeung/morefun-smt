export function createSafeId(prefix = ''): string {
  const cryptoApi = globalThis.crypto as Crypto & { randomUUID?: () => string };
  let value = '';

  if (typeof cryptoApi?.randomUUID === 'function') {
    value = cryptoApi.randomUUID();
  } else if (typeof cryptoApi?.getRandomValues === 'function') {
    const bytes = new Uint8Array(16);
    cryptoApi.getRandomValues(bytes);
    bytes[6] = (bytes[6] & 0x0f) | 0x40;
    bytes[8] = (bytes[8] & 0x3f) | 0x80;
    value = Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
  } else {
    value = `${Date.now().toString(36)}${Math.random().toString(36).slice(2)}${Math.random().toString(36).slice(2)}`;
  }

  const normalized = value.replace(/[^a-z0-9]/gi, '').toLowerCase();
  return `${prefix}${normalized}`;
}
