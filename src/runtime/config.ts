import type { RuntimeMode } from '../domain/types';

export interface SmtRuntimeConfig {
  mode: RuntimeMode;
  orderApiBaseUrl: string;
  appVersion: string;
  firebase: {
    apiKey: string;
    authDomain: string;
    databaseURL: string;
    projectId: string;
    storageBucket: string;
    messagingSenderId: string;
    appId: string;
  };
}

function readMode(value: unknown): RuntimeMode {
  const mode = String(value || '').toLowerCase();
  return mode === 'demo' || mode === 'live' ? mode : 'staging';
}

export function getRuntimeConfig(): SmtRuntimeConfig {
  const injected = (globalThis as typeof globalThis & { __MOREFUN_SMT_CONFIG__?: Partial<SmtRuntimeConfig> }).__MOREFUN_SMT_CONFIG__;
  const mode = readMode(injected?.mode || import.meta.env.VITE_RUNTIME_MODE || localStorage.getItem('morefun.smt.runtime_mode'));
  return {
    mode,
    orderApiBaseUrl: String(injected?.orderApiBaseUrl || import.meta.env.VITE_ORDER_API_URL || '').replace(/\/+$/, ''),
    appVersion: String(injected?.appVersion || import.meta.env.VITE_APP_VERSION || '1.0.0-trial'),
    firebase: {
      apiKey: String(injected?.firebase?.apiKey || import.meta.env.VITE_FIREBASE_API_KEY || ''),
      authDomain: String(injected?.firebase?.authDomain || import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || ''),
      databaseURL: String(injected?.firebase?.databaseURL || import.meta.env.VITE_FIREBASE_DATABASE_URL || ''),
      projectId: String(injected?.firebase?.projectId || import.meta.env.VITE_FIREBASE_PROJECT_ID || ''),
      storageBucket: String(injected?.firebase?.storageBucket || import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || ''),
      messagingSenderId: String(injected?.firebase?.messagingSenderId || import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || ''),
      appId: String(injected?.firebase?.appId || import.meta.env.VITE_FIREBASE_APP_ID || ''),
    },
  };
}

export function validateRuntimeConfig(config: SmtRuntimeConfig): string[] {
  if (config.mode === 'demo') return [];
  const errors: string[] = [];
  if (!config.orderApiBaseUrl) errors.push('VITE_ORDER_API_URL');
  for (const [key, value] of Object.entries(config.firebase)) if (!value) errors.push(`firebase.${key}`);
  return errors;
}

export function setRuntimeMode(mode: RuntimeMode) {
  localStorage.setItem('morefun.smt.runtime_mode', mode);
  location.reload();
}
