import React from 'react';
import ReactDOM from 'react-dom/client';
import OperationsApp from './OperationsApp';
import './styles.css';
import './demo-truth.css';
import './operations-app.css';

const rootElement = document.getElementById('root');
if (!rootElement) throw new Error('找不到 SMT 根節點');

ReactDOM.createRoot(rootElement).render(
  <React.StrictMode>
    <OperationsApp />
  </React.StrictMode>,
);

document.getElementById('startup-status')?.remove();

if (import.meta.env.PROD && 'serviceWorker' in navigator && !(window as Window & { Capacitor?: unknown }).Capacitor) {
  window.addEventListener('load', () => {
    void navigator.serviceWorker.register('/sw.js').catch((error) => console.warn('SMT service worker registration failed', error));
  });
}
