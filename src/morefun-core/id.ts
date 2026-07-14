let fallbackCounter = 0;

export function createClientId(prefix: string): string {
  const cryptoApi = globalThis.crypto as Crypto | undefined;
  if (cryptoApi && typeof cryptoApi.randomUUID === 'function') {
    return `${prefix}-${cryptoApi.randomUUID()}`;
  }

  fallbackCounter = (fallbackCounter + 1) % 1_000_000;
  const time = Date.now().toString(36);
  const random = Math.floor(Math.random() * 0xFFFFFF).toString(36).padStart(5, '0');
  const counter = fallbackCounter.toString(36).padStart(3, '0');
  return `${prefix}-${time}-${random}-${counter}`;
}
