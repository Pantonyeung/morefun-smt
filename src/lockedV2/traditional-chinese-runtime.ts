const EXACT_TEXT: Record<string, string> = {
  '請將iPhone橫向使用': '請將手機橫向使用',
  '新Submission同正式訂單分開；正式訂單30分鐘後自動完成。': '待接網絡單與正式訂單分開；正式訂單30分鐘後自動完成。',
  '新Submission': '待接網絡單',
  'App／Web新單會先喺度出現': '應用程式／網站新單會先喺度出現',
  '完成Required後先可以正式結帳。': '完成必選項後先可以正式結帳。',
  '退出Kiosk': '退出全屏模式',
  '正式APK提供': '正式安裝版提供',
  'Firebase／網絡': '雲端／網絡',
  '同步Outbox': '待同步佇列',
  'Demo本機': '示範模式本機',
  'sunrise': '暖陽主題',
  'rice': '米白主題',
  'zimi': '紫米主題',
  'moss': '青苔主題',
  'ocean': '海藍主題',
  'night': '夜色主題',
  'DEMO': '示範模式',
  'STAGING': '測試模式',
  'PRODUCTION': '正式模式',
};

const TOKEN_REPLACEMENTS: Array<[RegExp, string]> = [
  [/Required/g, '必選項'],
  [/Pool/g, '共享選項'],
  [/Link Up/g, '連動加配'],
  [/Submission/g, '網絡單'],
  [/Outbox/g, '待同步佇列'],
  [/Kiosk/g, '全屏模式'],
  [/\bDemo\b/g, '示範模式'],
  [/\bpaid\b/gi, '已付款'],
  [/\bunpaid\b/gi, '未付款'],
  [/\bpending\b/gi, '待處理'],
  [/\bprinted\b/gi, '已打印'],
  [/\bqueued\b/gi, '排隊中'],
  [/\bsynced\b/gi, '已同步'],
  [/\bonline\b/gi, '正常'],
  [/\boffline\b/gi, '離線'],
  [/\baccepted\b/gi, '已接單'],
  [/\bpreparing\b/gi, '準備中'],
  [/\bready\b/gi, '可取餐'],
  [/\bcompleted\b/gi, '已完成'],
  [/\bcancelled\b/gi, '已取消'],
  [/\babnormal\b/gi, '異常'],
];

function translateText(input: string): string {
  const trimmed = input.trim();
  if (!trimmed) return input;

  const exact = EXACT_TEXT[trimmed];
  if (exact) return input.replace(trimmed, exact);

  let output = input;
  for (const [pattern, replacement] of TOKEN_REPLACEMENTS) {
    output = output.replace(pattern, replacement);
  }
  return output;
}

function translateAttributes(element: Element): void {
  for (const name of ['placeholder', 'aria-label', 'title']) {
    const value = element.getAttribute(name);
    if (!value) continue;
    const translated = translateText(value);
    if (translated !== value) element.setAttribute(name, translated);
  }
}

function translateTree(root: ParentNode): void {
  if (root instanceof Element) translateAttributes(root);
  root.querySelectorAll?.('*').forEach(translateAttributes);

  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  let node = walker.nextNode();
  while (node) {
    const value = node.nodeValue || '';
    const translated = translateText(value);
    if (translated !== value) node.nodeValue = translated;
    node = walker.nextNode();
  }
}

function startTraditionalChineseGuard(): void {
  const run = () => {
    if (!document.body) return;
    translateTree(document.body);
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', run, { once: true });
  } else {
    run();
  }

  const observer = new MutationObserver((records) => {
    for (const record of records) {
      if (record.type === 'characterData' && record.target.parentNode) {
        const value = record.target.nodeValue || '';
        const translated = translateText(value);
        if (translated !== value) record.target.nodeValue = translated;
        continue;
      }
      record.addedNodes.forEach((node) => {
        if (node.nodeType === Node.TEXT_NODE) {
          const value = node.nodeValue || '';
          const translated = translateText(value);
          if (translated !== value) node.nodeValue = translated;
        } else if (node instanceof Element) {
          translateTree(node);
        }
      });
    }
  });

  observer.observe(document.documentElement, {
    childList: true,
    subtree: true,
    characterData: true,
  });
}

startTraditionalChineseGuard();
