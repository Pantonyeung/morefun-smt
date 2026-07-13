import { useMemo, useState } from 'react';
import { useSmtState } from './state/useSmtState';
import type { CartItem, PendingKind, Product, ViewKey } from './state/smtState';

type ShortcutKey = ViewKey | 'note' | 'lookup';
type Shortcut = { key: ShortcutKey; label: string; glyph: string; fixed?: boolean };

type EditMode = 'quick' | 'detail' | null;

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
  drink: '飲品',
  rice_base: '飯底',
  sauce: '醬汁',
  sold_out_replacement: '售罄替代',
  price_version: '價格版本',
  product_invalid: '商品失效',
};

const makeCartItem = (product: Product): CartItem => ({
  id: `cart-${Date.now()}-${product.id}`,
  productId: product.id,
  qty: 1,
  summary: product.summary,
  adjustments: [],
  unitPrice: product.price,
  priceVersion: 'local-v1',
  pendingIssueIds: [],
  paidQty: 0,
});

export default function App() {
  const { state, selectors, actions } = useSmtState();
  const [editMode, setEditMode] = useState<EditMode>(null);
  const [editingItemId, setEditingItemId] = useState<string>();
  const [draftNote, setDraftNote] = useState('');
  const [lookupOpen, setLookupOpen] = useState(false);
  const [lookupText, setLookupText] = useState('');
  const [confirmClear, setConfirmClear] = useState(false);

  const products = useMemo(() => Object.values(state.products), [state.products]);
  const visibleProducts = useMemo(() => products.filter(product => {
    if (product.availability !== 'available') return false;
    if (product.category !== state.ui.activeCategory) return false;
    if (state.ui.quickTag === '全部') return true;
    return product.tags?.includes(state.ui.quickTag) ?? false;
  }), [products, state.ui.activeCategory, state.ui.quickTag]);

  const editingItem = editingItemId ? state.cartItems[editingItemId] : undefined;
  const editingProduct = editingItem ? state.products[editingItem.productId] : undefined;
  const pendingIssues = useMemo(
    () => Object.values(state.pendingIssues).filter(issue => issue.state === 'open'),
    [state.pendingIssues],
  );
  const pendingKinds = [...new Set(pendingIssues.map(issue => issue.kind))];
  const holdOrders = Object.values(state.holdOrders);
  const workbenchOrders = Object.values(state.workbenchOrders);
  const activeWorkbench = workbenchOrders.filter(order => order.status === 'open' || order.status === 'ready');
  const newWorkbench = workbenchOrders.filter(order => order.status === 'new');
  const abnormalWorkbench = workbenchOrders.filter(order => order.status === 'abnormal');

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
    if (key === 'note') {
      setDraftNote(state.currentOrder.note);
      actions.openModal('note');
      return;
    }
    if (key === 'lookup') {
      setLookupOpen(true);
      return;
    }
    actions.navigate(key);
  };

  const openEdit = (item: CartItem, mode: EditMode) => {
    setEditingItemId(item.id);
    setDraftNote(item.note ?? '');
    setEditMode(mode);
  };

  const saveEdit = () => {
    if (!editingItem) return;
    actions.updateCartItem({ ...editingItem, note: draftNote });
    setEditMode(null);
  };

  const createHold = () => {
    if (!selectors.cartItems.length) return;
    const sequence = holdOrders.length + 1;
    actions.dispatch({
      type: 'CREATE_HOLD',
      hold: {
        id: `hold-${Date.now()}`,
        title: `SMT 暫存${String(sequence).padStart(2, '0')}`,
        orderSnapshot: { ...state.currentOrder, status: 'held' },
        itemSnapshots: selectors.cartItems.map(item => ({ ...item })),
        createdAt: new Date().toISOString(),
        operatorId: state.currentOrder.operatorId,
      },
    });
  };

  return (
    <div className="smt-shell">
      <header className="smt-topbar">
        <div className="brand"><strong>磨飯</strong><span>MORE<br />FUN</span><b>SMT</b><em>單號 {state.currentOrder.orderNo}</em></div>
        <div className="health-icons">
          {Object.values(state.systemHealth).map(item => (
            <button key={item.key} className={`health ${item.status === 'ok' ? 'ok' : 'alert'}`} onClick={() => actions.dispatch({ type: 'SHOW_TOAST', kind: item.status === 'ok' ? 'info' : 'error', message: `${item.label}：${item.message}` })}>
              <span>{item.label.slice(0, 1)}</span>{item.issueCount > 0 ? <i>{item.issueCount}</i> : null}
            </button>
          ))}
        </div>
        <div className="top-actions"><button className="new-order" onClick={() => actions.navigate('workbench')}>新單 <i>{selectors.newNetworkOrderCount}</i></button><button onClick={() => actions.navigate('more')}>更多</button></div>
      </header>

      <main className="app-stage">
        {state.ui.view === 'order' ? (
          <div className="order-layout">
            <section className="cart-pane">
              <div className="cart-head"><div><span>購</span><strong>購物車</strong></div><button onClick={() => setConfirmClear(true)} title="清空購物車">清空</button></div>
              <div className="cart-scroll">
                {selectors.cartItems.map(item => {
                  const product = state.products[item.productId];
                  return <article className="cart-line" key={item.id}>
                    <div className="cart-line-head"><strong>{product.code} {product.name}</strong><b>HK${item.unitPrice * item.qty}</b><button onClick={() => openEdit(item, 'quick')}>⋮</button></div>
                    {item.summary ? <p>{item.summary}</p> : null}{item.note ? <p>備註：{item.note}</p> : null}
                    <div className="cart-line-actions">
                      {product.mergeMode === 'MERGE_IDENTICAL' ? <div className="qty"><button onClick={() => actions.updateCartItem({ ...item, qty: Math.max(1, item.qty - 1) })}>−</button><span>{item.qty}</span><button onClick={() => actions.updateCartItem({ ...item, qty: item.qty + 1 })}>＋</button></div> : <span />}
                      <button className="text-action" onClick={() => openEdit(item, 'detail')}>完整詳情</button>
                    </div>
                  </article>;
                })}
              </div>
              <div className="checkout-strip"><span>共 {selectors.cartQty} 件</span><strong>HK${selectors.cartTotal}</strong><button onClick={() => actions.openModal(selectors.openPendingCount ? 'pendingBatch' : 'payment')}>{selectors.openPendingCount ? `先處理待補 ${selectors.openPendingCount}` : '收款'}</button></div>
            </section>

            <section className="product-pane">
              <div className="category-grid">{[...new Set(products.map(product => product.category))].map(category => <button key={category} className={category === state.ui.activeCategory ? 'active' : ''} onClick={() => actions.dispatch({ type: 'SET_CATEGORY', category })}>{category}</button>)}</div>
              <div className="quick-tags">{['全部', '雞', '豬', '魚', '牛', '素', '飲品'].map(tag => <button key={tag} className={tag === state.ui.quickTag ? 'active' : ''} onClick={() => actions.dispatch({ type: 'SET_QUICK_TAG', tag })}>{tag}</button>)}</div>
              <div className="product-grid">{visibleProducts.map(product => <article className="product-card" key={product.id}><button className="product-hit" onClick={() => actions.addCartItem(makeCartItem(product))}><div className="food-art">{product.code}</div><strong>{product.name}</strong><b>HK${product.price}</b></button><button className="product-more" onClick={() => actions.addCartItem(makeCartItem(product))}>＋</button></article>)}{visibleProducts.length === 0 ? <div className="empty-state">此分類暫無可售商品</div> : null}</div>
            </section>
          </div>
        ) : null}

        {state.ui.view === 'hold' ? <Panel title="掛單／取單" subtitle="掛起目前購物車，或恢復暫存訂單"><button className="primary" disabled={!selectors.cartItems.length} onClick={createHold}>掛起目前訂單</button><div className="list-grid">{holdOrders.map(hold => <article className="list-card" key={hold.id}><div><strong>{hold.title}</strong><p>{hold.itemSnapshots.length} 項 · {new Date(hold.createdAt).toLocaleTimeString('zh-HK', { hour: '2-digit', minute: '2-digit' })}</p></div><b>HK${hold.itemSnapshots.reduce((sum, item) => sum + item.unitPrice * item.qty, 0)}</b><button onClick={() => actions.dispatch({ type: 'RESTORE_HOLD', holdId: hold.id })}>恢復</button></article>)}</div></Panel> : null}

        {state.ui.view === 'pending' ? <Panel title="待補／重組" subtitle="相同缺項可一鍵處理，再個別微調"><div className="batch-actions">{pendingKinds.map(kind => <button key={kind} onClick={() => actions.resolvePendingBatch(kind)}>{`一鍵補充全部${pendingLabels[kind]}`}</button>)}</div><div className="list-grid">{pendingIssues.map(issue => <article className="list-card warn" key={issue.id}><div><strong>{issue.message}</strong><p>{pendingLabels[issue.kind]} · 價格變化 HK${issue.priceDelta}</p></div><button onClick={() => actions.dispatch({ type: 'RESOLVE_PENDING', issueId: issue.id })}>完成處理</button></article>)}</div></Panel> : null}

        {state.ui.view === 'dinein' ? <Panel title="堂食" subtitle={`使用中 ${selectors.occupiedTableCount} 枱`}>{Object.values(state.tableSessions).map(table => <button className={`table-card ${table.status === 'occupied' ? 'active' : ''}`} key={table.id} onClick={() => actions.dispatch({ type: 'SELECT_TABLE', tableId: table.id })}><strong>{table.tableName}</strong><span>{table.status === 'occupied' ? `使用中 · HK$${table.totalAmount}` : '空枱'}</span></button>)}</Panel> : null}

        {state.ui.view === 'workbench' ? <Panel title="工作台" subtitle={`現正處理 ${activeWorkbench.length} 張訂單`}><div className="workbench-summary"><button className="network-box"><span>網絡單</span><strong>{newWorkbench.length}</strong><small>待接收</small></button><button className="abnormal-box"><span>異常單</span><strong>{abnormalWorkbench.length}</strong><small>需人工處理</small></button></div><div className="list-grid">{[...activeWorkbench, ...newWorkbench, ...abnormalWorkbench].map(order => <article className={`list-card ${order.status === 'abnormal' ? 'warn' : ''}`} key={order.id}><div><strong>{order.orderNo}</strong><p>{order.source} · {order.status}</p></div><b>HK${order.amount}</b><button onClick={() => actions.dispatch({ type: 'UPSERT_WORKBENCH_ORDER', order: { ...order, status: order.status === 'new' ? 'open' : order.status } })}>{order.status === 'new' ? '接單' : '查看'}</button></article>)}</div></Panel> : null}

        {state.ui.view === 'soldout' ? <Panel title="售罄管理" subtitle={`目前售罄 ${selectors.soldOutCount} 款`}><div className="list-grid">{products.map(product => <article className={`list-card ${product.availability === 'sold_out' ? 'warn' : ''}`} key={product.id}><div><strong>{product.code} {product.name}</strong><p>{product.category}</p></div><button onClick={() => actions.dispatch({ type: 'SET_AVAILABILITY', productId: product.id, state: product.availability === 'sold_out' ? 'available' : 'sold_out', updatedBy: 'morefun', updatedAt: new Date().toISOString() })}>{product.availability === 'sold_out' ? '恢復' : '設為售罄'}</button></article>)}</div></Panel> : null}

        {state.ui.view === 'reprint' ? <Panel title="重印" subtitle="下一階段接正式 Print Job"><div className="empty-state">重印流程將於下一批接入</div></Panel> : null}
        {state.ui.view === 'more' ? <Panel title="更多入口" subtitle="下一階段接付款、重印及設定"><div className="settings-grid">{['收款設定', '打印管理', '快捷入口排序', '分類密度', '商品卡密度', '日結', '銷售報表', '權限'].map(item => <button key={item}>{item}<span>›</span></button>)}</div></Panel> : null}
      </main>

      <nav className="shortcut-bar"><div className="shortcut-grid">{shortcuts.map(shortcut => {
        const left = badgeFor(shortcut.key, 'left');
        const right = badgeFor(shortcut.key, 'right');
        const active = shortcut.key === state.ui.view;
        return <button key={shortcut.key} className={`${shortcut.fixed ? 'fixed ' : ''}${active ? 'active' : ''}`} onClick={() => navigate(shortcut.key)}>{left ? <i className="badge badge-left">{left}</i> : null}{right ? <i className="badge badge-right">{right}</i> : null}<span>{shortcut.glyph}</span><strong>{shortcut.label}</strong></button>;
      })}</div></nav>

      {editMode && editingItem && editingProduct ? <div className={editMode === 'quick' ? 'quick-overlay' : 'overlay'} onClick={() => setEditMode(null)}><section className={editMode === 'quick' ? 'quick-card' : 'detail-card'} onClick={event => event.stopPropagation()}><header><div><small>{editMode === 'quick' ? '快速修改' : '商品完整詳情'}</small><h3>{editingProduct.code} {editingProduct.name}</h3></div><button onClick={() => setEditMode(null)}>×</button></header><div className={editMode === 'quick' ? 'quick-rows' : 'detail-columns'}>{editMode === 'quick' ? <><button onClick={() => setEditMode('detail')}>完整詳情 <span>›</span></button><label><span>商品備註</span><input value={draftNote} onChange={event => setDraftNote(event.target.value)} placeholder="直接輸入" /></label></> : <><div className="detail-photo">{editingProduct.code}</div><div className="detail-options"><button>主食／飯團 <span>›</span></button><button>小食 <span>›</span></button><button>飲品 <span>›</span></button><textarea value={draftNote} onChange={event => setDraftNote(event.target.value)} placeholder="商品備註" /></div><aside><h3>目前選擇</h3><p>{editingItem.summary ?? '未有額外選項'}</p><strong>HK${editingItem.unitPrice * editingItem.qty}</strong></aside></>}</div><footer><button className="primary" onClick={saveEdit}>完成</button><button onClick={() => actions.removeCartItem(editingItem.id)}>刪除</button></footer></section></div> : null}

      {state.ui.modal === 'note' ? <Modal title="整單備註" onClose={actions.closeModal}><textarea className="modal-textarea" value={draftNote} onChange={event => setDraftNote(event.target.value)} /><div className="quick-notes">{['全部醬汁另上', '客人趕時間', '分開包裝', '到店致電'].map(note => <button key={note} onClick={() => setDraftNote(current => current ? `${current} · ${note}` : note)}>{note}</button>)}</div><button className="primary" onClick={() => { actions.setOrderNote(draftNote); actions.closeModal(); }}>完成</button></Modal> : null}
      {state.ui.modal === 'pendingBatch' ? <Modal title="尚有待補項目" onClose={actions.closeModal}><p>請先處理 {selectors.openPendingCount} 項待補，完成後才可收款。</p><button className="primary" onClick={() => actions.navigate('pending')}>前往處理</button></Modal> : null}
      {state.ui.modal === 'payment' ? <Modal title="收款" onClose={actions.closeModal}><p>應收 HK${selectors.cartTotal}</p><div className="settings-grid">{['現金', 'FPS', 'PayMe', 'Alipay', 'WeChat Pay', '混合付款'].map(method => <button key={method}>{method}</button>)}</div></Modal> : null}
      {confirmClear ? <Modal title="清空購物車" onClose={() => setConfirmClear(false)}><p>目前共有 {selectors.cartQty} 件，總額 HK${selectors.cartTotal}。</p><div className="table-actions"><button onClick={() => { createHold(); setConfirmClear(false); }}>掛單後清空</button><button onClick={() => { actions.clearCart(); setConfirmClear(false); }}>直接清空</button></div></Modal> : null}
      {lookupOpen ? <Modal title="查單" onClose={() => setLookupOpen(false)}><div className="search-row"><input value={lookupText} onChange={event => setLookupText(event.target.value)} placeholder="輸入單號、來源或枱號" /><button>搜尋</button></div></Modal> : null}
      {state.ui.toast ? <button className="floating-note" onClick={() => actions.dispatch({ type: 'CLEAR_TOAST' })}>{state.ui.toast.message}</button> : null}
    </div>
  );
}

function Panel({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) {
  return <section className="panel-view"><header><div><small>磨飯 SMT</small><h1>{title}</h1><p>{subtitle}</p></div></header><div className="panel-content">{children}</div></section>;
}

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return <div className="overlay"><section className="modal-card"><header><h2>{title}</h2><button onClick={onClose}>×</button></header><div className="modal-body">{children}</div></section></div>;
}
