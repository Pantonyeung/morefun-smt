import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { requiresConfiguration } from './domain/businessRules';
import type { CartItem, NetworkOrder, OrderSource, PaymentMethod, Product, TableSession, ViewKey } from './domain/types';
import { useSmtController } from './hooks/useSmtController';
import { CheckoutModal } from './components/CheckoutModal';
import { LoginScreen } from './components/LoginScreen';
import { ConfirmDialog, Modal } from './components/Modal';
import { ProductConfigurator } from './components/ProductConfigurator';

const sourceOptions: Array<{ key: OrderSource; label: string }> = [
  { key: 'walk_in', label: '現場外賣' },
  { key: 'whatsapp', label: 'WhatsApp' },
  { key: 'phone', label: '電話' },
  { key: 'customer_web', label: '網站' },
  { key: 'customer_app', label: 'App' },
  { key: 'foodpanda', label: 'Foodpanda' },
  { key: 'keeta', label: 'Keeta' },
];

const navItems: Array<{ key: ViewKey; label: string; glyph: string }> = [
  { key: 'order', label: '點單', glyph: '點' },
  { key: 'workbench', label: '工作台', glyph: '工' },
  { key: 'dinein', label: '堂食', glyph: '堂' },
  { key: 'hold', label: '掛單', glyph: '掛' },
  { key: 'pending', label: '待補', glyph: '補' },
  { key: 'lookup', label: '查單', glyph: '查' },
  { key: 'soldout', label: '售罄', glyph: '售' },
  { key: 'more', label: '更多', glyph: '多' },
];

export default function App() {
  const controller = useSmtController();
  const { config, configErrors, device, user, profile, health, products, categories, cart, total, cartQty, pendingIssues, source, orderMode, tableId, orderNote, holds, tables, networkOrders, printJobs, toast, busyKey, view } = controller;
  const { actions } = controller;
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('全部');
  const [tag, setTag] = useState('全部');
  const [configuring, setConfiguring] = useState<{ product: Product; item?: CartItem }>();
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [clearConfirm, setClearConfirm] = useState(false);
  const [selectedTableId, setSelectedTableId] = useState<string>();
  const [splitTable, setSplitTable] = useState<TableSession>();
  const [splitItemIds, setSplitItemIds] = useState<string[]>([]);
  const [splitMethod, setSplitMethod] = useState<PaymentMethod>('cash');
  const [reprintOrder, setReprintOrder] = useState<NetworkOrder>();
  const [reprintReason, setReprintReason] = useState('客人要求補印');
  const [lookupText, setLookupText] = useState('');
  const [workFilter, setWorkFilter] = useState<'all' | NetworkOrder['status']>('all');

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(actions.clearToast, toast.kind === 'error' ? 7000 : 3500);
    return () => window.clearTimeout(timer);
  }, [toast, actions.clearToast]);

  const visibleProducts = useMemo(() => Object.values(products).filter((product) => {
    const query = search.trim().toLowerCase();
    if (category !== '全部' && product.category !== category) return false;
    if (tag !== '全部' && !product.tags.some((value) => value.includes(tag))) return false;
    return !query || `${product.code} ${product.name} ${product.category} ${product.tags.join(' ')}`.toLowerCase().includes(query);
  }), [products, search, category, tag]);

  const currentTable = tables.find((table) => table.id === selectedTableId);
  const filteredOrders = useMemo(() => networkOrders.filter((order) => {
    if (workFilter !== 'all' && order.status !== workFilter) return false;
    const query = lookupText.trim().toLowerCase();
    return !query || `${order.orderNo} ${sourceLabel(order.source)} ${order.status} ${order.id}`.toLowerCase().includes(query);
  }), [networkOrders, workFilter, lookupText]);

  if (config.mode !== 'demo' && (!user || health.auth === 'signed_out')) {
    return <LoginScreen mode={config.mode} configErrors={configErrors} busy={busyKey === 'login'} onLogin={actions.login} onSetMode={actions.setRuntimeMode} />;
  }

  if (config.mode !== 'demo' && health.auth === 'forbidden') {
    return <main className="login-page"><section className="login-card"><div className="login-brand"><span className="brand-mark">磨飯</span><div><strong>SMT</strong><small>權限驗證失敗</small></div></div><div className="setup-warning"><strong>此帳戶未獲 SMT 權限</strong><p>請確認 staffProfiles/{user?.uid} 的 active=true，role=smt 或 admin。</p></div><button className="button secondary wide-button" onClick={() => void actions.logout()}>登出</button></section></main>;
  }

  const addProduct = (product: Product) => {
    if (requiresConfiguration(product) || !actions.quickAdd(product)) setConfiguring({ product });
  };

  const run = async (operation: () => Promise<unknown>) => {
    try { await operation(); }
    catch (error) { actions.showToast({ kind: 'error', message: (error as Error).message }); }
  };

  return <div className="smt-app">
    <header className="topbar">
      <div className="brand-lockup"><span className="brand-word">磨飯</span><b>SMT</b><div><strong>{orderMode === 'dinein' && tableId ? tables.find((table) => table.id === tableId)?.tableName : '快速開單'}</strong><small>{profile?.displayName || 'Demo Operator'} · {device.deviceNumber || '未綁定裝置'}</small></div></div>
      <div className="runtime-strip">
        <span className={`mode-pill mode-${config.mode}`}>{config.mode === 'live' ? 'LIVE' : config.mode === 'staging' ? 'STAGING' : 'DEMO'}</span>
        <HealthChip label="Firebase" status={health.firebase} />
        <HealthChip label="API" status={health.api} />
        <HealthChip label="Realtime" status={health.realtime} />
        <span className="health-message">{health.lastMessage}</span>
      </div>
      <div className="top-actions"><button className="button secondary" onClick={() => actions.setView('workbench')}>新網絡單 <Badge value={controller.newNetworkCount} /></button><button className="icon-button" onClick={() => actions.setView('more')} aria-label="更多設定">⋯</button></div>
    </header>

    <main className="workspace">
      {view === 'order' ? <div className="order-workspace">
        <aside className="cart-panel">
          <div className="cart-context">
            <label><span>來源</span><select value={source} onChange={(event) => actions.setSource(event.target.value as OrderSource)}>{sourceOptions.map((option) => <option key={option.key} value={option.key}>{option.label}</option>)}</select></label>
            <div className="segmented"><button className={orderMode === 'takeaway' ? 'active' : ''} onClick={() => { actions.setOrderMode('takeaway'); actions.setTableId(undefined); }}>外賣</button><button className={orderMode === 'dinein' ? 'active' : ''} onClick={() => actions.setView('dinein')}>堂食</button></div>
          </div>
          <div className="cart-heading"><div><strong>購物車</strong><span>{cartQty} 件</span></div><div><button className="text-button" disabled={!cart.length} onClick={actions.holdCurrent}>掛單</button><button className="text-button danger-text" disabled={!cart.length} onClick={() => setClearConfirm(true)}>清空</button></div></div>
          <div className="cart-list">
            {cart.length ? cart.map((item) => {
              const product = products[item.productId];
              return <article className={`cart-item ${item.pendingIssues.length ? 'has-issue' : ''}`} key={item.id}>
                <div className="cart-item-title"><div><strong>{product?.code} {product?.name}</strong>{item.pendingIssues.length ? <span className="pending-label">待補 {item.pendingIssues.length}</span> : null}</div><b>HK${item.estimatedUnitPrice * item.quantity}</b></div>
                <p>{item.summary}</p>{item.note ? <small>備註：{item.note}</small> : null}
                <div className="cart-item-actions"><div className="qty-control"><button onClick={() => actions.updateQuantity(item.id, item.quantity - 1)}>−</button><span>{item.quantity}</span><button onClick={() => actions.updateQuantity(item.id, item.quantity + 1)}>＋</button></div><button className="text-button" onClick={() => product && setConfiguring({ product, item })}>修改</button><button className="icon-button small" onClick={() => actions.removeItem(item.id)} aria-label={`刪除 ${product?.name}`}>×</button></div>
              </article>;
            }) : <EmptyState icon="購" title="購物車未有餐點" message="點擊右邊商品即可開始開單" />}
          </div>
          <label className="order-note"><span>整單備註</span><textarea value={orderNote} onChange={(event) => actions.setOrderNote(event.target.value)} placeholder="客人趕時間、分開包裝、到店致電…" /></label>
          <div className={`checkout-bar ${pendingIssues.length ? 'blocked' : ''}`}><div><small>前端估算</small><strong>HK${total}</strong></div><button disabled={!cart.length} onClick={() => pendingIssues.length ? actions.setView('pending') : setCheckoutOpen(true)}>{pendingIssues.length ? `先處理待補 ${pendingIssues.length}` : '核對及收款'}</button></div>
        </aside>

        <section className="catalog-panel">
          <div className="catalog-tools"><div className="search-box"><span>⌕</span><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="搜尋商品名稱、編號或分類" /></div><span className="catalog-count">{visibleProducts.length} / {Object.keys(products).length}</span></div>
          <div className="category-tabs"><button className={category === '全部' ? 'active' : ''} onClick={() => setCategory('全部')}>全部</button>{categories.map((value) => <button key={value} className={category === value ? 'active' : ''} onClick={() => setCategory(value)}>{value}</button>)}</div>
          <div className="quick-tags">{['全部', '雞', '豬', '魚', '牛', '素', '飲品'].map((value) => <button key={value} className={tag === value ? 'active' : ''} onClick={() => setTag(value)}>{value}</button>)}</div>
          <div className="product-grid">{visibleProducts.map((product) => <ProductCard key={product.id} product={product} onOpen={() => addProduct(product)} onDetail={() => setConfiguring({ product })} />)}{!visibleProducts.length ? <EmptyState icon="空" title="此篩選沒有商品" message="嘗試切換分類或清除搜尋" /> : null}</div>
        </section>
      </div> : null}

      {view === 'workbench' ? <Panel title="訂單工作台" subtitle={`待接 ${controller.newNetworkCount} · 異常 ${controller.abnormalCount} · Realtime ${health.realtime}`} actions={<button className="button secondary" onClick={() => setLookupText('')}>清除搜尋</button>}>
        <div className="workbench-tools"><div className="search-box"><span>⌕</span><input value={lookupText} onChange={(event) => setLookupText(event.target.value)} placeholder="搜尋單號、來源、狀態" /></div><div className="status-tabs">{(['all', 'pending', 'accepted', 'preparing', 'ready', 'abnormal'] as const).map((status) => <button key={status} className={workFilter === status ? 'active' : ''} onClick={() => setWorkFilter(status)}>{status === 'all' ? '全部' : statusLabel(status)}</button>)}</div></div>
        <div className="order-list">{filteredOrders.map((order) => <OrderCard key={order.id} order={order} busy={busyKey.includes(order.id)} onAccept={() => void run(() => actions.acceptOrder(order))} onAdvance={() => void run(() => actions.advanceOrder(order))} onReprint={() => { setReprintOrder(order); setReprintReason('客人要求補印'); }} />)}{!filteredOrders.length ? <EmptyState icon="單" title="沒有符合條件的訂單" message="Realtime queue 會在收到新單時自動更新" /> : null}</div>
      </Panel> : null}

      {view === 'dinein' ? <Panel title="堂食管理" subtitle={`使用中 ${controller.occupiedTables} 枱 · 按商品拆單，不使用平均除人數`}>
        {currentTable ? <TableDetail table={currentTable} onBack={() => setSelectedTableId(undefined)} onAdd={() => actions.openTable(currentTable)} onSplit={() => { setSplitTable(currentTable); setSplitItemIds([]); }} /> : <div className="table-grid">{tables.map((table) => <button key={table.id} className={`table-card ${table.status}`} onClick={() => table.status === 'vacant' ? actions.openTable(table) : setSelectedTableId(table.id)}><strong>{table.tableName}</strong><span>{table.status === 'vacant' ? '空枱 · 點擊開單' : table.status === 'reserved' ? '已預約' : '使用中'}</span>{table.status === 'occupied' ? <><small>{table.lineItems.filter((line) => !line.paid).length} 項未付</small><b>HK${table.lineItems.filter((line) => !line.paid).reduce((sum, line) => sum + line.amount, 0)}</b></> : null}</button>)}</div>}
      </Panel> : null}

      {view === 'hold' ? <Panel title="掛單／取單" subtitle="掛單只保存在本機，恢復時會重新檢查商品狀態">
        <div className="card-list">{holds.map((hold) => <article className="list-card" key={hold.id}><div><strong>{hold.title}</strong><p>{hold.draft.items.length} 項 · {sourceLabel(hold.draft.source)} · {new Date(hold.createdAt).toLocaleTimeString('zh-HK')}</p></div><b>HK${hold.draft.items.reduce((sum, item) => sum + item.estimatedUnitPrice * item.quantity, 0)}</b><div><button className="button primary" onClick={() => actions.restoreHold(hold)}>恢復</button><button className="button ghost danger-text" onClick={() => actions.deleteHold(hold.id)}>刪除</button></div></article>)}{!holds.length ? <EmptyState icon="掛" title="沒有掛單" message="清空或中途轉單前，可先將購物車掛起" /> : null}</div>
      </Panel> : null}

      {view === 'pending' ? <Panel title="待補／重組" subtitle={`尚有 ${pendingIssues.length} 個問題，全部完成後才可收款`}>
        <div className="pending-list">{cart.filter((item) => item.pendingIssues.length).map((item) => { const product = products[item.productId]; return <article key={item.id}><div><strong>{product?.code} {product?.name}</strong>{item.pendingIssues.map((issue) => <p key={`${issue.kind}-${issue.message}`}>{issue.message}</p>)}</div><button className="button primary" onClick={() => product && setConfiguring({ product, item })}>立即處理</button></article>; })}{!pendingIssues.length ? <EmptyState icon="✓" title="沒有待補項目" message="所有商品選項完整，可以前往收款" /> : null}</div>
      </Panel> : null}

      {view === 'lookup' ? <Panel title="查單" subtitle="依單號、來源、狀態搜尋 Realtime 訂單">
        <div className="search-box lookup-search"><span>⌕</span><input value={lookupText} onChange={(event) => setLookupText(event.target.value)} placeholder="例如 W-1048、WhatsApp、可取餐" /></div>
        <div className="order-list">{filteredOrders.map((order) => <OrderCard key={order.id} order={order} busy={false} onAccept={() => void run(() => actions.acceptOrder(order))} onAdvance={() => void run(() => actions.advanceOrder(order))} onReprint={() => setReprintOrder(order)} />)}{!filteredOrders.length ? <EmptyState icon="查" title="找不到訂單" message="目前只顯示 Firebase pending／active queue；歷史查詢需後端 search endpoint" /> : null}</div>
      </Panel> : null}

      {view === 'soldout' ? <Panel title="售罄管理" subtitle={`${controller.soldOutCount} 款不可售 · 目前切換只屬 SMT 本機試運行`}>
        <div className="warning-box page-warning">正式 availability 寫入必須新增 Worker endpoint；本頁不會直接越權寫 Firebase。</div>
        <div className="product-admin-grid">{Object.values(products).map((product) => <article key={product.id} className={product.availability !== 'available' ? 'sold' : ''}><div><strong>{product.code} {product.name}</strong><p>{product.category}</p></div><button className={`toggle ${product.availability !== 'available' ? 'on' : ''}`} onClick={() => actions.toggleSoldOut(product.id)} aria-pressed={product.availability !== 'available'}><span />{product.availability === 'available' ? '可售' : '售罄'}</button></article>)}</div>
      </Panel> : null}

      {view === 'reprint' ? <Panel title="重印" subtitle="只提交 authenticated reprint request；打印目的地由 SMT 後端控制">
        <div className="order-list">{networkOrders.filter((order) => order.status !== 'cancelled').map((order) => <article className="list-card" key={order.id}><div><strong>{order.orderNo}</strong><p>{sourceLabel(order.source)} · {statusLabel(order.status)} · HK${order.total}</p></div><span>{new Date(order.updatedAt).toLocaleTimeString('zh-HK')}</span><button className="button primary" onClick={() => setReprintOrder(order)}>要求重印</button></article>)}</div>
      </Panel> : null}

      {view === 'more' ? <Panel title="更多／系統" subtitle="正式發佈、裝置、Catalog、打印與風險狀態">
        <div className="settings-dashboard">
          <InfoCard label="Runtime" value={config.mode.toUpperCase()} detail={config.orderApiBaseUrl || 'API URL 未設定'} />
          <InfoCard label="裝置" value={device.deviceNumber || '未綁定'} detail={device.deviceId} />
          <InfoCard label="Catalog" value={`${Object.keys(products).length} 款`} detail={`manifest ${String(controller.catalogMeta.checksum || '未取得').slice(0, 14)}`} />
          <InfoCard label="Print jobs" value={String(countNested(printJobs))} detail="只讀 Firebase 狀態；真實打印由 Android bridge" />
          <InfoCard label="Firebase" value={health.firebase} detail={health.lastMessage} />
          <InfoCard label="登入帳戶" value={profile?.displayName || 'Demo'} detail={`${profile?.role || 'demo'} · ${user?.email || 'local'}`} />
        </div>
        <div className="settings-actions"><button className="button secondary" onClick={() => actions.setRuntimeMode('demo')}>切換 Demo</button><button className="button secondary" onClick={() => actions.setRuntimeMode('staging')}>切換 Staging</button><button className="button secondary" onClick={() => actions.setView('reprint')}>重印管理</button><button className="button secondary" onClick={() => actions.setView('soldout')}>售罄管理</button>{config.mode !== 'demo' ? <button className="button danger" onClick={() => void actions.logout()}>登出</button> : null}</div>
      </Panel> : null}
    </main>

    <nav className="bottom-nav" aria-label="SMT 功能導航">{navItems.map((item) => {
      const badge = item.key === 'workbench' ? controller.newNetworkCount : item.key === 'dinein' ? controller.occupiedTables : item.key === 'hold' ? holds.length : item.key === 'pending' ? pendingIssues.length : item.key === 'soldout' ? controller.soldOutCount : 0;
      return <button key={item.key} className={view === item.key ? 'active' : ''} onClick={() => actions.setView(item.key)}><span>{item.glyph}</span><strong>{item.label}</strong>{badge ? <Badge value={badge} /> : null}</button>;
    })}</nav>

    {configuring ? <ProductConfigurator product={configuring.product} catalog={products} item={configuring.item} onClose={() => setConfiguring(undefined)} onSave={(selections, note, existingId) => { actions.addConfigured(configuring.product, selections, note, existingId); setConfiguring(undefined); }} /> : null}
    {checkoutOpen ? <CheckoutModal items={cart} products={products} total={total} pendingCount={pendingIssues.length} source={source} mode={orderMode} tableId={tableId} tables={tables} runtimeMode={config.mode} busy={busyKey === 'submit-order'} onClose={() => setCheckoutOpen(false)} onSubmit={(method, name, phone, time) => actions.submitOrder(method, name, phone, time).then(() => undefined)} /> : null}
    {clearConfirm ? <ConfirmDialog title="清空購物車" message={`目前共有 ${cartQty} 件，總額 HK$${total}。清空後不可復原。`} danger confirmLabel="確認清空" onClose={() => setClearConfirm(false)} onConfirm={() => { actions.clearCart(); setClearConfirm(false); }} /> : null}
    {splitTable ? <TableSplitModal table={splitTable} selectedIds={splitItemIds} method={splitMethod} onToggle={(id) => setSplitItemIds((current) => current.includes(id) ? current.filter((value) => value !== id) : [...current, id])} onMethod={setSplitMethod} onClose={() => setSplitTable(undefined)} onPay={() => { actions.payTableItems(splitTable.id, splitItemIds, splitMethod); setSplitTable(undefined); setSplitItemIds([]); }} /> : null}
    {reprintOrder ? <Modal title={`要求重印 ${reprintOrder.orderNo}`} subtitle="重印會建立新批次，不會覆蓋原打印紀錄" onClose={() => setReprintOrder(undefined)} size="small" footer={<><button className="button secondary" onClick={() => setReprintOrder(undefined)}>取消</button><button className="button primary" disabled={!reprintReason.trim() || busyKey === `reprint:${reprintOrder.id}`} onClick={() => void run(async () => { await actions.requestReprint(reprintOrder.id, reprintReason); setReprintOrder(undefined); })}>提交重印</button></>}><label className="field"><span>重印原因</span><textarea value={reprintReason} onChange={(event) => setReprintReason(event.target.value)} maxLength={200} /></label><p className="inline-note">SMM／SMT 只提交請求；實際 print jobs 仍由 SMT-controlled backend 建立。</p></Modal> : null}
    {toast ? <button className={`toast toast-${toast.kind}`} onClick={actions.clearToast}>{toast.message}</button> : null}
  </div>;
}

function ProductCard({ product, onOpen, onDetail }: { product: Product; onOpen: () => void; onDetail: () => void }) {
  const sold = product.availability !== 'available';
  return <article className={`product-card ${sold ? 'sold' : ''}`}><button className="product-main" onClick={onOpen} disabled={sold}><div className="product-image">{product.imageUrl ? <img src={product.imageUrl} alt="" /> : <span>{product.code}</span>}</div><div className="product-copy"><small>{product.category}</small><strong>{product.name}</strong><b>HK${product.price}</b></div></button><button className="product-detail-button" onClick={onDetail} disabled={sold}>{sold ? '售罄' : requiresConfiguration(product) ? '選項' : '詳情'}</button></article>;
}

function OrderCard({ order, busy, onAccept, onAdvance, onReprint }: { order: NetworkOrder; busy: boolean; onAccept: () => void; onAdvance: () => void; onReprint: () => void }) {
  const canAdvance = ['accepted', 'preparing', 'ready'].includes(order.status);
  return <article className={`order-card status-${order.status}`}><header><div><strong>{order.orderNo}</strong><span>{sourceLabel(order.source)}</span></div><b>HK${order.total}</b></header><div className="order-meta"><span>{order.itemCount} 件</span><span>{statusLabel(order.status)}</span><span>{new Date(order.createdAt).toLocaleTimeString('zh-HK', { hour: '2-digit', minute: '2-digit' })}</span>{order.issueCount ? <span className="danger-text">異常 {order.issueCount}</span> : null}</div><footer>{order.status === 'pending' ? <button className="button primary" disabled={busy} onClick={onAccept}>接單</button> : canAdvance ? <button className="button primary" disabled={busy} onClick={onAdvance}>{order.status === 'accepted' ? '開始處理' : order.status === 'preparing' ? '完成／可取餐' : '客人已取餐'}</button> : <span />}<button className="button ghost" onClick={onReprint}>重印</button></footer></article>;
}

function TableDetail({ table, onBack, onAdd, onSplit }: { table: TableSession; onBack: () => void; onAdd: () => void; onSplit: () => void }) {
  const unpaid = table.lineItems.filter((line) => !line.paid);
  const total = table.lineItems.reduce((sum, line) => sum + line.amount, 0);
  const paid = table.lineItems.filter((line) => line.paid).reduce((sum, line) => sum + line.amount, 0);
  return <div className="table-detail"><button className="text-button" onClick={onBack}>‹ 返回枱號</button><header><div><h2>{table.tableName}</h2><p>{table.status === 'occupied' ? '使用中' : table.status}</p></div><div className="table-totals"><span>總額 <b>HK${total}</b></span><span className="paid">已付 <b>HK${paid}</b></span><span className="unpaid">未付 <b>HK${total - paid}</b></span></div></header><div className="table-lines">{table.lineItems.map((line) => <article key={line.id} className={line.paid ? 'paid' : ''}><span>{line.label}</span><b>HK${line.amount}</b><small>{line.paid ? '已付款' : '未付款'}</small></article>)}</div><div className="table-action-row"><button className="button primary" onClick={onAdd}>追加點單</button><button className="button secondary" disabled={!unpaid.length} onClick={onSplit}>按商品拆單／付款</button></div></div>;
}

function TableSplitModal({ table, selectedIds, method, onToggle, onMethod, onPay, onClose }: { table: TableSession; selectedIds: string[]; method: PaymentMethod; onToggle: (id: string) => void; onMethod: (method: PaymentMethod) => void; onPay: () => void; onClose: () => void }) {
  const unpaid = table.lineItems.filter((line) => !line.paid);
  const amount = unpaid.filter((line) => selectedIds.includes(line.id)).reduce((sum, line) => sum + line.amount, 0);
  return <Modal title={`${table.tableName} 按商品拆單`} subtitle="每件商品只可分配到一張付款單，不使用平均除人數" onClose={onClose} size="large" footer={<><button className="button secondary" onClick={onClose}>取消</button><button className="button primary" disabled={!selectedIds.length} onClick={onPay}>收款 HK${amount}</button></>}><div className="split-items">{unpaid.map((line) => <button key={line.id} className={selectedIds.includes(line.id) ? 'active' : ''} onClick={() => onToggle(line.id)}><span>{line.label}</span><b>HK${line.amount}</b><small>{selectedIds.includes(line.id) ? '已選入本次付款' : '未選擇'}</small></button>)}</div><label className="field"><span>付款方式</span><select value={method} onChange={(event) => onMethod(event.target.value as PaymentMethod)}><option value="cash">現金</option><option value="fps">FPS</option><option value="payme">PayMe</option><option value="alipay">Alipay</option><option value="wechat_pay">WeChat Pay</option></select></label><div className="checkout-total"><span>本次收款</span><strong>HK${amount}</strong></div></Modal>;
}

function Panel({ title, subtitle, actions, children }: { title: string; subtitle: string; actions?: ReactNode; children: ReactNode }) {
  return <section className="panel"><header className="panel-header"><div><small>磨飯 SMT</small><h1>{title}</h1><p>{subtitle}</p></div>{actions ? <div>{actions}</div> : null}</header><div className="panel-body">{children}</div></section>;
}
function EmptyState({ icon, title, message }: { icon: string; title: string; message: string }) { return <div className="empty-state"><span>{icon}</span><strong>{title}</strong><p>{message}</p></div>; }
function HealthChip({ label, status }: { label: string; status: string }) { return <span className={`health-chip health-${status}`}><i />{label}</span>; }
function Badge({ value }: { value: number }) { return value ? <i className="badge">{value > 99 ? '99+' : value}</i> : null; }
function InfoCard({ label, value, detail }: { label: string; value: string; detail: string }) { return <article className="info-card"><small>{label}</small><strong>{value}</strong><p>{detail}</p></article>; }
function sourceLabel(source: OrderSource) { return ({ smt: 'SMT', walk_in: '現場', whatsapp: 'WhatsApp', phone: '電話', customer_web: '網站', customer_app: 'App', foodpanda: 'Foodpanda', keeta: 'Keeta' } as Record<OrderSource, string>)[source]; }
function statusLabel(status: string) { return ({ pending: '待接單', accepted: '已接單', preparing: '處理中', ready: '完成／可取餐', completed: '已取餐', cancelled: '已取消', abnormal: '異常' } as Record<string, string>)[status] || status; }
function countNested(value: unknown): number { if (!value || typeof value !== 'object') return 0; return Object.values(value as Record<string, unknown>).reduce((sum, child) => sum + (child && typeof child === 'object' ? Object.keys(child as Record<string, unknown>).length : 1), 0); }
