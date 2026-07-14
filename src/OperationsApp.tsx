import { useEffect, useMemo, useRef, useState } from 'react';
import { requiresConfiguration } from './domain/businessRules';
import { classifyOperationalOrder } from './domain/orderTiming';
import type { CartItem, NetworkOrder, PaymentMethod, Product, TableSession, ViewKey } from './domain/types';
import { useSmtController } from './hooks/useSmtController';
import { LoginScreen } from './components/LoginScreen';
import { ProductConfigurator } from './components/ProductConfigurator';
import { OperationsCheckout } from './components/OperationsCheckout';
import { Modal } from './components/Modal';
import { CASH_DENOMINATIONS, calculateDayClose, calculateDrawerTotal, closeCashSession, isCashSessionOpenToday, loadCashSession, loadSuggestedOpeningFloat, openCashSession, type CashCounts, type CashSession } from './runtime/cashSession';

const NAV: Array<{ key: ViewKey; label: string; glyph: string }> = [
  { key: 'order', label: '首頁', glyph: '⌂' },
  { key: 'workbench', label: '訂單', glyph: '▤' },
  { key: 'dinein', label: '堂食', glyph: '桌' },
  { key: 'hold', label: '掛單／取單', glyph: '掛' },
  { key: 'pending', label: '待補', glyph: '補' },
  { key: 'more', label: '更多', glyph: '•••' },
];

type ProductMode = 'text' | 'compact' | 'image';

export default function OperationsApp() {
  const controller = useSmtController();
  const { config, configErrors, device, user, profile, health, products, categories, cart, total, cartQty, pendingIssues, source, orderMode, tableId, orderNote, holds, tables, networkOrders, toast, busyKey, view } = controller;
  const { actions } = controller;
  const [category, setCategory] = useState('全部');
  const [mode, setMode] = useState<ProductMode>(() => (localStorage.getItem('morefun.smt.product-mode') as ProductMode) || 'compact');
  const [configuring, setConfiguring] = useState<{ product: Product; item?: CartItem }>();
  const [checkout, setCheckout] = useState(false);
  const [selectedTable, setSelectedTable] = useState<TableSession>();
  const [cashSession, setCashSession] = useState<CashSession | null>(() => loadCashSession());
  const [dayClose, setDayClose] = useState(false);
  const autoAdvanced = useRef(new Set<string>());

  useEffect(() => { localStorage.setItem('morefun.smt.product-mode', mode); }, [mode]);
  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(actions.clearToast, toast.kind === 'error' ? 6500 : 2800);
    return () => window.clearTimeout(timer);
  }, [toast, actions]);

  useEffect(() => {
    const run = () => networkOrders.forEach((order) => {
      const classification = classifyOperationalOrder(order);
      if (!classification.suggestedStatus) return;
      const key = `${order.id}:${order.status}:${classification.suggestedStatus}`;
      if (autoAdvanced.current.has(key)) return;
      autoAdvanced.current.add(key);
      void actions.advanceOrder(order).catch(() => autoAdvanced.current.delete(key));
    });
    run();
    const timer = window.setInterval(run, 30_000);
    return () => window.clearInterval(timer);
  }, [networkOrders, actions]);

  const visibleProducts = useMemo(() => Object.values(products).filter((product) => category === '全部' || product.category === category), [products, category]);
  const board = useMemo(() => {
    const result = { new: [] as NetworkOrder[], active: [] as NetworkOrder[], exception: [] as NetworkOrder[] };
    networkOrders.forEach((order) => {
      const bucket = classifyOperationalOrder(order).bucket;
      if (bucket === 'new') result.new.push(order);
      else if (bucket === 'active') result.active.push(order);
      else if (bucket === 'exception') result.exception.push(order);
    });
    result.new.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
    result.active.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
    return result;
  }, [networkOrders]);

  if (config.mode !== 'demo' && (!user || health.auth === 'signed_out')) return <LoginScreen mode={config.mode} configErrors={configErrors} busy={busyKey === 'login'} onLogin={actions.login} onSetMode={actions.setRuntimeMode} />;
  if (config.mode !== 'demo' && health.auth === 'forbidden') return <main className="login-page"><section className="login-card"><strong>此帳戶未獲 SMT 權限</strong><button className="button primary" onClick={() => void actions.logout()}>登出</button></section></main>;
  if (!isCashSessionOpenToday(cashSession)) return <OpeningFloat onOpen={(amount) => setCashSession(openCashSession(amount))} />;

  const addProduct = (product: Product) => { if (requiresConfiguration(product) || !actions.quickAdd(product)) setConfiguring({ product }); };
  const holdAction = () => cart.length ? actions.holdCurrent() : actions.setView('hold');
  const navBadge = (key: ViewKey) => key === 'workbench' ? controller.newNetworkCount + controller.abnormalCount : key === 'dinein' ? controller.occupiedTables : key === 'hold' ? holds.length : key === 'pending' ? pendingIssues.length : 0;

  return <div className="ops-app">
    <header className="ops-topbar"><div className="ops-brand"><strong>磨飯</strong><span>SMT POS</span><b>#{String(networkOrders.length + 1).padStart(4, '0')}</b></div><div className="ops-health"><i className={health.realtime === 'online' ? 'ok' : 'bad'} />{health.realtime === 'online' ? '連線正常' : health.lastMessage}</div><button className="ops-new-orders" onClick={() => actions.setView('workbench')}>新單 <em>{controller.newNetworkCount}</em></button><div className="ops-clock">{new Date().toLocaleTimeString('zh-HK', { hour: '2-digit', minute: '2-digit' })}</div></header>

    <main className="ops-main">
      {view === 'order' ? <div className="ops-order-layout">
        <aside className="ops-cart"><header><div><strong>目前訂單</strong><span>{cartQty} 件</span></div><button className={cart.length || holds.length ? 'enabled' : ''} onClick={holdAction}>{cart.length ? '掛單' : `取單${holds.length ? ` ${holds.length}` : ''}`}</button></header>
          <div className="ops-cart-list">{cart.length ? cart.map((item, index) => { const product = products[item.productId]; const combinable = product?.ruleKind === 'rice_ball'; return <article key={item.id} className={item.pendingIssues.length ? 'issue' : ''}><i>{index + 1}</i><div className="line"><strong>{product?.code} {product?.name}</strong><b>HK${item.estimatedUnitPrice * item.quantity}</b></div><p>{item.summary || '單點'}{item.pendingIssues.length ? ` · 待補 ${item.pendingIssues.length}` : ''}</p><div className="actions"><button onClick={() => actions.updateQuantity(item.id, item.quantity - 1)}>−</button><span>{item.quantity}</span><button onClick={() => actions.updateQuantity(item.id, item.quantity + 1)}>＋</button>{combinable ? <button className="combine" onClick={() => product && setConfiguring({ product, item })}>可組合</button> : null}<button onClick={() => product && setConfiguring({ product, item })}>修改</button><button className="delete" onClick={() => actions.removeItem(item.id)}>刪</button></div></article>; }) : <Empty title="未有餐點" text="由右邊直接選擇商品" />}</div>
          <label className="ops-note"><span>備註</span><input value={orderNote} onChange={(event) => actions.setOrderNote(event.target.value)} placeholder="撳入輸入整單備註" /></label>
          <div className="ops-cart-footer"><div><span>{cart.length} 項｜{cartQty} 件</span><strong>HK${total}</strong></div><button disabled={!cart.length} onClick={() => pendingIssues.length ? actions.setView('pending') : setCheckout(true)}>{pendingIssues.length ? `處理待補 ${pendingIssues.length}` : '核對／付款'}</button></div>
        </aside>
        <section className={`ops-catalog mode-${mode}`}><div className="ops-category-grid"><button className={category === '全部' ? 'active' : ''} onClick={() => setCategory('全部')}>全部</button>{categories.map((item) => <button key={item} className={category === item ? 'active' : ''} onClick={() => setCategory(item)}>{item}</button>)}</div><div className="ops-product-grid">{visibleProducts.map((product) => <button key={product.id} className={product.availability !== 'available' ? 'sold' : ''} disabled={product.availability !== 'available'} onClick={() => addProduct(product)}>{mode !== 'text' ? <div className="image">{product.imageUrl ? <img src={product.imageUrl} alt="" /> : <span>{product.code}</span>}</div> : null}<div><strong>{product.code} {product.name}</strong><b>HK${product.price}</b></div></button>)}</div></section>
      </div> : null}

      {view === 'workbench' ? <OrderBoard board={board} busyKey={busyKey} onAccept={(order) => void actions.acceptOrder(order)} onReprint={(order) => void actions.requestReprint(order.id, '訂單頁快速重印')} /> : null}
      {view === 'dinein' ? <section className="ops-page"><header><h1>堂食</h1><span>使用中 {controller.occupiedTables} 枱</span></header>{selectedTable ? <div className="ops-table-detail"><button onClick={() => setSelectedTable(undefined)}>← 返回枱號</button><h2>{selectedTable.tableName}</h2>{selectedTable.lineItems.map((line) => <article key={line.id}><span>{line.label}</span><b>HK${line.amount}</b></article>)}<button className="button primary" onClick={() => actions.openTable(selectedTable)}>追加點單</button></div> : <div className="ops-table-grid">{tables.map((table) => <button key={table.id} className={table.status} onClick={() => table.status === 'vacant' ? actions.openTable(table) : setSelectedTable(table)}><strong>{table.tableName}</strong><span>{table.status === 'vacant' ? '空枱' : '使用中'}</span><b>HK${table.lineItems.filter((line) => !line.paid).reduce((sum, line) => sum + line.amount, 0)}</b></button>)}</div>}</section> : null}
      {view === 'hold' ? <section className="ops-page"><header><h1>掛單／取單</h1><span>{holds.length} 張</span></header><div className="ops-hold-grid">{holds.map((hold) => <article key={hold.id}><strong>{hold.title}</strong><span>{hold.draft.items.length} 項</span><b>HK${hold.draft.items.reduce((sum, item) => sum + item.estimatedUnitPrice * item.quantity, 0)}</b><button onClick={() => actions.restoreHold(hold)}>取回訂單</button><button className="danger" onClick={() => actions.deleteHold(hold.id)}>刪除</button></article>)}{!holds.length ? <Empty title="沒有掛單" text="購物車有商品時，底部掛單會直接暫存" /> : null}</div></section> : null}
      {view === 'pending' ? <section className="ops-page"><header><h1>待補</h1><span>{pendingIssues.length} 項</span></header><div className="ops-pending-grid">{cart.filter((item) => item.pendingIssues.length).map((item, index) => { const product = products[item.productId]; return <article key={item.id}><i>{index + 1}</i><strong>{product?.code} {product?.name}</strong>{item.pendingIssues.map((issue) => <p key={issue.kind}>{issue.message}</p>)}<button onClick={() => product && setConfiguring({ product, item })}>快捷處理</button></article>; })}{!pendingIssues.length ? <Empty title="全部完成" text="目前沒有待補項目" /> : null}</div></section> : null}
      {view === 'more' ? <section className="ops-page"><header><h1>更多</h1><span>{device.deviceNumber}</span></header><div className="ops-settings"><button onClick={() => setMode('text')} className={mode === 'text' ? 'active' : ''}>大字模式</button><button onClick={() => setMode('compact')} className={mode === 'compact' ? 'active' : ''}>小圖模式</button><button onClick={() => setMode('image')} className={mode === 'image' ? 'active' : ''}>大圖模式</button><button onClick={() => actions.setView('soldout')}>售罄管理</button><button onClick={() => actions.setView('reprint')}>重印管理</button><button onClick={() => setDayClose(true)}>日結／點算錢箱</button>{config.mode !== 'demo' ? <button onClick={() => void actions.logout()}>登出</button> : null}</div></section> : null}
      {view === 'soldout' ? <section className="ops-page"><header><h1>售罄管理</h1></header><div className="ops-soldout">{Object.values(products).map((product) => <button key={product.id} className={product.availability !== 'available' ? 'active' : ''} onClick={() => actions.toggleSoldOut(product.id)}>{product.code} {product.name}<b>{product.availability === 'available' ? '可售' : '售罄'}</b></button>)}</div></section> : null}
      {view === 'reprint' ? <section className="ops-page"><header><h1>重印</h1></header><div className="ops-hold-grid">{networkOrders.map((order) => <article key={order.id}><strong>{order.orderNo}</strong><span>{sourceLabel(order.source)}</span><b>HK${order.total}</b><button onClick={() => void actions.requestReprint(order.id, '重印管理')}>重印</button></article>)}</div></section> : null}
    </main>

    <nav className="ops-nav">{NAV.map((item) => { const badge = navBadge(item.key); return <button key={item.key} className={view === item.key ? 'active' : ''} onClick={() => actions.setView(item.key)}><span>{item.glyph}</span><strong>{item.label}</strong>{badge ? <em>{badge}</em> : null}</button>; })}</nav>

    {configuring ? <ProductConfigurator product={configuring.product} catalog={products} item={configuring.item} onClose={() => setConfiguring(undefined)} onSave={(selections, note, existingId) => { actions.addConfigured(configuring.product, selections, note, existingId); setConfiguring(undefined); }} /> : null}
    {checkout ? <OperationsCheckout items={cart} products={products} total={total} runtimeMode={config.mode} busy={busyKey === 'submit-order'} initialSource={source} onSource={actions.setSource} onClose={() => setCheckout(false)} onSubmit={(method: PaymentMethod) => actions.submitOrder(method).then(() => undefined)} /> : null}
    {dayClose ? <DayClose session={cashSession} orders={networkOrders} onClose={() => setDayClose(false)} onComplete={(closed) => { setCashSession(closed); setDayClose(false); }} /> : null}
    {toast ? <button className={`toast toast-${toast.kind}`} onClick={actions.clearToast}>{toast.message}</button> : null}
  </div>;
}

function OpeningFloat({ onOpen }: { onOpen: (amount: number) => void }) { const [amount, setAmount] = useState(String(loadSuggestedOpeningFloat())); return <main className="ops-opening"><section><div className="ops-logo">磨飯 <small>SMT POS</small></div><h1>今日開箱備用金</h1><p>昨日保留金額已自動帶入；如實際不同可直接修改。</p><label>HK$ <input autoFocus inputMode="numeric" value={amount} onChange={(event) => setAmount(event.target.value)} /></label><button onClick={() => onOpen(Math.max(0, Number(amount || 0)))}>確認開市</button></section></main>; }

function OrderBoard({ board, busyKey, onAccept, onReprint }: { board: { new: NetworkOrder[]; active: NetworkOrder[]; exception: NetworkOrder[] }; busyKey: string; onAccept: (order: NetworkOrder) => void; onReprint: (order: NetworkOrder) => void }) { return <section className="ops-page ops-board-page"><header><h1>訂單</h1><span>正常訂單按時間自動推進及歸檔</span></header><div className="ops-board"><OrderColumn title="新單" tone="new" orders={board.new} render={(order) => <OrderTile order={order} action={<button disabled={busyKey.includes(order.id)} onClick={() => onAccept(order)}>確認接單</button>} />} /><OrderColumn title="處理中" tone="active" orders={board.active} render={(order) => <OrderTile order={order} action={<button onClick={() => onReprint(order)}>重印</button>} />} /><OrderColumn title="需處理" tone="exception" orders={board.exception} render={(order) => <OrderTile order={order} action={<button onClick={() => onReprint(order)}>重印／處理</button>} />} /></div></section>; }
function OrderColumn({ title, tone, orders, render }: { title: string; tone: string; orders: NetworkOrder[]; render: (order: NetworkOrder) => React.ReactNode }) { return <section className={`ops-order-column ${tone}`}><header><strong>{title}</strong><em>{orders.length}</em></header><div>{orders.map(render)}{!orders.length ? <Empty title="沒有訂單" text="" /> : null}</div></section>; }
function OrderTile({ order, action }: { order: NetworkOrder; action: React.ReactNode }) { const timing = classifyOperationalOrder(order); return <article className="ops-order-tile"><header><strong>{order.orderNo}</strong><span>{new Date(order.createdAt).toLocaleTimeString('zh-HK', { hour: '2-digit', minute: '2-digit' })}</span></header><p>{sourceLabel(order.source)} · {timing.label} · {timing.ageMinutes} 分鐘</p><div><span>{order.itemCount} 件</span><b>HK${order.total}</b></div>{action}</article>; }
function Empty({ title, text }: { title: string; text: string }) { return <div className="ops-empty"><strong>{title}</strong>{text ? <p>{text}</p> : null}</div>; }
function sourceLabel(source: string) { return ({ walk_in: '外賣', phone: 'WhatsApp／電話', whatsapp: 'WhatsApp／電話', customer_web: '網站', customer_app: 'App', keeta: 'Keeta', foodpanda: 'Foodpanda', smt: '外賣' } as Record<string, string>)[source] || source; }

function DayClose({ session, orders, onClose, onComplete }: { session: CashSession; orders: NetworkOrder[]; onClose: () => void; onComplete: (session: CashSession) => void }) {
  const [counts, setCounts] = useState<CashCounts>({}); const [expenses, setExpenses] = useState('0'); const [refunds, setRefunds] = useState('0'); const [topups, setTopups] = useState('0'); const [nextFloat, setNextFloat] = useState(String(session.openingFloat));
  const drawer = calculateDrawerTotal(counts); const validOrders = orders.filter((order) => !['cancelled'].includes(order.status)); const totalSales = validOrders.reduce((sum, order) => sum + order.total, 0); const platform = validOrders.filter((order) => ['keeta', 'foodpanda'].includes(order.source)).reduce((sum, order) => sum + order.total, 0); const result = calculateDayClose({ totalSales, platformSales: platform, openingFloat: session.openingFloat, drawerTotal: drawer, cashExpenses: Number(expenses || 0), cashRefunds: Number(refunds || 0), drawerTopUps: Number(topups || 0) });
  return <Modal title="日結／錢箱點算" subtitle="按面額輸入張數，系統倒推現金與未分類非現金" size="wide" onClose={onClose} footer={<><button className="button secondary" onClick={onClose}>取消</button><button className="button primary" onClick={() => onComplete(closeCashSession(session, counts, Number(nextFloat || 0)))}>完成日結</button></>}><div className="ops-day-close"><section><h3>面額點算</h3>{CASH_DENOMINATIONS.map((denomination) => <label key={denomination}><span>${denomination}</span><input inputMode="numeric" value={counts[denomination] || ''} onChange={(event) => setCounts((current) => ({ ...current, [denomination]: Number(event.target.value || 0) }))} /><b>HK${denomination * Number(counts[denomination] || 0)}</b></label>)}</section><section><h3>日結摘要</h3><p>今日訂單總額 <b>HK${totalSales}</b></p><p>平台收入 <b>HK${platform}</b></p><p>開箱備用金 <b>HK${session.openingFloat}</b></p><p>收市錢箱 <b>HK${drawer}</b></p><label>現金支出<input type="number" value={expenses} onChange={(e) => setExpenses(e.target.value)} /></label><label>現金退款<input type="number" value={refunds} onChange={(e) => setRefunds(e.target.value)} /></label><label>中途加錢<input type="number" value={topups} onChange={(e) => setTopups(e.target.value)} /></label><div className="result"><span>推算現金</span><strong>HK${result.estimatedCashSales}</strong><span>未分類非現金</span><strong>HK${result.estimatedUnclassifiedNonCash}</strong></div><label>明日備用金<input type="number" value={nextFloat} onChange={(e) => setNextFloat(e.target.value)} /></label></section></div></Modal>;
}
