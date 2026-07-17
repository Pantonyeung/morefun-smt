import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { requiresConfiguration } from '../domain/businessRules';
import type { CartItem, NetworkOrder, PaymentMethod, Product, ProductAvailability, TableSession, ViewKey } from '../domain/types';
import { useSmtController } from '../hooks/useSmtController';
import { LoginScreen } from '../components/LoginScreen';
import { OperationsCheckout } from '../components/OperationsCheckout';
import { getSmtAppearance, setSmtQuickMode, setSmtTheme, type SmtThemeId } from '../themeRuntime';
import { ProductDrawer } from './ProductDrawer';
import { buildCategorySlots, displayTableName, getOperationalTiming } from './layoutPolicy';

const NAV: Array<{ key: ViewKey; label: string; glyph: string }> = [
  { key: 'order', label: '點單', glyph: '點' },
  { key: 'workbench', label: '訂單', glyph: '單' },
  { key: 'dinein', label: '堂食', glyph: '桌' },
  { key: 'soldout', label: '售罄', glyph: '售' },
  { key: 'more', label: '更多', glyph: '多' },
];

const THEMES: Array<[SmtThemeId, string]> = [
  ['sunrise', '暖陽'], ['rice', '米白'], ['zimi', '紫米'], ['moss', '青苔'], ['ocean', '海藍'], ['night', '夜色'],
];

const PERMANENT_OVERRIDE_KEY = 'morefun.smt.preview.permanent-stop.v1';

type DrawerState = { product: Product; item?: CartItem; mode: 'quick' | 'full' };

export default function LockedOperationsAppV2() {
  const controller = useSmtController();
  const { config, configErrors, device, user, health, products, categories, cart, total, cartQty, pendingIssues, source, orderNote, holds, tables, networkOrders, toast, busyKey, view } = controller;
  const { actions } = controller;
  const [category, setCategory] = useState('全部');
  const [search, setSearch] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);
  const [drawer, setDrawer] = useState<DrawerState>();
  const [checkout, setCheckout] = useState(false);
  const [statusOpen, setStatusOpen] = useState(false);
  const [selectedTableIndex, setSelectedTableIndex] = useState<number>();
  const [orderTab, setOrderTab] = useState<'active' | 'history'>('active');
  const [soldSearch, setSoldSearch] = useState('');
  const [soldFilter, setSoldFilter] = useState<'all' | 'zimi'>('all');
  const [selectedSold, setSelectedSold] = useState<string[]>([]);
  const [appearance, setAppearance] = useState(() => getSmtAppearance());
  const [now, setNow] = useState(() => Date.now());
  const [extensions, setExtensions] = useState<Record<string, number>>({});
  const [availabilityOverrides, setAvailabilityOverrides] = useState<Record<string, ProductAvailability>>(() => loadLocal(PERMANENT_OVERRIDE_KEY, {}));

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 30_000);
    return () => window.clearInterval(timer);
  }, []);
  useEffect(() => saveLocal(PERMANENT_OVERRIDE_KEY, availabilityOverrides), [availabilityOverrides]);

  const effectiveProducts = useMemo(() => Object.fromEntries(Object.entries(products).map(([id, product]) => [id, availabilityOverrides[id] ? { ...product, availability: availabilityOverrides[id] } : product])), [products, availabilityOverrides]);
  const categorySlots = useMemo(() => buildCategorySlots(categories), [categories]);
  const visibleProducts = useMemo(() => Object.values(effectiveProducts).filter((product) => {
    if (category !== '全部' && category !== '更多' && product.category !== category) return false;
    const q = search.trim().toLowerCase();
    return !q || `${product.code} ${product.name} ${product.category}`.toLowerCase().includes(q);
  }), [effectiveProducts, category, search]);
  const quickDrinks = useMemo(() => Object.values(effectiveProducts).filter((product) => product.ruleKind === 'drink').slice(0, 12), [effectiveProducts]);
  const submissions = useMemo(() => networkOrders.filter((order) => order.status === 'pending'), [networkOrders]);
  const activeOrders = useMemo(() => networkOrders.filter((order) => ['accepted', 'preparing', 'ready', 'abnormal'].includes(order.status)), [networkOrders]);
  const historyOrders = useMemo(() => networkOrders.filter((order) => ['completed', 'cancelled'].includes(order.status)), [networkOrders]);
  const soldProducts = useMemo(() => Object.values(effectiveProducts).filter((product) => {
    const q = soldSearch.trim().toLowerCase();
    const matchesQuery = !q || `${product.code} ${product.name} ${product.category}`.toLowerCase().includes(q);
    const matchesFilter = soldFilter === 'all' || product.category.includes('紫米') || /^(F|RB|S)/.test(product.code);
    return matchesQuery && matchesFilter;
  }), [effectiveProducts, soldSearch, soldFilter]);

  if (config.mode !== 'demo' && (!user || health.auth === 'signed_out')) return <LoginScreen mode={config.mode} configErrors={configErrors} busy={busyKey === 'login'} onLogin={actions.login} onSetMode={actions.setRuntimeMode} />;
  if (config.mode !== 'demo' && health.auth === 'forbidden') return <main className="login-page"><section className="login-card"><strong>此帳戶未獲 SMT 權限</strong><button className="button primary" onClick={() => void actions.logout()}>登出</button></section></main>;

  const toggleQuickMode = () => {
    setSmtQuickMode(!appearance.quickMode);
    setAppearance(getSmtAppearance());
  };
  const chooseTheme = (theme: SmtThemeId | 'auto_daily') => {
    setSmtTheme(theme);
    setAppearance(getSmtAppearance());
  };
  const configureProduct = (product: Product, item?: CartItem, mode: 'quick' | 'full' = item ? 'quick' : 'full') => setDrawer({ product, item, mode });
  const addProduct = (product: Product) => {
    if (product.availability !== 'available') {
      actions.showToast({ kind: 'warning', message: `${product.name} 目前不可售` });
      return;
    }
    if (requiresConfiguration(product) || !actions.quickAdd(product)) configureProduct(product, undefined, 'full');
  };
  const applyAvailability = (availability: ProductAvailability) => {
    if (!selectedSold.length) return;
    selectedSold.forEach((id) => {
      const original = products[id];
      if (!original) return;
      if (availability === 'permanently_disabled') return;
      if (availability === 'sold_out' && original.availability === 'available') actions.toggleSoldOut(id);
      if (availability === 'available' && original.availability !== 'available') actions.toggleSoldOut(id);
    });
    setAvailabilityOverrides((current) => {
      const next = { ...current };
      selectedSold.forEach((id) => availability === 'permanently_disabled' ? next[id] = availability : delete next[id]);
      return next;
    });
    actions.showToast({ kind: 'warning', message: availability === 'permanently_disabled' ? '永久停售只保存於目前預覽裝置，未聲稱已同步雲端' : availability === 'sold_out' ? '即日售罄已在本機試運行生效' : '供應狀態已在本機試運行恢復' });
    setSelectedSold([]);
  };
  const navBadge = (key: ViewKey) => key === 'workbench' ? submissions.length + controller.abnormalCount : key === 'dinein' ? controller.occupiedTables : key === 'soldout' ? Object.values(effectiveProducts).filter((product) => product.availability !== 'available').length : 0;
  const currentSerial = String(networkOrders.length + 1).padStart(4, '0');

  return <div className="v2-app">
    <div className="v2-portrait-notice"><strong>請將iPhone橫向使用</strong><span>SMT驗收版只提供橫屏排版</span></div>

    <header className="v2-topbar">
      <button className="v2-brand" onClick={() => actions.setView('more')}><strong>磨飯</strong><span>SMT</span></button>
      <button className="v2-status success" onClick={() => setStatusOpen(true)}><b>營業</b><small>正常</small></button>
      <button className={`v2-status ${health.realtime === 'online' ? 'success' : 'warning'}`} onClick={() => setStatusOpen(true)}><b>{health.realtime === 'online' ? '連線' : '離線'}</b><small>{health.realtime === 'online' ? '正常' : '可工作'}</small></button>
      <button className={`v2-status ${appearance.quickMode ? 'active' : ''}`} onClick={toggleQuickMode}><b>快速</b><small>{appearance.quickMode ? '開' : '關'}</small></button>
      <button className="v2-status" onClick={() => setStatusOpen(true)}><b>打印</b><small>同步</small></button>
      <button className="v2-new" onClick={() => actions.setView('workbench')}><span>新單</span><b>{submissions.length}</b></button>
      <time><strong>{new Date(now).toLocaleTimeString('zh-HK', { hour: '2-digit', minute: '2-digit' })}</strong><small>#{currentSerial}</small></time>
    </header>

    <main className="v2-main">
      {view === 'order' ? <OrderSurface products={effectiveProducts} categorySlots={categorySlots} category={category} search={search} searchOpen={searchOpen} visibleProducts={visibleProducts} quickDrinks={quickDrinks} cart={cart} cartQty={cartQty} total={total} pendingIssues={pendingIssues.length} orderNote={orderNote} holdsCount={holds.length} onCategory={setCategory} onSearch={setSearch} onSearchOpen={setSearchOpen} onAdd={addProduct} onConfigure={configureProduct} onQuantity={actions.updateQuantity} onRemove={actions.removeItem} onNote={actions.setOrderNote} onHold={() => cart.length ? actions.holdCurrent() : actions.setView('hold')} onCheckout={() => pendingIssues.length ? actions.setView('pending') : setCheckout(true)} /> : null}

      {view === 'workbench' ? <OrdersSurface submissions={submissions} activeOrders={activeOrders} historyOrders={historyOrders} tab={orderTab} now={now} extensions={extensions} onTab={setOrderTab} onAccept={(order) => void actions.acceptOrder(order)} onReprint={(order) => void actions.requestReprint(order.id, '訂單頁查看／重印')} onExtend={(id, minutes) => setExtensions((current) => ({ ...current, [id]: (current[id] || 0) + minutes }))} /> : null}

      {view === 'dinein' ? <DineInSurface tables={tables} holdsCount={holds.length} selectedIndex={selectedTableIndex} onSelect={setSelectedTableIndex} onStart={(table) => actions.openTable(table)} onRetrieve={() => actions.setView('hold')} /> : null}

      {view === 'soldout' ? <SoldOutSurface products={soldProducts} selected={selectedSold} search={soldSearch} filter={soldFilter} onSearch={setSoldSearch} onFilter={setSoldFilter} onToggle={(id) => setSelectedSold((current) => current.includes(id) ? current.filter((value) => value !== id) : [...current, id])} onSelectAll={() => setSelectedSold(soldProducts.map((product) => product.id))} onClear={() => setSelectedSold([])} onAvailability={applyAvailability} /> : null}

      {view === 'more' ? <MoreSurface appearance={appearance} deviceNumber={device.deviceNumber} onQuick={toggleQuickMode} onTheme={chooseTheme} onStatus={() => setStatusOpen(true)} onReprint={() => actions.setView('reprint')} /> : null}

      {view === 'hold' ? <SimplePage title="取回暫存單" subtitle="暫存不派流水、不付款、不打印。" count={`${holds.length}張`}><div className="v2-card-grid">{holds.map((hold) => <article key={hold.id}><strong>{hold.title}</strong><span>{hold.draft.items.length}項</span><b>HK${hold.draft.items.reduce((sum, item) => sum + item.estimatedUnitPrice * item.quantity, 0)}</b><button onClick={() => actions.restoreHold(hold)}>取回</button><button className="danger" onClick={() => actions.deleteHold(hold.id)}>刪除</button></article>)}</div></SimplePage> : null}

      {view === 'pending' ? <SimplePage title="先整理" subtitle="完成Required後先可以正式結帳。" count={`${pendingIssues.length}項`}><div className="v2-card-grid">{cart.filter((item) => item.pendingIssues.length).map((item) => { const product = effectiveProducts[item.productId]; return <article key={item.id}><strong>{product?.code} {product?.name}</strong>{item.pendingIssues.map((issue) => <span key={`${issue.kind}-${issue.message}`}>{issue.message}</span>)}<button onClick={() => product && configureProduct(product, item, 'full')}>處理選項</button></article>; })}</div></SimplePage> : null}

      {view === 'reprint' ? <SimplePage title="設備與重印" subtitle="打印健康及最近訂單。"><div className="v2-card-grid">{networkOrders.map((order) => <OrderCard key={order.id} order={order} now={now} extensionMinutes={extensions[order.id] || 0} action={<button onClick={() => void actions.requestReprint(order.id, '設備與重印')}>重印</button>} />)}</div></SimplePage> : null}
    </main>

    <nav className="v2-nav">{NAV.map((item) => { const badge = navBadge(item.key); return <button key={item.key} className={view === item.key ? 'active' : ''} onClick={() => actions.setView(item.key)}><span>{item.glyph}</span><strong>{item.label}</strong>{badge ? <em>{badge}</em> : null}</button>; })}</nav>

    {drawer ? <ProductDrawer product={drawer.product} catalog={effectiveProducts} item={drawer.item} initialMode={drawer.mode} onClose={() => setDrawer(undefined)} onSave={(selections, note, existingId) => { actions.addConfigured(drawer.product, selections, note, existingId); setDrawer(undefined); }} /> : null}
    {checkout ? <OperationsCheckout items={cart} products={effectiveProducts} total={total} runtimeMode={config.mode} busy={busyKey === 'submit-order'} initialSource={source} onSource={actions.setSource} onClose={() => setCheckout(false)} onSubmit={(method: PaymentMethod) => actions.submitOrder(method).then(() => undefined)} /> : null}
    {statusOpen ? <StatusDrawer health={health} mode={config.mode} onClose={() => setStatusOpen(false)} /> : null}
    {toast ? <button className={`toast toast-${toast.kind}`} onClick={actions.clearToast}>{toast.message}</button> : null}
  </div>;
}

function OrderSurface(props: {
  products: Record<string, Product>;
  categorySlots: string[];
  category: string;
  search: string;
  searchOpen: boolean;
  visibleProducts: Product[];
  quickDrinks: Product[];
  cart: CartItem[];
  cartQty: number;
  total: number;
  pendingIssues: number;
  orderNote: string;
  holdsCount: number;
  onCategory: (value: string) => void;
  onSearch: (value: string) => void;
  onSearchOpen: (value: boolean) => void;
  onAdd: (product: Product) => void;
  onConfigure: (product: Product, item?: CartItem, mode?: 'quick' | 'full') => void;
  onQuantity: (itemId: string, quantity: number) => void;
  onRemove: (itemId: string) => void;
  onNote: (value: string) => void;
  onHold: () => void;
  onCheckout: () => void;
}) {
  return <section className="v2-order-layout">
    <aside className="v2-cart">
      <header><div><strong>目前訂單</strong><span>{props.cartQty}件</span></div><b className={props.pendingIssues ? 'warning' : 'success'}>{props.pendingIssues ? `待整理${props.pendingIssues}` : '可結帳'}</b></header>
      <div className="v2-cart-list">{props.cart.length ? props.cart.map((item, index) => { const product = props.products[item.productId]; return <article key={item.id} className={item.pendingIssues.length ? 'issue' : ''}>
        <i>{index + 1}</i>
        <button className="v2-cart-copy" onClick={() => product && props.onConfigure(product, item, 'quick')}><span><strong>{product?.code} {product?.name}</strong><b>HK${item.estimatedUnitPrice * item.quantity}</b></span><small>{item.summary || '單點'}{item.pendingIssues.length ? ` · 待補${item.pendingIssues.length}` : ''}</small></button>
        <div className="v2-cart-actions"><button onClick={() => props.onQuantity(item.id, item.quantity - 1)}>−</button><span>{item.quantity}</span><button onClick={() => props.onQuantity(item.id, item.quantity + 1)}>＋</button><button onClick={() => product && props.onConfigure(product, item, 'quick')}>改</button><button className="danger" onClick={() => props.onRemove(item.id)}>刪</button></div>
      </article>; }) : <Empty title="未有餐點" text="由右邊選擇商品" />}</div>
      <div className="v2-task-strip"><span>Required <b className={props.pendingIssues ? 'warning' : 'success'}>{props.pendingIssues ? '未完成' : '完成'}</b></span><span>Pool <b>—</b></span><span>Link Up <b>—</b></span></div>
      <label className="v2-order-note"><span>備註</span><input value={props.orderNote} onChange={(event) => props.onNote(event.target.value)} placeholder="客人趕時間、分開包裝…" /></label>
      <footer><button className="secondary" onClick={props.onHold}>{props.cart.length ? '暫存' : `取單${props.holdsCount ? ` ${props.holdsCount}` : ''}`}</button><div><span>{props.cart.length}項｜{props.cartQty}件</span><strong>HK${props.total}</strong></div><button className="primary" disabled={!props.cart.length} onClick={props.onCheckout}>{props.pendingIssues ? '先整理' : `結帳 $${props.total}`}</button></footer>
    </aside>

    <section className="v2-catalog">
      <div className={`v2-category-matrix ${props.searchOpen ? 'searching' : ''}`}>
        {props.searchOpen ? <div className="v2-search-overlay"><span>⌕</span><input autoFocus value={props.search} onChange={(event) => props.onSearch(event.target.value)} placeholder="搜尋商品名稱或編號" /><button onClick={() => { props.onSearch(''); props.onSearchOpen(false); }}>×</button></div> : props.categorySlots.map((slot, index) => slot ? <button key={`${slot}-${index}`} className={`${props.category === slot ? 'active' : ''} ${slot === '搜尋' ? 'search-cell' : ''}`} onClick={() => slot === '搜尋' ? props.onSearchOpen(true) : props.onCategory(slot)}>{slot}</button> : <span key={`blank-${index}`} />)}
      </div>
      <div className="v2-product-grid">{props.visibleProducts.map((product) => { const qty = props.cart.filter((item) => item.productId === product.id).reduce((sum, item) => sum + item.quantity, 0); return <article key={product.id} className={product.availability !== 'available' ? 'stopped' : ''}>
        <button className="v2-product-main" disabled={product.availability !== 'available'} onClick={() => props.onAdd(product)}><div>{product.imageUrl ? <img src={product.imageUrl} alt="" /> : <b>{product.code}</b>}</div><strong>{product.name}</strong><span>HK${product.price}</span>{product.availability !== 'available' ? <em>{product.availability === 'permanently_disabled' ? '永久停售' : '今日售罄'}</em> : null}</button>
        <button className="v2-product-more" onClick={() => props.onConfigure(product, undefined, 'full')}>⋯</button>{qty ? <i>{qty}</i> : null}
      </article>; })}</div>
      <div className="v2-quick-drinks">{props.quickDrinks.map((drink) => <button key={drink.id} disabled={drink.availability !== 'available'} onClick={() => props.onAdd(drink)}><strong>{drink.code}</strong><span>{drink.name}</span></button>)}</div>
    </section>
  </section>;
}

function OrdersSurface({ submissions, activeOrders, historyOrders, tab, now, extensions, onTab, onAccept, onReprint, onExtend }: {
  submissions: NetworkOrder[];
  activeOrders: NetworkOrder[];
  historyOrders: NetworkOrder[];
  tab: 'active' | 'history';
  now: number;
  extensions: Record<string, number>;
  onTab: (tab: 'active' | 'history') => void;
  onAccept: (order: NetworkOrder) => void;
  onReprint: (order: NetworkOrder) => void;
  onExtend: (id: string, minutes: number) => void;
}) {
  return <section className="v2-page"><header><div><h1>訂單</h1><p>新Submission同正式訂單分開；正式訂單30分鐘後自動完成。</p></div><div className="v2-segment"><button className={tab === 'active' ? 'active' : ''} onClick={() => onTab('active')}>進行中</button><button className={tab === 'history' ? 'active' : ''} onClick={() => onTab('history')}>歷史</button></div></header>
    {tab === 'active' ? <div className="v2-orders-layout"><aside><h2>新Submission <b>{submissions.length}</b></h2>{submissions.map((order) => <OrderCard key={order.id} order={order} now={now} action={<button onClick={() => onAccept(order)}>接受正式成單</button>} />)}{!submissions.length ? <Empty title="暫時沒有新單" text="App／Web新單會先喺度出現" /> : null}</aside><section><h2>正式進行中 <b>{activeOrders.length}</b></h2><div className="v2-order-grid">{activeOrders.map((order) => { const timing = getOperationalTiming(order, now, extensions[order.id] || 0); return <OrderCard key={order.id} order={order} now={now} extensionMinutes={extensions[order.id] || 0} action={<><button onClick={() => onReprint(order)}>查看／重印</button>{timing.isFinalFiveMinutes ? <button className="secondary" onClick={() => onExtend(order.id, 10)}>延長10分鐘</button> : null}</>} />; })}</div></section></div> : <div className="v2-order-grid history">{historyOrders.map((order) => <OrderCard key={order.id} order={order} now={now} extensionMinutes={extensions[order.id] || 0} />)}{!historyOrders.length ? <Empty title="未有歷史訂單" text="完成或取消訂單會顯示喺度" /> : null}</div>}
  </section>;
}

function OrderCard({ order, now, extensionMinutes = 0, action }: { order: NetworkOrder; now: number; extensionMinutes?: number; action?: ReactNode }) {
  const timing = getOperationalTiming(order, now, extensionMinutes);
  const payment = stringValue(order.raw.payment_status || order.raw.paymentStatus, '未分類');
  const print = stringValue(order.raw.print_status || order.raw.printStatus, '待接入');
  const sync = stringValue(order.raw.sync_status || order.raw.syncStatus, order.raw.demo ? '本機' : '待確認');
  return <article className={`v2-order-card status-${order.status}`}><header><strong>{order.orderNo}</strong><span>{sourceLabel(order.source)}</span></header><p>{order.itemCount}件 · {timing.elapsedMinutes}分鐘</p><div className="v2-order-flags"><span>付款 {payment}</span><span>打印 {print}</span><span>同步 {sync}</span></div><div className="v2-order-bottom"><b>HK${order.total}</b><strong className={timing.isFinalFiveMinutes ? 'warning' : ''}>{order.status === 'pending' ? '待接受' : timing.isExpired ? '已到30分鐘' : `餘${timing.remainingMinutes}分鐘`}</strong></div>{action ? <footer>{action}</footer> : null}</article>;
}

function DineInSurface({ tables, holdsCount, selectedIndex, onSelect, onStart, onRetrieve }: { tables: TableSession[]; holdsCount: number; selectedIndex?: number; onSelect: (index?: number) => void; onStart: (table: TableSession) => void; onRetrieve: () => void }) {
  const selected = selectedIndex === undefined ? undefined : tables[selectedIndex];
  return <section className="v2-page"><header><div><h1>堂食</h1><p>左側枱單摘要；右側固定3×3九宮格；候位區固定喺九宮格下方。</p></div><span>使用中 {tables.filter((table) => table.status === 'occupied').length}枱</span></header><div className="v2-dine-layout">
    <aside><h2>枱單／暫存</h2>{tables.map((table, index) => table.status !== 'vacant' ? <button key={table.id} onClick={() => onSelect(index)}><strong>{displayTableName(index)}</strong><span>{minutesSince(table.openedAt)}分鐘</span><b>HK${unpaidTotal(table)}</b></button> : null)}<button className="retrieve" onClick={onRetrieve}><strong>取回暫存單</strong><span>{holdsCount}張</span></button></aside>
    <section className="v2-dine-work">{selected ? <TablePanel table={selected} displayName={displayTableName(selectedIndex || 0)} onBack={() => onSelect(undefined)} onStart={() => onStart(selected)} /> : <div className="v2-table-grid">{tables.slice(0, 9).map((table, index) => <button key={table.id} className={table.status} onClick={() => onSelect(index)}><span>{displayTableName(index)}</span><strong>{table.status === 'vacant' ? '空枱' : table.status === 'reserved' ? '預留' : '使用中'}</strong><small>{table.openedAt ? `${minutesSince(table.openedAt)}分鐘` : '—'}</small><b>HK${unpaidTotal(table)}</b></button>)}</div>}<div className="v2-waiting-strip"><div><strong>候位堂食工作區</strong><span>暫未有候位</span></div><button>新增候位</button></div></section>
  </div></section>;
}

function TablePanel({ table, displayName, onBack, onStart }: { table: TableSession; displayName: string; onBack: () => void; onStart: () => void }) {
  return <div className="v2-table-panel"><header><button onClick={onBack}>← 九宮格</button><div><h2>{displayName}</h2><p>{table.status === 'vacant' ? '空枱，確認後先開始堂食點單' : `使用${minutesSince(table.openedAt)}分鐘 · 未付HK$${unpaidTotal(table)}`}</p></div></header><div>{table.lineItems.length ? table.lineItems.map((line) => <article key={line.id}><span>{line.label}</span><b>HK${line.amount}</b><em>{line.paid ? '已付' : '未付'}</em></article>) : <Empty title="未有餐點" text="先確認枱號，再進入堂食點單" />}</div><footer>{table.status === 'vacant' ? <button className="primary" onClick={onStart}>開始堂食點單</button> : <><button onClick={onStart}>加單</button><button className="primary">結帳</button><button>更多</button></>}</footer></div>;
}

function SoldOutSurface({ products, selected, search, filter, onSearch, onFilter, onToggle, onSelectAll, onClear, onAvailability }: { products: Product[]; selected: string[]; search: string; filter: 'all' | 'zimi'; onSearch: (value: string) => void; onFilter: (value: 'all' | 'zimi') => void; onToggle: (id: string) => void; onSelectAll: () => void; onClear: () => void; onAvailability: (availability: ProductAvailability) => void }) {
  return <section className="v2-page"><header><div><h1>售罄管理</h1><p>三個明確操作；即日售罄05:00恢復，永久停售需人工恢復。</p></div><span>已選 {selected.length}項</span></header><div className="v2-sold-layout"><div className="v2-sold-toolbar"><input value={search} onChange={(event) => onSearch(event.target.value)} placeholder="搜尋商品" /><button className={filter === 'all' ? 'active' : ''} onClick={() => onFilter('all')}>全部</button><button className={filter === 'zimi' ? 'active' : ''} onClick={() => onFilter('zimi')}>紫米專用</button><button onClick={onSelectAll}>全選結果</button><button onClick={onClear}>取消</button><button className="warning" onClick={() => onAvailability('sold_out')}>今日售罄</button><button className="danger" onClick={() => onAvailability('permanently_disabled')}>永久停售</button><button className="success" onClick={() => onAvailability('available')}>恢復供應</button></div><div className="v2-sold-grid">{products.map((product) => <button key={product.id} className={`${product.availability !== 'available' ? 'stopped' : ''} ${selected.includes(product.id) ? 'selected' : ''}`} onClick={() => onToggle(product.id)}><strong>{product.code} {product.name}</strong><span>{product.availability === 'available' ? '可售' : product.availability === 'permanently_disabled' ? '永久停售' : '今日售罄'}</span><small>{product.availability === 'permanently_disabled' ? '預覽本機保存' : '本機即時生效 · 雲端待接入'}</small></button>)}</div></div></section>;
}

function MoreSurface({ appearance, deviceNumber, onQuick, onTheme, onStatus, onReprint }: { appearance: ReturnType<typeof getSmtAppearance>; deviceNumber: string; onQuick: () => void; onTheme: (theme: SmtThemeId | 'auto_daily') => void; onStatus: () => void; onReprint: () => void }) {
  return <section className="v2-page"><header><div><h1>更多</h1><p>顯示、營運、設備、資料及維護。</p></div><span>{deviceNumber}</span></header><div className="v2-more-groups"><section><h2>操作顯示</h2><button className={appearance.quickMode ? 'active' : ''} onClick={onQuick}><strong>快速模式</strong><span>{appearance.quickMode ? '已開啟' : '已關閉'}</span></button></section><section><h2>主題</h2><button className={appearance.themeMode === 'auto_daily' ? 'active' : ''} onClick={() => onTheme('auto_daily')}><strong>每日自動輪換</strong><span>05:00營業日邊界</span></button>{THEMES.map(([id, label]) => <button key={id} className={appearance.theme === id && appearance.themeMode === 'manual' ? 'active' : ''} onClick={() => onTheme(id)}><strong>{label}</strong><span>{id}</span></button>)}</section><section><h2>營運與維護</h2><button onClick={onStatus}><strong>全局狀態中心</strong><span>連線、打印、同步、售罄</span></button><button onClick={onReprint}><strong>設備與重印</strong><span>打印工作管理</span></button><button disabled><strong>備份／恢復</strong><span>後續正式接入</span></button><button disabled><strong>退出Kiosk</strong><span>正式APK提供</span></button></section></div></section>;
}

function StatusDrawer({ health, mode, onClose }: { health: ReturnType<typeof useSmtController>['health']; mode: string; onClose: () => void }) {
  return <aside className="v2-status-drawer"><header><div><h2>全局狀態中心</h2><p>{health.lastMessage}</p></div><button onClick={onClose}>×</button></header><section><StatusRow label="本機資料" value="安全" tone="success" /><StatusRow label="Firebase／網絡" value={health.realtime === 'online' ? '正常' : '離線可工作'} tone={health.realtime === 'online' ? 'success' : 'warning'} /><StatusRow label="打印" value="待接入打印服務" tone="warning" /><StatusRow label="同步Outbox" value={health.realtime === 'online' ? '0項' : '離線累積中'} tone={health.realtime === 'online' ? 'success' : 'warning'} /><StatusRow label="售罄同步" value={mode === 'demo' ? 'Demo本機' : '本機即時生效'} tone="info" /><StatusRow label="付款待核實" value="0項" tone="info" /></section></aside>;
}

function SimplePage({ title, subtitle, count, children }: { title: string; subtitle: string; count?: string; children: ReactNode }) { return <section className="v2-page"><header><div><h1>{title}</h1><p>{subtitle}</p></div>{count ? <span>{count}</span> : null}</header>{children}</section>; }
function Empty({ title, text }: { title: string; text: string }) { return <div className="v2-empty"><strong>{title}</strong><p>{text}</p></div>; }
function StatusRow({ label, value, tone }: { label: string; value: string; tone: string }) { return <div className="v2-status-row"><span>{label}</span><b className={tone}>{value}</b></div>; }
function minutesSince(value?: string) { return value ? Math.max(0, Math.floor((Date.now() - new Date(value).getTime()) / 60_000)) : 0; }
function unpaidTotal(table: TableSession) { return table.lineItems.filter((line) => !line.paid).reduce((sum, line) => sum + line.amount, 0); }
function sourceLabel(source: string) { return ({ walk_in: '現場外賣', phone: '電話', whatsapp: 'WhatsApp', customer_web: '網站', customer_app: 'App', keeta: 'Keeta', foodpanda: 'Foodpanda', smt: '現場外賣' } as Record<string, string>)[source] || source; }
function stringValue(value: unknown, fallback: string) { const text = String(value || '').trim(); return text || fallback; }
function loadLocal<T>(key: string, fallback: T): T { try { const value = localStorage.getItem(key); return value ? JSON.parse(value) as T : fallback; } catch { return fallback; } }
function saveLocal(key: string, value: unknown) { try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* preview storage can be unavailable */ } }
