let fallbackCounter = 0;

export function createClientId(prefix: string): string {
  const cryptoApi = globalThis.crypto as Crypto | undefined;
  if (cryptoApi && typeof cryptoApi.randomUUID === 'function') {
    return `${prefix}-${cryptoApi.randomUUID()}`;
  }

  return `${prefix}-${createFallbackUuid()}`;
}

export function installRandomUuidFallback(): void {
  const scope = globalThis as typeof globalThis & { crypto?: Crypto };
  const current = scope.crypto;
  if (current && typeof current.randomUUID === 'function') return;

  const fallback = () => createFallbackUuid() as `${string}-${string}-${string}-${string}-${string}`;
  if (current) {
    try {
      Object.defineProperty(current, 'randomUUID', { configurable: true, value: fallback });
      return;
    } catch {
      // Some Android WebViews expose a non-extensible crypto object.
    }
  }

  try {
    Object.defineProperty(scope, 'crypto', {
      configurable: true,
      value: { ...(current ?? {}), randomUUID: fallback },
    });
  } catch {
    // createClientId still provides a safe fallback even when the global cannot be patched.
  }
}

function createFallbackUuid(): string {
  fallbackCounter = (fallbackCounter + 1) % 1_000_000;
  const time = Date.now().toString(36).padStart(10, '0').slice(-10);
  const randomA = Math.floor(Math.random() * 0xFFFFFF).toString(16).padStart(6, '0');
  const randomB = Math.floor(Math.random() * 0xFFFFFF).toString(16).padStart(6, '0');
  const counter = fallbackCounter.toString(16).padStart(5, '0');
  return `${time.slice(0, 8)}-${time.slice(8)}${randomA.slice(0, 2)}-4${randomA.slice(2, 5)}-a${randomA.slice(5)}${randomB.slice(0, 2)}-${randomB.slice(2)}${counter}`;
}
