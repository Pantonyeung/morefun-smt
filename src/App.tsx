import { useMemo, useState } from 'react';
import { useSmtState } from './state/useSmtState';
import type { CartItem, PaymentMethod, PendingKind, PrintJob, Product, TableSession, ViewKey } from './state/smtState';

type ShortcutKey = ViewKey | 'note' | 'lookup';
type Shortcut = { key: ShortcutKey; label: string; glyph: string; fixed?: boolean };
type EditMode = 'quick' | 'detail' | null;
type PaymentTarget = { kind: 'order'; amount: number } | { kind: 'table'; tableId: string; amount: number } | null;

const shortcuts: Shortcut[] = [
  { key: 'order', label: '點單', glyph: '點', fixed: true },
  { key: 'hold', label: '掛單', glyph: '掛', fixed: true },
  { key: 'pending', label: '待補', glyph: '補', fixed: true },
  { key: 'dinein', label: '堂食', glyph: '堂', fixed: true },
  { key: 'workbench', label: '工作台', glyph: '工', fixed: true },
  { key: 'note', label: '備註', glyph: '註' },
  { key: 'soldout', label: '售罄', glyph: '售' },
  { key: 'reprint', label: '重印', glyph: '印' },
  { key: 'lookup', label: '查單', glyph: '查' },
  { key: 'more', label: '更多', glyph: '多' },
];

const pendingLabels: Record<PendingKind, string> = {
  drink: '飲品', rice_base: '飯底', sauce: '醬汁', sold_out_replacement: '售罄替代', price_version: '價格版本', product_invalid: '商品失效',
};
const paymentMethods: Array<{ key: PaymentMethod; label: string }> = [
  { key: 'cash', label: '現金' }, { key: 'fps', label: 'FPS' }, { key: 'payme', label: 'PayMe' },
  { key: 'alipay', label: 'Alipay' }, { key: 'wechat_pay', label: 'WeChat Pay' }, { key: 'mixed', label: '混合付款' },
];
const printDestinations: Array<{ key: PrintJob['destination']; label: string }> = [
  { key: 'receipt', label: '收據' }, { key: 'kitchen_a', label: '後廚 A' }, { key: 'kitchen_b', label: '後廚 B' },
  { key: 'label_a', label: '標籤 A' }, { key: 'label_b', label: '標籤 B' },
];
const sourceLabel: Record<string, string> = { walk_in: '現場', whatsapp: 'WhatsApp', phone: '電話', web: '網站', app: 'App', foodpanda: 'Foodpanda', keeta: 'Keeta' };

const makeCartItem = (product: Product): CartItem => ({
  id: `cart-${Date.now()}-${product.id}`, productId: product.id, qty: 1, summary: product.summary, adjustments: [], unitPrice: product.price,
  priceVersion: 'local-v1', pendingIssueIds: [], paidQty: 0,
});

export default function App() {
  const { state, selectors, actions } = useSmtState();
  const [editMode, setEditMode] = useState<EditMode>(null);
  const [editingItemId, setEditingItemId] = useState<string>();
  const [draftNote, setDraftNote] = useState('');
  const [lookupOpen, setLookupOpen] = useState(false);
  const [lookupText, setLookupText] = useState('');
  const [confirmClear, setConfirmClear] = useState(false);
  const [paymentTarget, setPaymentTarget] = useState<PaymentTarget>(null);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [splitParts, setSplitParts] = useState(2);
  const [reprintOrder, setReprintOrder] = useState<string>();
  const [reprintDestinations, setReprintDestinations] = useState<PrintJob['destination'][]>(['receipt']);

  const products = useMemo(() => Object.values(state.products), [state.products]);
  const visibleProducts = useMemo(() => products.filter(product => {
    if (product.availability !== 'available' || product.category !== state.ui.activeCategory) return false;
    return state.ui.quickTag === '全部' || (product.tags?.includes(state.ui.quickTag) ?? false);
  }), [products, state.ui.activeCategory, state.ui.quickTag]);

  const editingItem = editingItemId ? state.cartItems[editingItemId] : undefined;
  const editingProduct = editingItem ? state.products[editingItem.productId] : undefined;
  const pendingIssues = useMemo(() => Object.values(state.pendingIssues).filter(issue => issue.state === 'open'), [state.pendingIssues]);
  const pendingKinds = [...new Set(pendingIssues.map(issue => issue.kind))];
  const holdOrders = Object.values(state.holdOrders);
  const workbenchOrders = Object.values(state.workbenchOrders);
  const activeWorkbench = workbenchOrders.filter(order => order.status === 'open' || order.status === 'ready');
  const newWorkbench = workbenchOrders.filter(order => order.status === 'new');
  const abnormalWorkbench = workbenchOrders.filter(order => order.status === 'abnormal');
  const selectedTable = state.ui.selectedTableId ? state.tableSessions[state.ui.selectedTableId] : undefined;
  const reprintOrders = ['#0128', '#0127', '#0125', '#0122'];

  const badgeFor = (key: ShortcutKey, side: 'left' | 'right') => {
    if (key === 'hold' && side === 'left') return holdOrders.length;
    if (key === 'pending' && side === 'left') return selectors.openPendingCount;
    if (key === 'dinein' && side === 'left') return selectors.occupiedTableCount;
    if (key === 'workbench' && side === 'left') return selectors.newNetworkOrderCount;
    if (key === 'workbench' && side === 'right') return selectors.abnormalOrderCount;
    if (key === 'soldout' && side === 'right') return selectors.soldOutCount;
    return 0;
  };

  const navigate = (key: ShortcutKey) => {
    if (key === 'note') { setDraftNote(state.currentOrder.note); actions.openModal('note'); return; }
    if (key === 'lookup') { setLookupOpen(true); return; }
    actions.navigate(key);
  };

  const openEdit = (item: CartItem, mode: EditMode) => { setEditingItemId(item.id); setDraftNote(item.note ?? ''); setEditMode(mode); };
  const saveEdit = () => { if (!editingItem) return; actions.updateCartItem({ ...editingItem, note: draftNote }); setEditMode(null); };

  const createHold = () => {
    if (!selectors.cartItems.length) return;
    actions.dispatch({ type: 'CREATE_HOLD', hold: {
      id: `hold-${Date.now()}`, title: `SMT 暫存${String(holdOrders.length + 1).padStart(2, '0')}`,
      orderSnapshot: { ...state.currentOrder, status: 'held' }, itemSnapshots: selectors.cartItems.map(item => ({ ...item })),
      createdAt: new Date().toISOString(), operatorId: state.currentOrder.operatorId,
    } });
  };

  const openOrderPayment = () => {
    if (selectors.openPendingCount) { actions.openModal('pendingBatch'); return; }
    setPaymentTarget({ kind: 'order', amount: selectors.cartTotal });
    setPaymentAmount(String(selectors.cartTotal));
  };

  const openTablePayment = (table: TableSession, amount?: number) => {
    const unpaid = Math.max(0, table.totalAmount - table.paidAmount);
    const targetAmount = Math.min(unpaid, amount ?? unpaid);
    if (targetAmount <= 0) { actions.dispatch({ type: 'SHOW_TOAST', kind: 'info', message: `${table.tableName} 已全部付款` }); return; }
    setPaymentTarget({ kind: 'table', tableId: table.id, amount: targetAmount });
    setPaymentAmount(String(targetAmount));
  };

  const finishPayment = (method: PaymentMethod) => {
    if (!paymentTarget) return;
    const amount = Math.max(0, Math.min(Number(paymentAmount) || paymentTarget.amount, paymentTarget.amount));
    if (amount <= 0) return;
    actions.dispatch({ type: 'ADD_PAYMENT', payment: {
      id: `payment-${Date.now()}`, orderId: paymentTarget.kind === 'order' ? state.currentOrder.id : paymentTarget.tableId,
      groupId: `group-${Date.now()}`, method, amount, status: amount >= paymentTarget.amount ? 'paid' : 'partial',
      createdAt: new Date().toISOString(), operatorId: state.currentOrder.operatorId,
    } });
    if (paymentTarget.kind === 'table') {
      const table = state.tableSessions[paymentTarget.tableId];
      actions.dispatch({ type: 'UPDATE_TABLE', table: { ...table, paidAmount: Math.min(table.totalAmount, table.paidAmount + amount) } });
    } else {
      actions.clearCart();
    }
    actions.dispatch({ type: 'SHOW_TOAST', kind: 'success', message: `已收 ${paymentMethods.find(item => item.key === method)?.label} HK$${amount}` });
    setPaymentTarget(null);
  };

  const enterTableOrder = (table: TableSession) => {
    const nextTable = table.status === 'vacant' ? { ...table, status: 'occupied' as const, openedAt: new Date().toISOString() } : table;
    if (table.status === 'vacant') actions.dispatch({ type: 'UPDATE_TABLE', table: nextTable });
    actions.dispatch({ type: 'SET_ORDER_MODE', mode: 'dinein', tableId: table.id });
    actions.navigate('order');
    actions.dispatch({ type: 'SHOW_TOAST', kind: 'info', message: `${table.tableName} 追加點單` });
  };

  const confirmReprint = () => {
    if (!reprintOrder || !reprintDestinations.length) return;
    reprintDestinations.forEach((destination, index) => actions.dispatch({ type: 'UPSERT_PRINT_JOB', job: {
      id: `reprint-${Date.now()}-${index}`, orderId: reprintOrder, destination,
      quantityMode: state.settings.printQuantityByDestination[destination], copies: 1, status: 'queued', attemptCount: 0, createdAt: new Date().toISOString(),
    } }));
    actions.dispatch({ type: 'SHOW_TOAST', kind: 'success', message: `${reprintOrder} 已建立 ${reprintDestinations.length} 個重印工作` });
    setReprintOrder(undefined);
  };

  return <div className="smt-shell">
    <header className="smt-topbar">
      <div className="brand"><strong>磨飯</strong><span>MORE<br />FUN</span><b>SMT</b><em>{state.currentOrder.mode === 'dinein' && state.currentOrder.tableId ? `${state.tableSessions[state.currentOrder.tableId]?.tableName} · ` : ''}單號 {state.currentOrder.orderNo}</em></div>
      <div className="health-icons">{Object.values(state.systemHealth).map(item => <button key={item.key} className={`health ${item.status === 'ok' ? 'ok' : 'alert'}`} onClick={() => actions.dispatch({ type: 'SHOW_TOAST', kind: item.status === 'ok' ? 'info' : 'error', message: `${item.label}：${item.message}` })}><span>{item.label.slice(0, 1)}</span>{item.issueCount > 0 ? <i>{item.issueCount}</i> : null}</button>)}</div>
      <div className="top-actions"><button className="new-order" onClick={() => actions.navigate('workbench')}>新單 <i>{selectors.newNetworkOrderCount}</i></button><button onClick={() => actions.navigate('more')}>更多</button></div>
    </header>

    <main className="app-stage">
      {state.ui.view === 'order' ? <div className="order-layout">
        <section className="cart-pane">
          <div className="cart-head"><div><span>購</span><strong>購物車</strong></div><button onClick={() => setConfirmClear(true)} title="清空購物車">清空</button></div>
          <div className="cart-scroll">{selectors.cartItems.map(item => { const product = state.products[item.productId]; return <article className="cart-line" key={item.id}><div className="cart-line-head"><strong>{product.code} {product.name}</strong><b>HK${item.unitPrice * item.qty}</b><button onClick={() => openEdit(item, 'quick')}>⋮</button></div>{item.summary ? <p>{item.summary}</p> : null}{item.note ? <p>備註：{item.note}</p> : null}<div className="cart-line-actions">{product.mergeMode === 'MERGE_IDENTICAL' ? <div className="qty"><button onClick={() => actions.updateCartItem({ ...item, qty: Math.max(1, item.qty - 1) })}>−</button><span>{item.qty}</span><button onClick={() => actions.updateCartItem({ ...item, qty: item.qty + 1 })}>＋</button></div> : <span />}<button className="text-action" onClick={() => openEdit(item, 'detail')}>完整詳情</button></div></article>; })}</div>
          <div className="checkout-strip"><span>共 {selectors.cartQty} 件</span><strong>HK${selectors.cartTotal}</strong><button onClick={openOrderPayment}>{selectors.openPendingCount ? `先處理待補 ${selectors.openPendingCount}` : '收款'}</button></div>
        </section>
        <section className="product-pane"><div className="category-grid">{[...new Set(products.map(product => product.category))].map(category => <button key={category} className={category === state.ui.activeCategory ? 'active' : ''} onClick={() => actions.dispatch({ type: 'SET_CATEGORY', category })}>{category}</button>)}</div><div className="quick-tags">{['全部', '雞', '豬', '魚', '牛', '素', '飲品'].map(tag => <button key={tag} className={tag === state.ui.quickTag ? 'active' : ''} onClick={() => actions.dispatch({ type: 'SET_QUICK_TAG', tag })}>{tag}</button>)}</div><div className="product-grid">{visibleProducts.map(product => <article className="product-card" key={product.id}><button className="product-hit" onClick={() => actions.addCartItem(makeCartItem(product))}><div className="food-art">{product.code}</div><strong>{product.name}</strong><b>HK${product.price}</b></button><button className="product-more" onClick={() => actions.addCartItem(makeCartItem(product))}>＋</button></article>)}{visibleProducts.length === 0 ? <div className="empty-state">此分類暫無可售商品</div> : null}</div></section>
      </div> : null}

      {state.ui.view === 'hold' ? <Panel title="掛單／取單" subtitle="掛起目前購物車，或恢復暫存訂單"><button className="primary" disabled={!selectors.cartItems.length} onClick={createHold}>掛起目前訂單</button><div className="list-grid">{holdOrders.map(hold => <article className="list-card" key={hold.id}><div><strong>{hold.title}</strong><p>{hold.itemSnapshots.length} 項 · {new Date(hold.createdAt).toLocaleTimeString('zh-HK', { hour: '2-digit', minute: '2-digit' })}</p></div><b>HK${hold.itemSnapshots.reduce((sum, item) => sum + item.unitPrice * item.qty, 0)}</b><button onClick={() => actions.dispatch({ type: 'RESTORE_HOLD', holdId: hold.id })}>恢復</button></article>)}</div></Panel> : null}
      {state.ui.view === 'pending' ? <Panel title="待補／重組" subtitle="相同缺項可一鍵處理，再個別微調"><div className="batch-actions">{pendingKinds.map(kind => <button key={kind} onClick={() => actions.resolvePendingBatch(kind)}>{`一鍵補充全部${pendingLabels[kind]}`}</button>)}</div><div className="list-grid">{pendingIssues.map(issue => <article className="list-card warn" key={issue.id}><div><strong>{issue.message}</strong><p>{pendingLabels[issue.kind]} · 價格變化 HK${issue.priceDelta}</p></div><button onClick={() => actions.dispatch({ type: 'RESOLVE_PENDING', issueId: issue.id })}>完成處理</button></article>)}</div></Panel> : null}

      {state.ui.view === 'dinein' ? <Panel title="堂食" subtitle={`使用中 ${selectors.occupiedTableCount} 枱`}>{selectedTable ? <div className="table-detail"><button className="back-link" onClick={() => actions.dispatch({ type: 'SELECT_TABLE', tableId: undefined })}>‹ 返回枱號</button><h2>{selectedTable.tableName}</h2><div className="payment-summary"><span>總額 HK${selectedTable.totalAmount}</span><span className="paid">已付 HK${selectedTable.paidAmount}</span><span className="unpaid">未付 HK${Math.max(0, selectedTable.totalAmount - selectedTable.paidAmount)}</span></div><div className="split-control"><strong>平均分單</strong><div>{[2,3,4,5,6,7,8,9,10].map(parts => <button key={parts} className={splitParts === parts ? 'active' : ''} onClick={() => setSplitParts(parts)}>{parts}份</button>)}</div><p>每份約 HK${Math.ceil(Math.max(0, selectedTable.totalAmount - selectedTable.paidAmount) / splitParts)}</p></div><div className="table-actions"><button onClick={() => enterTableOrder(selectedTable)}>追加單</button><button onClick={() => openTablePayment(selectedTable, Math.ceil(Math.max(0, selectedTable.totalAmount - selectedTable.paidAmount) / splitParts))}>支付一份</button><button onClick={() => openTablePayment(selectedTable)}>全數付款</button><button onClick={() => openTablePayment(selectedTable)}>混合付款</button></div></div> : <div className="table-grid">{Object.values(state.tableSessions).map(table => <button className={`table-card ${table.status === 'occupied' ? 'active' : ''}`} key={table.id} onClick={() => table.status === 'vacant' ? enterTableOrder(table) : actions.dispatch({ type: 'SELECT_TABLE', tableId: table.id })}><strong>{table.tableName}</strong><span>{table.status === 'occupied' ? `使用中 · HK$${table.totalAmount}` : '空枱 · 點擊開單'}</span>{table.status === 'occupied' ? <small>未付 HK${Math.max(0, table.totalAmount - table.paidAmount)}</small> : null}</button>)}</div>}</Panel> : null}

      {state.ui.view === 'workbench' ? <Panel title="工作台" subtitle={`現正處理 ${activeWorkbench.length} 張訂單`}><div className="workbench-summary"><button className="network-box"><span>網絡單</span><strong>{newWorkbench.length}</strong><small>待接收</small></button><button className="abnormal-box"><span>異常單</span><strong>{abnormalWorkbench.length}</strong><small>需人工處理</small></button></div><div className="list-grid">{[...activeWorkbench, ...newWorkbench, ...abnormalWorkbench].map(order => <article className={`list-card ${order.status === 'abnormal' ? 'warn' : ''}`} key={order.id}><div><strong>{order.orderNo}</strong><p>{sourceLabel[order.source]} · {order.status}</p></div><b>HK${order.amount}</b><button onClick={() => actions.dispatch({ type: 'UPSERT_WORKBENCH_ORDER', order: { ...order, status: order.status === 'new' ? 'open' : order.status } })}>{order.status === 'new' ? '接單' : '查看'}</button></article>)}</div></Panel> : null}

      {state.ui.view === 'soldout' ? <Panel title="售罄管理" subtitle={`目前售罄 ${selectors.soldOutCount} 款`}><div className="list-grid">{products.map(product => <article className={`list-card ${product.availability === 'sold_out' ? 'warn' : ''}`} key={product.id}><div><strong>{product.code} {product.name}</strong><p>{product.category}</p></div><button onClick={() => actions.dispatch({ type: 'SET_AVAILABILITY', productId: product.id, state: product.availability === 'sold_out' ? 'available' : 'sold_out', updatedBy: 'morefun', updatedAt: new Date().toISOString() })}>{product.availability === 'sold_out' ? '恢復' : '設為售罄'}</button></article>)}</div></Panel> : null}

      {state.ui.view === 'reprint' ? <Panel title="重印" subtitle="選擇訂單及打印目的地"><div className="reprint-layout"><div className="list-grid">{reprintOrders.map(orderNo => <button key={orderNo} className={`reprint-order ${reprintOrder === orderNo ? 'active' : ''}`} onClick={() => setReprintOrder(orderNo)}><strong>{orderNo}</strong><span>查看可重印文件</span></button>)}</div><div className="reprint-options"><h3>{reprintOrder ?? '先選擇訂單'}</h3>{printDestinations.map(destination => <label key={destination.key}><input type="checkbox" checked={reprintDestinations.includes(destination.key)} onChange={() => setReprintDestinations(current => current.includes(destination.key) ? current.filter(item => item !== destination.key) : [...current, destination.key])} />{destination.label}</label>)}<button className="primary" disabled={!reprintOrder || !reprintDestinations.length} onClick={confirmReprint}>確認重印</button></div></div></Panel> : null}

      {state.ui.view === 'more' ? <Panel title="更多／設定" subtitle="所有設定即時套用到本機 UI"><div className="settings-grid interactive-settings"><button onClick={() => actions.dispatch({ type: 'UPDATE_SETTINGS', settings: { categoryColumns: state.settings.categoryColumns === 6 ? 4 : state.settings.categoryColumns + 1 as 4 | 5 | 6 } })}><span>分類每行</span><strong>{state.settings.categoryColumns}</strong></button><button onClick={() => actions.dispatch({ type: 'UPDATE_SETTINGS', settings: { productColumns: state.settings.productColumns === 5 ? 3 : state.settings.productColumns + 1 as 3 | 4 | 5 } })}><span>商品每行</span><strong>{state.settings.productColumns}</strong></button><button onClick={() => actions.dispatch({ type: 'UPDATE_SETTINGS', settings: { defaultMergeMode: state.settings.defaultMergeMode === 'MERGE_IDENTICAL' ? 'SEPARATE_EACH' : 'MERGE_IDENTICAL' } })}><span>購物車合併</span><strong>{state.settings.defaultMergeMode === 'MERGE_IDENTICAL' ? '相同合併' : '逐項分開'}</strong></button><button onClick={() => actions.dispatch({ type: 'SHOW_TOAST', kind: 'info', message: '自動完成時間目前鎖定 30 分鐘' })}><span>自動完成</span><strong>30 分鐘</strong></button><button onClick={() => actions.navigate('soldout')}><span>售罄管理</span><strong>{selectors.soldOutCount}</strong></button><button onClick={() => actions.navigate('reprint')}><span>打印管理</span><strong>{Object.values(state.printJobs).length}</strong></button></div></Panel> : null}
    </main>

    <nav className="shortcut-bar"><div className="shortcut-grid">{shortcuts.map(shortcut => { const left = badgeFor(shortcut.key, 'left'); const right = badgeFor(shortcut.key, 'right'); const active = shortcut.key === state.ui.view; return <button key={shortcut.key} className={`${shortcut.fixed ? 'fixed ' : ''}${active ? 'active' : ''}`} onClick={() => navigate(shortcut.key)}>{left ? <i className="badge badge-left">{left}</i> : null}{right ? <i className="badge badge-right">{right}</i> : null}<span>{shortcut.glyph}</span><strong>{shortcut.label}</strong></button>; })}</div></nav>

    {editMode && editingItem && editingProduct ? <div className={editMode === 'quick' ? 'quick-overlay' : 'overlay'} onClick={() => setEditMode(null)}><section className={editMode === 'quick' ? 'quick-card' : 'detail-card'} onClick={event => event.stopPropagation()}><header><div><small>{editMode === 'quick' ? '快速修改' : '商品完整詳情'}</small><h3>{editingProduct.code} {editingProduct.name}</h3></div><button onClick={() => setEditMode(null)}>×</button></header><div className={editMode === 'quick' ? 'quick-rows' : 'detail-columns'}>{editMode === 'quick' ? <><button onClick={() => setEditMode('detail')}>完整詳情 <span>›</span></button><label><span>商品備註</span><input value={draftNote} onChange={event => setDraftNote(event.target.value)} placeholder="直接輸入" /></label></> : <><div className="detail-photo">{editingProduct.code}</div><div className="detail-options"><button>主食／飯團 <span>›</span></button><button>小食 <span>›</span></button><button>飲品 <span>›</span></button><textarea value={draftNote} onChange={event => setDraftNote(event.target.value)} placeholder="商品備註" /></div><aside><h3>目前選擇</h3><p>{editingItem.summary ?? '未有額外選項'}</p><strong>HK${editingItem.unitPrice * editingItem.qty}</strong></aside></>}</div><footer><button className="primary" onClick={saveEdit}>完成</button><button onClick={() => { actions.removeCartItem(editingItem.id); setEditMode(null); }}>刪除</button></footer></section></div> : null}
    {state.ui.modal === 'note' ? <Modal title="整單備註" onClose={actions.closeModal}><textarea className="modal-textarea" value={draftNote} onChange={event => setDraftNote(event.target.value)} /><div className="quick-notes">{['全部醬汁另上', '客人趕時間', '分開包裝', '到店致電'].map(note => <button key={note} onClick={() => setDraftNote(current => current ? `${current} · ${note}` : note)}>{note}</button>)}</div><button className="primary" onClick={() => { actions.setOrderNote(draftNote); actions.closeModal(); }}>完成</button></Modal> : null}
    {state.ui.modal === 'pendingBatch' ? <Modal title="尚有待補項目" onClose={actions.closeModal}><p>請先處理 {selectors.openPendingCount} 項待補，完成後才可收款。</p><button className="primary" onClick={() => actions.navigate('pending')}>前往處理</button></Modal> : null}
    {paymentTarget ? <Modal title={paymentTarget.kind === 'order' ? '收款' : `${state.tableSessions[paymentTarget.tableId]?.tableName} 付款`} onClose={() => setPaymentTarget(null)}><div className="payment-modal"><p>本次應收 <strong>HK${paymentTarget.amount}</strong></p><label>本次收款金額<input type="number" min="0" max={paymentTarget.amount} value={paymentAmount} onChange={event => setPaymentAmount(event.target.value)} /></label><div className="settings-grid">{paymentMethods.map(method => <button key={method.key} onClick={() => finishPayment(method.key)}>{method.label}</button>)}</div></div></Modal> : null}
    {confirmClear ? <Modal title="清空購物車" onClose={() => setConfirmClear(false)}><p>目前共有 {selectors.cartQty} 件，總額 HK${selectors.cartTotal}。</p><div className="table-actions"><button onClick={() => { createHold(); setConfirmClear(false); }}>掛單後清空</button><button onClick={() => { actions.clearCart(); setConfirmClear(false); }}>直接清空</button></div></Modal> : null}
    {lookupOpen ? <Modal title="查單" onClose={() => setLookupOpen(false)}><div className="search-row"><input value={lookupText} onChange={event => setLookupText(event.target.value)} placeholder="輸入單號、來源或枱號" /><button onClick={() => actions.dispatch({ type: 'SHOW_TOAST', kind: 'info', message: lookupText ? `正在查找：${lookupText}` : '請先輸入查詢內容' })}>搜尋</button></div></Modal> : null}
    {state.ui.toast ? <button className="floating-note" onClick={() => actions.dispatch({ type: 'CLEAR_TOAST' })}>{state.ui.toast.message}</button> : null}
  </div>;
}

function Panel({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) {
  return <section className="panel-view"><header><div><small>磨飯 SMT</small><h1>{title}</h1><p>{subtitle}</p></div></header><div className="panel-content">{children}</div></section>;
}
function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return <div className="overlay"><section className="modal-card"><header><h2>{title}</h2><button onClick={onClose}>×</button></header><div className="modal-body">{children}</div></section></div>;
}
