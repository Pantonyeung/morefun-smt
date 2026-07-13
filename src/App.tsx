import { useMemo, useState } from 'react';

type ViewKey = 'order' | 'hold' | 'pending' | 'dinein' | 'workbench' | 'search' | 'note' | 'soldout' | 'reprint' | 'more';
type Category = '平台餐' | '輕食' | '紫米套餐' | '紫米飯團' | '肉燥便當' | '特色便當' | '芝士薯角餐' | '小食炸物' | '飲品' | '外賣工具' | '甜品及炸物' | '咖喱便當';
type Product = { id:string; code:string; name:string; price:number; category:Category; soldOut?:boolean; mergeQty?:boolean; summary?:string };
type CartItem = { id:string; product:Product; qty:number; summary?:string; note?:string };
type Shortcut = { key:ViewKey; label:string; icon:string; badgeLeft?:number; badgeRight?:number; fixed?:boolean };

const categories: Category[] = ['平台餐','輕食','紫米套餐','紫米飯團','肉燥便當','特色便當','芝士薯角餐','小食炸物','飲品','外賣工具','甜品及炸物','咖喱便當'];
const products: Product[] = [
  { id:'p1', code:'F1', name:'招牌雞扒紫米飯團餐', price:51, category:'平台餐' },
  { id:'p2', code:'F2', name:'鹽燒鯖魚紫米飯團餐', price:50, category:'平台餐' },
  { id:'p3', code:'F3', name:'香煎豬扒紫米飯團餐', price:52, category:'平台餐' },
  { id:'p4', code:'F4', name:'韓式燒牛紫米飯團餐', price:53, category:'平台餐' },
  { id:'p5', code:'F5', name:'照燒雞肉紫米飯團餐', price:49, category:'平台餐' },
  { id:'p6', code:'F6', name:'天神炸雞紫米飯團餐', price:50, category:'平台餐' },
  { id:'p7', code:'F7', name:'麻辣雞絲紫米飯團餐', price:50, category:'平台餐' },
  { id:'p8', code:'F8', name:'香煎三文魚紫米飯團餐', price:59, category:'平台餐' },
  { id:'p9', code:'12', name:'古早鹽酥雞肉燥飯', price:52, category:'肉燥便當', mergeQty:false, summary:'飯底：肉燥飯' },
  { id:'p10', code:'C12', name:'古早鹽酥雞咖喱飯', price:52, category:'咖喱便當', mergeQty:false, summary:'飯底：咖喱飯' },
  { id:'p11', code:'V12', name:'古早鹽酥雞菜飯', price:52, category:'特色便當', mergeQty:false, summary:'飯底：菜飯' },
  { id:'p12', code:'S1', name:'紫米能量沙律', price:48, category:'輕食', summary:'醬汁：不需要' },
  { id:'p13', code:'S01', name:'薯角', price:18, category:'小食炸物', soldOut:true },
  { id:'p14', code:'D01', name:'台式奶茶', price:18, category:'飲品' },
];

const shortcuts: Shortcut[] = [
  { key:'hold', label:'掛單／取單', icon:'▤', badgeLeft:3, fixed:true },
  { key:'pending', label:'待補／重組', icon:'♨', badgeLeft:2, fixed:true },
  { key:'dinein', label:'堂食', icon:'♧', badgeLeft:5, fixed:true },
  { key:'workbench', label:'工作台', icon:'▦', badgeLeft:3, badgeRight:1, fixed:true },
  { key:'search', label:'全店快找', icon:'⌕' },
  { key:'note', label:'整單備註', icon:'▧' },
  { key:'soldout', label:'售罄', icon:'▱', badgeRight:1 },
  { key:'reprint', label:'重印', icon:'▣' },
  { key:'more', label:'更多入口', icon:'›' },
];

const holdOrders = [
  ['SMT 暫存01','4件','$168','3分鐘前'], ['SMM 暫存02','2件','$93','8分鐘前'], ['SMT 暫存03','6件','$252','12分鐘前'],
];
const pendingOrders = [
  ['#0127','F4 飯團＋薯角','待補飲品'], ['#0125','C12 咖喱飯','飯底售罄'], ['#0122','紫米沙律','醬汁失效'],
];
const workOrders = [
  ['網站','#W-1048','待確認','$126'], ['App','#A-2203','已接單','$89'], ['Foodpanda','#FP-771','待取','$214'], ['電話','#T-019','異常','$67'],
];
const printOrders = [['#0128','收據／廚房單／標籤'],['#0127','廚房單'],['#0125','標籤'],['#0122','收據']];

export default function App() {
  const [view, setView] = useState<ViewKey>('order');
  const [activeCategory, setActiveCategory] = useState<Category>('平台餐');
  const [cart, setCart] = useState<CartItem[]>([
    { id:'c1', product:products[0], qty:1, summary:'小食：薯角 · 待選飲品' },
    { id:'c2', product:products[8], qty:1, summary:'飯底：肉燥飯' },
    { id:'c3', product:products[11], qty:1, summary:'醬汁：不需要' },
  ]);
  const [detailItem, setDetailItem] = useState<CartItem | null>(null);
  const [shortcutPage, setShortcutPage] = useState(0);
  const [orderNote, setOrderNote] = useState('');
  const [searchText, setSearchText] = useState('');

  const visibleProducts = useMemo(() => products.filter(p => p.category === activeCategory && !p.soldOut), [activeCategory]);
  const soldOutProducts = products.filter(p => p.soldOut);
  const totalQty = cart.reduce((sum,item) => sum + item.qty, 0);
  const total = cart.reduce((sum,item) => sum + item.product.price * item.qty, 0);
  const pageShortcuts = shortcuts.slice(shortcutPage * 8, shortcutPage * 8 + 8);

  const addProduct = (product:Product) => {
    if (product.soldOut) return;
    setCart(current => [...current, { id:`c-${Date.now()}`, product, qty:1, summary:product.summary }]);
  };
  const updateQty = (id:string, delta:number) => setCart(current => current.map(item => item.id === id ? { ...item, qty:Math.max(1,item.qty + delta) } : item));
  const renderBadge = (value?:number, side:'left'|'right'='left') => value !== undefined ? <i className={`badge badge-${side}`}>{value}</i> : null;

  const renderOperationalView = () => {
    if (view === 'hold') return <Panel title="掛單／取單" subtitle="暫存訂單可一按恢復"><div className="list-grid">{holdOrders.map(row => <ListCard key={row[0]} title={row[0]} meta={`${row[1]} · ${row[3]}`} value={row[2]} action="恢復" />)}</div></Panel>;
    if (view === 'pending') return <Panel title="待補／重組" subtitle="正式結帳前集中處理"><div className="list-grid">{pendingOrders.map(row => <ListCard key={row[0]} title={`${row[0]} · ${row[1]}`} meta={row[2]} action="處理" tone="warn" />)}</div></Panel>;
    if (view === 'dinein') return <Panel title="堂食" subtitle="1–8號枱及院外枱"><div className="table-grid">{['1號枱','2號枱','3號枱','4號枱','5號枱','6號枱','7號枱','8號枱','院外枱'].map((table,index) => <button key={table} className={index===1 || index===5 ? 'table-card active' : 'table-card'}><strong>{table}</strong><span>{index===1 ? '2張單 · $186' : index===5 ? '1張單 · $72' : '空枱'}</span></button>)}</div></Panel>;
    if (view === 'workbench') return <Panel title="工作台" subtitle="網絡訂單、進行中、預約及異常"><div className="work-tabs"><button className="active">網絡訂單 3</button><button>進行中 4</button><button>預約 2</button><button className="danger">異常 1</button></div><div className="list-grid">{workOrders.map(row => <ListCard key={row[1]} title={`${row[0]} · ${row[1]}`} meta={row[2]} value={row[3]} action="查看" tone={row[2]==='異常'?'warn':undefined} />)}</div></Panel>;
    if (view === 'search') return <Panel title="全店快找" subtitle="跨類別快速找商品"><div className="search-row"><input value={searchText} onChange={e=>setSearchText(e.target.value)} placeholder="輸入商品名稱或編號"/><button>搜尋</button></div><div className="result-grid">{products.filter(p => !searchText || `${p.code}${p.name}`.includes(searchText)).map(p => <button key={p.id} className={p.soldOut?'mini-product sold':'mini-product'} onClick={()=>!p.soldOut&&addProduct(p)}><strong>{p.code} {p.name}</strong><span>{p.soldOut?'售罄':`HK$${p.price}`}</span></button>)}</div></Panel>;
    if (view === 'note') return <Panel title="整單備註" subtitle="會同步到工作台、後廚單及訂單詳情"><div className="note-panel"><textarea value={orderNote} onChange={e=>setOrderNote(e.target.value)} placeholder="輸入整張訂單備註"/><div className="quick-notes">{['全部醬汁另上','客人趕時間','分開包裝','到店致電'].map(n => <button key={n} onClick={()=>setOrderNote(v=>v?`${v} · ${n}`:n)}>{n}</button>)}</div><button className="primary">完成</button></div></Panel>;
    if (view === 'soldout') return <Panel title="售罄管理" subtitle="暫停售罄保留可見，永久停用不在點單頁顯示"><div className="list-grid">{products.map(p => <ListCard key={p.id} title={`${p.code} ${p.name}`} meta={p.category} action={p.soldOut?'恢復':'售罄'} tone={p.soldOut?'warn':undefined} />)}</div></Panel>;
    if (view === 'reprint') return <Panel title="重印" subtitle="按訂單查找收據、廚房單或標籤"><div className="list-grid">{printOrders.map(row => <ListCard key={row[0]} title={row[0]} meta={row[1]} action="重印" />)}</div></Panel>;
    if (view === 'more') return <Panel title="更多／設定" subtitle="後台可排序所有快捷入口及設定顯示密度"><div className="settings-grid">{['快捷入口排序','分類每行數量','商品卡每行數量','合併／獨立列','打印數量模式','飯底預設次序','裝置狀態','登入／權限'].map(item => <button key={item}>{item}<span>›</span></button>)}</div></Panel>;
    return null;
  };

  return <div className="smt-shell">
    <header className="smt-topbar">
      <div className="brand"><strong>磨飯</strong><span>MORE<br/>FUN</span><b>SMT</b><em>單號 #0128</em></div>
      <div className="health-icons">{['Wi‑Fi','雲端','裝置','API','打印','同步'].map((label,index)=><button key={label} className={index===5?'health alert':'health ok'} title={label}><span>{['⌁','☁','◉','API','▣','♧'][index]}</span>{index===5&&<i>2</i>}</button>)}</div>
      <div className="top-actions"><button className="new-order">🔔 新單提醒 <i>5</i></button><button onClick={()=>setView('more')}>更多 ☰</button></div>
    </header>

    <main className="app-stage">
      {view === 'order' ? <div className="order-layout">
        <section className="cart-pane">
          <div className="cart-head"><div><span>🛒</span><strong>購物車</strong></div><button onClick={()=>setCart([])} title="清空購物車">🗑</button></div>
          <div className="cart-scroll">{cart.map(item => <article className="cart-line" key={item.id}>
            <div className="cart-line-head"><strong>{item.product.code} {item.product.name}</strong><b>HK${item.product.price}</b><button onClick={()=>setDetailItem(item)}>⋮</button></div>
            {item.summary&&<p>{item.summary}</p>}{item.note&&<p>備註：{item.note}</p>}
            {item.product.mergeQty!==false&&<div className="qty"><button onClick={()=>updateQty(item.id,-1)}>−</button><span>{item.qty}</span><button onClick={()=>updateQty(item.id,1)}>＋</button></div>}
          </article>)}</div>
          <div className="checkout-strip"><span>共 {totalQty} 件</span><strong>HK${total}</strong><button>收款</button></div>
        </section>
        <section className="product-pane">
          <div className="category-grid">{categories.map(c=><button key={c} className={c===activeCategory?'active':''} onClick={()=>setActiveCategory(c)}>{c}</button>)}</div>
          <div className="product-grid">{visibleProducts.map(p=><article className="product-card" key={p.id}><button className="product-hit" onClick={()=>addProduct(p)}><div className="food-art">{p.code}</div><strong>{p.name}</strong><b>HK${p.price}</b></button><button className="product-more" onClick={()=>setDetailItem({id:`draft-${p.id}`,product:p,qty:1,summary:p.summary})}>⋮</button></article>)}{visibleProducts.length===0&&<div className="empty-state">此分類暫未加入示範商品</div>}</div>
        </section>
      </div> : renderOperationalView()}
    </main>

    <nav className="shortcut-bar"><button className="arrow" onClick={()=>setShortcutPage(Math.max(0,shortcutPage-1))}>‹</button><div className="shortcut-grid">{pageShortcuts.map(s=><button key={s.key} className={`${s.fixed?'fixed ':''}${view===s.key?'active':''}`} onClick={()=>setView(s.key)}>{renderBadge(s.badgeLeft,'left')}{renderBadge(s.badgeRight,'right')}<span>{s.icon}</span><strong>{s.label}</strong></button>)}</div><button className="arrow" onClick={()=>setShortcutPage(shortcuts.length>(shortcutPage+1)*8?shortcutPage+1:0)}>›</button></nav>

    {detailItem&&<div className="overlay"><section className="detail-card"><header><div><small>商品完整詳情</small><h2>{detailItem.product.code} {detailItem.product.name}</h2></div><button onClick={()=>setDetailItem(null)}>×</button></header><div className="detail-columns"><div className="detail-photo">{detailItem.product.code}</div><div className="detail-options"><button>飯團／主食</button><button>小食</button><button>飲品</button><button>調整</button><button>備註</button></div><aside><h3>目前選擇</h3><p>{detailItem.summary || '按需要選擇或調整'}</p><strong>HK${detailItem.product.price * detailItem.qty}</strong><button className="primary" onClick={()=>setDetailItem(null)}>完成</button></aside></div></section></div>}
  </div>;
}

function Panel({title,subtitle,children}:{title:string;subtitle:string;children:React.ReactNode}) {
  return <section className="panel-view"><header><div><small>磨飯 SMT</small><h1>{title}</h1><p>{subtitle}</p></div></header><div className="panel-content">{children}</div></section>;
}
function ListCard({title,meta,value,action,tone}:{title:string;meta:string;value?:string;action:string;tone?:string}) {
  return <article className={`list-card ${tone||''}`}><div><strong>{title}</strong><p>{meta}</p></div>{value&&<b>{value}</b>}<button>{action}</button></article>;
}
