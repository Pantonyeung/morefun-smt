import { useMemo, useState } from 'react';
import type { CartItem, OrderSource, PaymentMethod, Product, RuntimeMode } from '../domain/types';

const sources: Array<{ key: OrderSource; label: string }> = [
  { key: 'walk_in', label: '外賣' },
  { key: 'phone', label: 'WhatsApp／電話' },
  { key: 'keeta', label: 'Keeta' },
  { key: 'foodpanda', label: 'Foodpanda' },
];
const payments: Array<{ key: PaymentMethod; label: string }> = [
  { key: 'cash', label: '現金' }, { key: 'alipay', label: 'Alipay' }, { key: 'wechat_pay', label: 'WeChat Pay' },
  { key: 'fps', label: '轉數快' }, { key: 'payme', label: 'PayMe' }, { key: 'mixed', label: '組合支付' },
];

export function OperationsCheckout({ items, products, total, runtimeMode, busy, initialSource, onSource, onSubmit, onClose }: {
  items: CartItem[]; products: Record<string, Product>; total: number; runtimeMode: RuntimeMode; busy: boolean;
  initialSource: OrderSource; onSource: (source: OrderSource) => void;
  onSubmit: (method: PaymentMethod) => Promise<void>; onClose: () => void;
}) {
  const [source, setSource] = useState<OrderSource>(['phone', 'keeta', 'foodpanda'].includes(initialSource) ? initialSource : 'walk_in');
  const [method, setMethod] = useState<PaymentMethod>('cash');
  const [received, setReceived] = useState(String(total));
  const [cashPart, setCashPart] = useState(String(total));
  const [digitalPart, setDigitalPart] = useState('0');
  const [error, setError] = useState('');
  const cashReceived = Number(received || 0);
  const change = Math.max(0, cashReceived - total);
  const mixedTotal = useMemo(() => Number(cashPart || 0) + Number(digitalPart || 0), [cashPart, digitalPart]);
  const platform = source === 'keeta' || source === 'foodpanda';
  const externalUnclassified = source === 'phone';

  const chooseSource = (next: OrderSource) => { setSource(next); onSource(next); if (next === 'keeta') setMethod('keeta'); else if (next === 'foodpanda') setMethod('foodpanda'); else if (next === 'phone') setMethod('unclassified'); else setMethod('cash'); };
  const submit = async () => {
    setError('');
    if (source === 'walk_in' && method === 'cash' && cashReceived < total) return setError('實收金額不足');
    if (source === 'walk_in' && method === 'mixed' && Math.abs(mixedTotal - total) > 0.01) return setError(`組合支付必須合共 HK$${total}`);
    try { await onSubmit(method); onClose(); } catch (next) { setError((next as Error).message); }
  };

  return <div className="ops-checkout" role="dialog" aria-modal="true">
    <header><button onClick={onClose}>← 返回</button><div><strong>核對／付款</strong><small>{items.length} 項 · {runtimeMode.toUpperCase()}</small></div><b>HK${total}</b></header>
    <main>
      <section className="ops-checkout-summary"><h2>訂單內容</h2>{items.map((item, index) => <article key={item.id}><i>{index + 1}</i><div><strong>{products[item.productId]?.code} {products[item.productId]?.name}</strong><p>{item.summary}</p></div><span>×{item.quantity}</span><b>HK${item.estimatedUnitPrice * item.quantity}</b></article>)}</section>
      <section className="ops-checkout-pay"><h2>訂單來源</h2><div className="ops-source-grid">{sources.map((option) => <button key={option.key} className={source === option.key ? 'active' : ''} onClick={() => chooseSource(option.key)}>{option.label}</button>)}</div>
        {source === 'walk_in' ? <><h2>付款方式</h2><div className="ops-payment-grid">{payments.map((option) => <button key={option.key} className={method === option.key ? 'active' : ''} onClick={() => setMethod(option.key)}>{option.label}</button>)}</div>
          {method === 'cash' ? <div className="ops-cash"><div><span>應收</span><strong>HK${total}</strong></div><label>實收<input inputMode="numeric" value={received} onChange={(e) => setReceived(e.target.value)} /></label><div className="cash-shortcuts">{[20,50,100,500].map((value) => <button key={value} onClick={() => setReceived(String(value))}>${value}</button>)}<button onClick={() => setReceived(String(total))}>剛好</button></div><div><span>找續</span><strong>HK${change}</strong></div></div> : null}
          {method === 'mixed' ? <div className="ops-mixed"><label>現金<input type="number" value={cashPart} onChange={(e) => setCashPart(e.target.value)} /></label><label>電子支付<input type="number" value={digitalPart} onChange={(e) => setDigitalPart(e.target.value)} /></label><strong>合計 HK${mixedTotal}</strong></div> : null}</> : <div className="ops-external-note"><strong>{platform ? '平台結算' : '到店交收，付款方式不逐張記錄'}</strong><p>{platform ? '只記錄訂單及打印，不輸入現場收款。' : '日結時按錢箱倒推現金，其餘歸入非現金。'}</p></div>}
        {error ? <p className="form-error">{error}</p> : null}
      </section>
    </main>
    <footer><button className="secondary" onClick={onClose}>返回修改</button><button className="primary" disabled={busy} onClick={() => void submit()}>{busy ? '處理中…' : platform ? '確認平台訂單' : externalUnclassified ? '確認訂單' : '確認收款'}</button></footer>
  </div>;
}
