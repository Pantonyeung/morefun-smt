import { useMemo, useState } from 'react';
import { requiresConfiguration } from './domain/businessRules';
import type { CartItem, NetworkOrder, PaymentMethod, Product, TableSession, ViewKey } from './domain/types';
import { useSmtController } from './hooks/useSmtController';
import { LoginScreen } from './components/LoginScreen';
import { ProductConfigurator } from './components/ProductConfigurator';
import { OperationsCheckout } from './components/OperationsCheckout';
import { getSmtAppearance, setSmtQuickMode, setSmtTheme, type SmtThemeId } from './themeRuntime';

const NAV: Array<{ key: ViewKey; label: string; glyph: string }> = [
  { key: 'order', label: '點單', glyph: '點' },
  { key: 'workbench', label: '訂單', glyph: '單' },
  { key: 'dinein', label: '堂食', glyph: '桌' },
  { key: 'soldout', label: '售罄', glyph: '售' },
  { key: 'more', label: '更多', glyph: '多' },
];

const THEME_LABELS: Array<[SmtThemeId, string]> = [
  ['sunrise', '暖陽'], ['rice', '米白'], ['zimi', '紫米'], ['moss', '青苔'], ['ocean', '海藍'], ['night', '夜色'],
];

export default function LockedOperationsApp() {
  const controller = useSmtController();
  const { config, configErrors, device, user, health, products, categories, cart, total, cartQty, pendingIssues, source, orderNote, holds, tables, networkOrders, toast, busyKey, view } = controller;
  const { actions } = controller;
  const [category, setCategory] = useState('全部');
  const [search, setSearch] = useState('');
  const [configuring, setConfiguring] = useState<{ product: Product; item?: CartItem }>();
  const [checkout, setCheckout] = useState(false);
  const [statusOpen, setStatusOpen] = useState(false);
  const [selectedTable, setSelectedTable] = useState<TableSession>();
  const [orderTab, setOrderTab] = useState<'active' | 'history'>('active');
  const [soldSearch, setSoldSearch] = useState('');
  const [selectedSold, setSelectedSold] = useState<string[]>([]);
  const [appearance, setAppearance] = useState(() => getSmtAppearance());

  const visibleProducts = useMemo(() => Object.values(products).filter((product) => {
    if (category !== '全部' && product.category !== category) return false;
    const q = search.trim().toLowerCase();
    return !q || `${product.code} ${product.name} ${product.category}`.toLowerCase().includes(q);
  }), [products, category, search]);

  const quickDrinks = useMemo(() => Object.values(products).filter((product) => product.ruleKind === 'drink').slice(0, 12), [products]);
  const submissions = useMemo(() => networkOrders.filter((order) => order.status === 'pending'), [networkOrders]);
  const activeOrders = useMemo(() => networkOrders.filter((order) => ['accepted', 'preparing', 'ready', 'abnormal'].includes(order.status)), [networkOrders]);
  const historyOrders = useMemo(() => networkOrders.filter((order) => ['completed', 'cancelled'].includes(order.status)), [networkOrders]);
  const soldProducts = useMemo(() => Object.values(products).filter((product) => `${product.code} ${product.name}`.toLowerCase().includes(soldSearch.trim().toLowerCase())), [products, soldSearch]);

  if (config.mode !== 'demo' && (!user || health.auth === 'signed_out')) return <LoginScreen mode={config.mode} configErrors={configErrors} busy={busyKey === 'login'} onLogin={actions.login} onSetMode={actions.setRuntimeMode} />;
  if (config.mode !== 'demo' && health.auth === 'forbidden') return <main className="login-page"><section className="login-card"><strong>此帳戶未獲 SMT 權限</strong><button className="button primary" onClick={() => void actions.logout()}>登出</button></section></main>;

  const configureProduct = (product: Product, item?: CartItem) => setConfiguring({ product, item });
  const addProduct = (product: Product) => { if (requiresConfiguration(product) || !actions.quickAdd(product)) configureProduct(product); };
  const toggleQuickMode = () => { const next = !appearance.quickMode; setSmtQuickMode(next); setAppearance(getSmtAppearance()); };
  const chooseTheme = (theme: SmtThemeId | 'auto_daily') => { setSmtTheme(theme); setAppearance(getSmtAppearance()); };
  const navBadge = (key: ViewKey) => key === 'workbench' ? submissions.length + controller.abnormalCount : key === 'dinein' ? controller.occupiedTables : key === 'soldout' ? controller.soldOutCount : 0;

  return <div className="locked-app">
    <header className="locked-topbar">
      <button className="locked-brand" onClick={() => actions.setView('more')}><strong>磨飯</strong><span>SMT</span></button>
      <button className="status-chip success" onClick={() => setStatusOpen(true)}>營業中</button>
      <button className={`status-chip ${health.realtime === 'online' ? 'success' : 'warning'}`} onClick={() => setStatusOpen(true)}>{health.realtime === 'online' ? '系統正常' : '離線可工作'}</button>
      <button className={`status-chip ${appearance.quickMode ? 'active' : ''}`} onClick={toggleQuickMode}>快速模式 {appearance.quickMode ? '開' : '關'}</button>
      <button className="status-chip" onClick={() => setStatusOpen(true)}>打印／同步</button>
      <button className="locked-new" onClick={() => actions.setView('workbench')}>新單 <b>{submissions.length}</b></button>
      <time>{new Date().toLocaleTimeString('zh-HK', { hour: '2-digit', minute: '2-digit' })}</time>
    </header>

    <main className="locked-main">
      {view === 'order' ? <section className="locked-order-layout">
        <aside className="locked-cart">
          <header><div><strong>目前訂單</strong><span>{cartQty} 件</span></div><span className={pendingIssues.length ? 'needs' : 'ready'}>{pendingIssues.length ? `待整理 ${pendingIssues.length}` : '可結帳'}</span></header>
          <div className="locked-cart-list">{cart.length ? cart.map((item, index) => { const product = products[item.productId]; return <article key={item.id} className={item.pendingIssues.length ? 'issue' : ''}>
            <i>{index + 1}</i><div className="cart-copy"><div><strong>{product?.code} {product?.name}</strong><b>HK${item.estimatedUnitPrice * item.quantity}</b></div><p>{item.summary || '單點'}{item.pendingIssues.length ? ` · 待補 ${item.pendingIssues.length}` : ''}</p></div>
            <div className="cart-actions"><button onClick={() => actions.updateQuantity(item.id, item.quantity - 1)}>−</button><span>{item.quantity}</span><button onClick={() => actions.updateQuantity(item.id, item.quantity + 1)}>＋</button><button onClick={() => product && configureProduct(product, item)}>修改</button><button className="danger" onClick={() => actions.removeItem(item.id)}>刪</button></div>
          </article>; }) : <Empty title="未有餐點" text="由右邊選擇商品" />}</div>
          <section className="cart-status-row"><span>Required <b>{pendingIssues.length ? '未完成' : '完成'}</b></span><span>Pool <b>正常</b></span><span>Link Up <b>正常</b></span></section>
          <label className="locked-note"><span>備註</span><input value={orderNote} onChange={(event) => actions.setOrderNote(event.target.value)} placeholder="客人趕時間、分開包裝、到店致電…" /></label>
          <footer>
            <button className="hold-button" onClick={() => cart.length ? actions.holdCurrent() : actions.setView('hold')}>{cart.length ? '暫存' : `取單${holds.length ? ` ${holds.length}` : ''}`}</button>
            <div><span>{cart.length} 項｜{cartQty} 件</span><strong>HK${total}</strong></div>
            <button className="checkout-button" disabled={!cart.length} onClick={() => pendingIssues.length ? actions.setView('pending') : setCheckout(true)}>{pendingIssues.length ? '先整理' : `結帳 HK$${total}`}</button>
          </footer>
        </aside>

        <section className="locked-catalog">
          <div className="catalog-search"><span>⌕</span><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="搜尋商品名稱或編號" /><small>{visibleProducts.length} 項</small></div>
          <div className="locked-categories"><button className={category === '全部' ? 'active' : ''} onClick={() => setCategory('全部')}>全部</button>{categories.slice(0, 12).map((item) => <button key={item} className={category === item ? 'active' : ''} onClick={() => setCategory(item)}>{item}</button>)}<button onClick={() => setCategory('全部')}>更多</button><button className="search-slot">搜尋</button></div>
          <div className="locked-products">{visibleProducts.map((product) => <article key={product.id} className={product.availability !== 'available' ? 'sold' : ''}>
            <button className="product-main" disabled={product.availability !== 'available'} onClick={() => addProduct(product)}><div className="product-art">{product.imageUrl ? <img src={product.imageUrl} alt="" /> : <b>{product.code}</b>}</div><strong>{product.name}</strong><span>HK${product.price}</span>{product.availability !== 'available' ? <em>今日售罄</em> : null}</button>
            <button className="product-more" onClick={() => configureProduct(product)} aria-label={`設定 ${product.name}`}>⋯</button>
            {cart.filter((item) => item.productId === product.id).reduce((sum, item) => sum + item.quantity, 0) ? <i className="product-count">{cart.filter((item) => item.productId === product.id).reduce((sum, item) => sum + item.quantity, 0)}</i> : null}
          </article>)}</div>
          <div className="quick-drinks">{quickDrinks.map((drink) => <button key={drink.id} disabled={drink.availability !== 'available'} onClick={() => addProduct(drink)}><strong>{drink.code}</strong><span>{drink.name}</span></button>)}</div>
        </section>
      </section> : null}

      {view === 'workbench' ? <section className="locked-page order-page">
        <header><div><h1>訂單</h1><p>Submission接受後建立正式訂單；正式訂單30分鐘後自動移入歷史。</p></div><div className="segmented"><button className={orderTab === 'active' ? 'active' : ''} onClick={() => setOrderTab('active')}>進行中</button><button className={orderTab === 'history' ? 'active' : ''} onClick={() => setOrderTab('history')}>歷史</button></div></header>
        {orderTab === 'active' ? <div className="orders-workspace"><aside><h2>新Submission <b>{submissions.length}</b></h2>{submissions.map((order) => <OrderCard key={order.id} order={order} action={<button onClick={() => void actions.acceptOrder(order)}>接受並建立正式單</button>} />)}{!submissions.length ? <Empty title="暫時沒有新單" text="新App／Web單會在此出現" /> : null}</aside><section><h2>正式進行中 <b>{activeOrders.length}</b></h2><div className="active-order-grid">{activeOrders.map((order) => <OrderCard key={order.id} order={order} action={<button onClick={() => void actions.requestReprint(order.id, '訂單頁查看／重印')}>查看／重印</button>} />)}</div></section></div> : <div className="history-grid">{historyOrders.map((order) => <OrderCard key={order.id} order={order} />)}{!historyOrders.length ? <Empty title="未有歷史訂單" text="完成或取消訂單會顯示喺度" /> : null}</div>}
      </section> : null}

      {view === 'dinein' ? <section className="locked-page dinein-page"><header><div><h1>堂食</h1><p>固定3×3枱位；35分鐘提醒獨立於訂單30分鐘完成。</p></div><span>使用中 {controller.occupiedTables} 枱</span></header><div className="dinein-layout"><aside><h2>枱單／輪候</h2>{tables.filter((table) => table.status !== 'vacant').map((table) => <button key={table.id} onClick={() => setSelectedTable(table)}><strong>{table.tableName}</strong><span>{minutesSince(table.openedAt)} 分鐘</span><b>HK${unpaidTotal(table)}</b></button>)}<section className="waiting-area"><strong>候位工作區</strong><p>暫未有候位</p></section></aside><section>{selectedTable ? <TableDetail table={selectedTable} onBack={() => setSelectedTable(undefined)} onAdd={() => actions.openTable(selectedTable)} /> : <div className="table-grid-lock">{tables.slice(0, 9).map((table, index) => <button key={table.id} className={table.status} onClick={() => table.status === 'vacant' ? actions.openTable(table) : setSelectedTable(table)}><span>{index === 8 ? '外1' : `堂${index + 1}`}</span><strong>{table.status === 'vacant' ? '空枱' : table.status === 'reserved' ? '預留' : '使用中'}</strong><small>{table.openedAt ? `${minutesSince(table.openedAt)}分鐘` : '—'}</small><b>HK${unpaidTotal(table)}</b></button>)}</div>}</section></div></section> : null}

      {view === 'soldout' ? <section className="locked-page soldout-page"><header><div><h1>售罄管理</h1><p>即日售罄05:00恢復；永久停用不會自動恢復。</p></div><span>{controller.soldOutCount} 項停止</span></header><div className="sold-toolbar"><input value={soldSearch} onChange={(event) => setSoldSearch(event.target.value)} placeholder="搜尋商品" /><button onClick={() => setSelectedSold(soldProducts.map((product) => product.id))}>全選</button><button onClick={() => setSelectedSold([])}>取消選取</button><button className="primary" onClick={() => selectedSold.forEach((id) => actions.toggleSoldOut(id))}>切換供應狀態</button></div><div className="sold-grid-lock">{soldProducts.map((product) => <button key={product.id} className={`${product.availability !== 'available' ? 'stopped' : ''} ${selectedSold.includes(product.id) ? 'selected' : ''}`} onClick={() => setSelectedSold((current) => current.includes(product.id) ? current.filter((id) => id !== product.id) : [...current, product.id])}><strong>{product.code} {product.name}</strong><span>{product.availability === 'available' ? '可售' : product.availability === 'permanently_disabled' ? '永久停用' : '今日售罄'}</span><small>本機已生效 · 雲端待同步</small></button>)}</div></section> : null}

      {view === 'hold' ? <section className="locked-page"><header><div><h1>取回暫存單</h1><p>暫存不派流水、不付款、不打印。</p></div><span>{holds.length} 張</span></header><div className="hold-grid-lock">{holds.map((hold) => <article key={hold.id}><strong>{hold.title}</strong><span>{hold.draft.items.length} 項</span><b>HK${hold.draft.items.reduce((sum, item) => sum + item.estimatedUnitPrice * item.quantity, 0)}</b><button onClick={() => actions.restoreHold(hold)}>取回</button><button className="danger" onClick={() => actions.deleteHold(hold.id)}>刪除</button></article>)}</div></section> : null}

      {view === 'pending' ? <section className="locked-page"><header><div><h1>先整理</h1><p>完成Required後先可以正式結帳。</p></div><span>{pendingIssues.length} 項</span></header><div className="pending-grid-lock">{cart.filter((item) => item.pendingIssues.length).map((item) => { const product = products[item.productId]; return <article key={item.id}><strong>{product?.code} {product?.name}</strong>{item.pendingIssues.map((issue) => <p key={`${issue.kind}-${issue.message}`}>{issue.message}</p>)}<button onClick={() => product && configureProduct(product, item)}>處理選項</button></article>; })}</div></section> : null}

      {view === 'more' ? <section className="locked-page more-page"><header><div><h1>更多</h1><p>顯示、營運、設備、資料及維護。</p></div><span>{device.deviceNumber}</span></header><div className="more-groups"><section><h2>操作顯示</h2><button className={appearance.quickMode ? 'active' : ''} onClick={toggleQuickMode}><strong>快速模式</strong><span>{appearance.quickMode ? '已開啟' : '已關閉'}</span></button></section><section><h2>主題</h2><button className={appearance.themeMode === 'auto_daily' ? 'active' : ''} onClick={() => chooseTheme('auto_daily')}><strong>每日自動輪換</strong><span>05:00營業日邊界</span></button>{THEME_LABELS.map(([id, label]) => <button key={id} className={appearance.theme === id && appearance.themeMode === 'manual' ? 'active' : ''} onClick={() => chooseTheme(id)}><strong>{label}</strong><span>{id}</span></button>)}</section><section><h2>營運與維護</h2><button onClick={() => setStatusOpen(true)}><strong>全局狀態中心</strong><span>連線、打印、同步、售罄</span></button><button onClick={() => actions.setView('reprint')}><strong>設備與重印</strong><span>打印工作管理</span></button><button disabled><strong>備份／恢復</strong><span>下一階段接入</span></button><button disabled><strong>退出Kiosk</strong><span>正式APK提供</span></button></section></div></section> : null}

      {view === 'reprint' ? <section className="locked-page"><header><div><h1>設備與重印</h1><p>打印健康及最近訂單。</p></div></header><div className="history-grid">{networkOrders.map((order) => <OrderCard key={order.id} order={order} action={<button onClick={() => void actions.requestReprint(order.id, '設備與重印')}>重印</button>} />)}</div></section> : null}
    </main>

    <nav className="locked-nav">{NAV.map((item) => { const badge = navBadge(item.key); return <button key={item.key} className={view === item.key ? 'active' : ''} onClick={() => actions.setView(item.key)}><span>{item.glyph}</span><strong>{item.label}</strong>{badge ? <em>{badge}</em> : null}</button>; })}</nav>

    {configuring ? <ProductConfigurator product={configuring.product} catalog={products} item={configuring.item} onClose={() => setConfiguring(undefined)} onSave={(selections, note, existingId) => { actions.addConfigured(configuring.product, selections, note, existingId); setConfiguring(undefined); }} /> : null}
    {checkout ? <OperationsCheckout items={cart} products={products} total={total} runtimeMode={config.mode} busy={busyKey === 'submit-order'} initialSource={source} onSource={actions.setSource} onClose={() => setCheckout(false)} onSubmit={(method: PaymentMethod) => actions.submitOrder(method).then(() => undefined)} /> : null}
    {statusOpen ? <aside className="status-drawer"><header><div><h2>全局狀態中心</h2><p>{health.lastMessage}</p></div><button onClick={() => setStatusOpen(false)}>×</button></header><section><StatusRow label="本機資料" value="安全" tone="success" /><StatusRow label="Firebase／網絡" value={health.realtime === 'online' ? '正常' : '離線可工作'} tone={health.realtime === 'online' ? 'success' : 'warning'} /><StatusRow label="打印" value="待接入打印服務" tone="warning" /><StatusRow label="同步Outbox" value={health.realtime === 'online' ? '0項' : '離線累積中'} tone={health.realtime === 'online' ? 'success' : 'warning'} /><StatusRow label="售罄同步" value="本機即時生效" tone="info" /><StatusRow label="付款待核實" value="0項" tone="info" /></section></aside> : null}
    {toast ? <button className={`toast toast-${toast.kind}`} onClick={actions.clearToast}>{toast.message}</button> : null}
  </div>;
}

function Empty({ title, text }: { title: string; text: string }) { return <div className="locked-empty"><strong>{title}</strong><p>{text}</p></div>; }
function minutesSince(value?: string) { return value ? Math.max(0, Math.floor((Date.now() - new Date(value).getTime()) / 60_000)) : 0; }
function unpaidTotal(table: TableSession) { return table.lineItems.filter((line) => !line.paid).reduce((sum, line) => sum + line.amount, 0); }
function sourceLabel(source: string) { return ({ walk_in: '現場外賣', phone: '電話', whatsapp: 'WhatsApp', customer_web: '網站', customer_app: 'App', keeta: 'Keeta', foodpanda: 'Foodpanda', smt: '現場外賣' } as Record<string, string>)[source] || source; }
function OrderCard({ order, action }: { order: NetworkOrder; action?: React.ReactNode }) { return <article className={`locked-order-card status-${order.status}`}><header><strong>{order.orderNo}</strong><span>{sourceLabel(order.source)}</span></header><p>{order.itemCount} 件 · {Math.max(0, Math.floor((Date.now() - new Date(order.createdAt).getTime()) / 60_000))} 分鐘</p><div><span>{order.status}</span><b>HK${order.total}</b></div>{action}</article>; }
function TableDetail({ table, onBack, onAdd }: { table: TableSession; onBack: () => void; onAdd: () => void }) { return <div className="table-detail-lock"><header><button onClick={onBack}>← 返回九宮格</button><div><h2>{table.tableName}</h2><p>使用 {minutesSince(table.openedAt)} 分鐘 · 未付 HK${unpaidTotal(table)}</p></div></header><div>{table.lineItems.map((line) => <article key={line.id}><span>{line.label}</span><b>HK${line.amount}</b><em>{line.paid ? '已付' : '未付'}</em></article>)}</div><footer><button onClick={onAdd}>加單</button><button className="primary">結帳</button><button>更多</button></footer></div>; }
function StatusRow({ label, value, tone }: { label: string; value: string; tone: string }) { return <div className="status-row"><span>{label}</span><b className={tone}>{value}</b></div>; }
