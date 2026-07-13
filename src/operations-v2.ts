const LABELS: Record<string, string> = {
  點單: '首頁',
  工作台: '訂單',
  掛單: '掛單／取單',
};

function rewriteLabels(root: ParentNode = document) {
  root.querySelectorAll<HTMLElement>('.bottom-nav strong').forEach((node) => {
    const next = LABELS[node.textContent?.trim() || ''];
    if (next) node.textContent = next;
  });

  root.querySelectorAll<HTMLElement>('.panel-header h1').forEach((node) => {
    if (node.textContent?.trim() === '訂單工作台') node.textContent = '訂單';
  });

  root.querySelectorAll<HTMLElement>('.cart-heading strong').forEach((node) => {
    if (node.textContent?.trim() === '購物車') node.textContent = '目前訂單';
  });

  root.querySelectorAll<HTMLButtonElement>('.bottom-nav button').forEach((button) => {
    const label = button.querySelector('strong')?.textContent?.trim();
    button.dataset.navLabel = label || '';
  });

  const workbench = root.querySelector<HTMLElement>('.panel:has(.order-list)');
  if (workbench) workbench.classList.add('operations-order-board');
}

function attachOperationsV2() {
  document.documentElement.dataset.smtUi = 'operations-v2';
  rewriteLabels();
  const observer = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      mutation.addedNodes.forEach((node) => {
        if (node instanceof HTMLElement) rewriteLabels(node);
      });
    }
  });
  observer.observe(document.body, { childList: true, subtree: true });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', attachOperationsV2, { once: true });
} else {
  attachOperationsV2();
}
