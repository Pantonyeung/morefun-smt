import React, { useEffect } from 'react';
import ReactDOM from 'react-dom/client';
import OperationsApp from './OperationsApp';
import { installRandomUuidFallback } from './morefun-core/id';
import './styles.css';
import './demo-truth.css';
import './operations-app.css';
import './mobile-landscape.css';

installRandomUuidFallback();

function showStartupError(error: unknown) {
  const element = document.getElementById('startup-status');
  if (!element) return;
  const message = error instanceof Error ? `${error.name}: ${error.message}` : String(error || '未知錯誤');
  element.innerHTML = `SMT 啟動失敗<small>${message}</small><small>請拍攝此畫面交回檢查。</small>`;
  element.setAttribute('data-state', 'error');
}

class StartupBoundary extends React.Component<React.PropsWithChildren, { error?: Error }> {
  state: { error?: Error } = {};

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  componentDidCatch(error: Error) {
    showStartupError(error);
  }

  render() {
    if (this.state.error) return null;
    return this.props.children;
  }
}

function BootComplete() {
  useEffect(() => {
    document.getElementById('startup-status')?.remove();
  }, []);
  return null;
}

const rootElement = document.getElementById('root');
if (!rootElement) throw new Error('找不到 SMT 根節點');

try {
  ReactDOM.createRoot(rootElement).render(
    <StartupBoundary>
      <OperationsApp />
      <BootComplete />
    </StartupBoundary>,
  );
} catch (error) {
  showStartupError(error);
}

if (import.meta.env.PROD && 'serviceWorker' in navigator && !(window as Window & { Capacitor?: unknown }).Capacitor) {
  window.addEventListener('load', () => {
    void navigator.serviceWorker.register('./sw.js').catch((error) => console.warn('SMT service worker registration failed', error));
  });
}
