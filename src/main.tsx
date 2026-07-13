import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import DineInItemSplitPatch from './DineInItemSplitPatch';
import './styles.css';
import './ui-v05.css';
import './nav-fix.css';
import './interaction-v061.css';
import './dinein-item-split.css';

const rootElement = document.getElementById('root');

if (!rootElement) {
  throw new Error('找不到 SMT 根節點');
}

ReactDOM.createRoot(rootElement).render(
  <React.StrictMode>
    <App />
    <DineInItemSplitPatch />
  </React.StrictMode>,
);

document.getElementById('startup-status')?.remove();