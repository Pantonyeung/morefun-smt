import { useMemo, useState } from 'react';
import type { CartItem, OrderMode, OrderSource, PaymentMethod, Product, RuntimeMode, TableSession } from '../domain/types';
import { Modal } from './Modal';

const paymentMethods: Array<{ key: PaymentMethod; label: string }> = [
  { key: 'cash', label: '現金' },
  { key: 'fps', label: 'FPS' },
  { key: 'payme', label: 'PayMe' },
  { key: 'alipay', label: 'Alipay' },
  { key: 'wechat_pay', label: 'WeChat Pay' },
  { key: 'foodpanda', label: 'Foodpanda' },
  { key: 'keeta', label: 'Keeta' },
  { key: 'mixed', label: '混合付款' },
];

export function CheckoutModal({ items, products, total, pendingCount, source, mode, tableId, tables, runtimeMode, busy, onSubmit, onClose }: {
  items: CartItem[];
  products: Record<string, Product>;
  total: number;
  pendingCount: number;
  source: OrderSource;
  mode: OrderMode;
  tableId?: string;
  tables: TableSession[];
  runtimeMode: RuntimeMode;
  busy: boolean;
  onSubmit: (method: PaymentMethod, customerName: string, customerPhone: string, requestedTime: string) => Promise<void>;
  onClose: () => void;
}) {
  const defaultMethod: PaymentMethod = source === 'foodpanda' ? 'foodpanda' : source === 'keeta' ? 'keeta' : 'cash';
  const [method, setMethod] = useState<PaymentMethod>(defaultMethod);
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [requestedTime, setRequestedTime] = useState('asap');
  const [cashPart, setCashPart] = useState(String(total));
  const [digitalPart, setDigitalPart] = useState('0');
  const [error, setError] = useState('');
  const selectedTable = tables.find((table) => table.id === tableId);
  const mixedTotal = useMemo(() => Number(cashPart || 0) + Number(digitalPart || 0), [cashPart, digitalPart]);
  const mixedValid = method !== 'mixed' || Math.abs(mixedTotal - total) < 0.01;

  const submit = async () => {
    setError('');
    if (pendingCount) { setError(`尚有 ${pendingCount} 項待補`); return; }
    if (!mixedValid) { setError(`混合付款合計必須為 HK$${total}`); return; }
    try { await onSubmit(method, customerName, customerPhone, requestedTime); onClose(); }
    catch (nextError) { setError((nextError as Error).message); }
  };

  return <Modal title="核對訂單及收款" subtitle={`${mode === 'dinein' ? selectedTable?.tableName || '堂食' : '外賣'} · ${items.length} 個商品項目`} onClose={onClose} size="wide" footer={<>
    <button className="button secondary" onClick={onClose}>返回修改</button>
    <button className="button primary" disabled={busy || pendingCount > 0 || !mixedValid} onClick={submit}>{busy ? '送單中…' : runtimeMode === 'demo' ? `建立本機試單 · HK$${total}` : `正式送單 · HK$${total}`}</button>
  </>}>
    <div className="checkout-layout">
      <section className="checkout-items">
        <h3>訂單內容</h3>
        {items.map((item) => <article key={item.id}><div><strong>{products[item.productId]?.code} {products[item.productId]?.name}</strong><p>{item.summary}</p>{item.note ? <small>備註：{item.note}</small> : null}</div><span>×{item.quantity}</span><b>HK${item.estimatedUnitPrice * item.quantity}</b></article>)}
        <div className="checkout-total"><span>前端估算</span><strong>HK${total}</strong></div>
        <p className="inline-note">正式金額由 Cloudflare Worker 依 Firebase Catalog 重新計算；如有差異，後端結果為準。</p>
      </section>
      <section className="checkout-form">
        <h3>付款方式</h3>
        <div className="payment-grid">{paymentMethods.map((option) => <button key={option.key} className={method === option.key ? 'active' : ''} onClick={() => setMethod(option.key)}>{option.label}</button>)}</div>
        {method === 'mixed' ? <div className="mixed-payment"><label className="field"><span>現金部分</span><input type="number" min="0" step="0.1" value={cashPart} onChange={(event) => setCashPart(event.target.value)} /></label><label className="field"><span>電子付款部分</span><input type="number" min="0" step="0.1" value={digitalPart} onChange={(event) => setDigitalPart(event.target.value)} /></label><p className={mixedValid ? 'valid' : 'invalid'}>合計 HK${mixedTotal.toFixed(1)} / HK${total}</p><small>目前 Worker 只記錄 payment_method_id=mixed；分項 PaymentBatch 將由後端擴充後正式入帳。</small></div> : null}
        <h3>客人資料（選填）</h3>
        <label className="field"><span>客人名稱</span><input value={customerName} onChange={(event) => setCustomerName(event.target.value)} maxLength={80} /></label>
        <label className="field"><span>電話</span><input value={customerPhone} onChange={(event) => setCustomerPhone(event.target.value)} maxLength={40} inputMode="tel" /></label>
        <label className="field"><span>取餐時間</span><input value={requestedTime} onChange={(event) => setRequestedTime(event.target.value)} placeholder="asap 或 18:30" maxLength={80} /></label>
        {mode === 'dinein' ? <div className="warning-box">堂食會在 SMT 保留枱號及拆單狀態；現有 Worker V1 仍以 pickup contract 建立正式 order，枱號會寫入訂單備註，完整 TableSession／PaymentBatch 後端需後續 contract 升級。</div> : null}
        {runtimeMode !== 'live' ? <div className="trial-box">目前為 {runtimeMode === 'demo' ? '本機 Demo' : 'Staging 試運行'}，請勿當作正式日結資料。</div> : null}
        {error ? <p className="form-error" role="alert">{error}</p> : null}
      </section>
    </div>
  </Modal>;
}
